import { resolve } from "node:path";

import {
  CascadeError,
  ROOT,
  boolFlag,
  flag,
  flags,
  parseArgs,
  readText,
  rel,
  rootPath,
  walkFiles,
} from "./common";

export interface PackSection {
  id: string;
  title?: string;
  anchor?: string;
  summary?: string;
  tags?: string[];
}

export interface PackDocument {
  path: string;
  title?: string;
  summary?: string;
  sections?: PackSection[];
}

export interface Pack {
  pack_id: string;
  entry_id?: string;
  kind?: string;
  summary?: string;
  routing?: {
    use_when?: string[];
    do_not_use_when?: string[];
  };
  documents?: PackDocument[];
}

const PATTERNS_ROOT = rootPath("docs/patterns");

export async function discoverPacks(): Promise<string[]> {
  return (
    await walkFiles(PATTERNS_ROOT, {
      include: (path) => path.endsWith(".pack.yaml"),
    })
  ).sort();
}

export async function loadPack(path: string): Promise<Pack> {
  const value = Bun.YAML.parse(await readText(path)) as Pack;
  if (!value || typeof value !== "object" || !value.pack_id) {
    throw new CascadeError(`invalid pattern pack: ${rel(path)}`);
  }
  return value;
}

async function selectPacks(args: ReturnType<typeof parseArgs>): Promise<string[]> {
  const paths = await discoverPacks();
  const requestedPacks = flags(args, "pack");
  const entries = new Set(flags(args, "entry"));
  if (!requestedPacks.length && !entries.size) return paths;
  const selected: string[] = [];
  for (const path of paths) {
    const pack = await loadPack(path);
    if (
      requestedPacks.some(
        (item) =>
          item === pack.pack_id ||
          resolve(ROOT, item) === path ||
          resolve(PATTERNS_ROOT, item) === path,
      ) ||
      (pack.entry_id && entries.has(pack.entry_id))
    ) {
      selected.push(path);
    }
  }
  if (!selected.length) throw new CascadeError("no pattern packs matched");
  return selected;
}

function textBlob(value: unknown): string {
  if (Array.isArray(value)) return value.map(textBlob).join(" ");
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).map(textBlob).join(" ");
  }
  return String(value ?? "");
}

function sectionMatches(
  pack: Pack,
  document: PackDocument,
  section: PackSection,
  args: ReturnType<typeof parseArgs>,
): boolean {
  const requestedSections = new Set([
    ...flags(args, "section"),
    ...flags(args, "part"),
  ]);
  if (requestedSections.size && !requestedSections.has(section.id)) return false;
  const tags = flags(args, "tag").map((value) => value.toLowerCase());
  const sectionTags = (section.tags ?? []).map((value) => value.toLowerCase());
  if (tags.length && !tags.every((value) => sectionTags.includes(value))) return false;
  const query = flag(args, "query")?.toLowerCase();
  if (
    query &&
    !textBlob({ pack, document, section }).toLowerCase().includes(query)
  ) {
    return false;
  }
  return true;
}

export async function extractSection(path: string, anchor: string): Promise<string> {
  const lines = (await readText(path)).split("\n");
  const start = lines.findIndex((line) => line.trim() === anchor.trim());
  if (start < 0) throw new CascadeError(`${rel(path)} missing anchor: ${anchor}`);
  const heading = /^(#+)\s/.exec(lines[start] ?? "");
  if (!heading) return lines[start] ?? "";
  const level = heading[1]!.length;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const candidate = /^(#+)\s/.exec(lines[index] ?? "");
    if (candidate && candidate[1]!.length <= level) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join("\n").trimEnd();
}

export interface PatternSectionSelection {
  pack_id: string;
  section_ids: string[];
}

export interface CompiledPatternSection {
  pack_id: string;
  section_id: string;
  title: string;
  source_path: string;
  content: string;
}

export async function compilePatternSelections(
  selections: PatternSectionSelection[],
): Promise<CompiledPatternSection[]> {
  const packs = new Map<string, { path: string; pack: Pack }>();
  for (const path of await discoverPacks()) {
    const pack = await loadPack(path);
    if (packs.has(pack.pack_id)) {
      throw new CascadeError(`duplicate pattern pack id: ${pack.pack_id}`);
    }
    packs.set(pack.pack_id, { path, pack });
  }

  const compiled: CompiledPatternSection[] = [];
  const selectedKeys = new Set<string>();
  for (const selection of selections) {
    const resolved = packs.get(selection.pack_id);
    if (!resolved) {
      throw new CascadeError(`unknown pattern pack: ${selection.pack_id}`);
    }
    for (const sectionId of selection.section_ids) {
      const key = `${selection.pack_id}:${sectionId}`;
      if (selectedKeys.has(key)) {
        throw new CascadeError(`duplicate pattern section selection: ${key}`);
      }
      selectedKeys.add(key);
      let match:
        | { document: PackDocument; section: PackSection }
        | undefined;
      for (const document of resolved.pack.documents ?? []) {
        for (const section of document.sections ?? []) {
          if (section.id !== sectionId) continue;
          if (match) {
            throw new CascadeError(`ambiguous pattern section: ${key}`);
          }
          match = { document, section };
        }
      }
      if (!match) throw new CascadeError(`unknown pattern section: ${key}`);
      const source = resolve(ROOT, match.document.path);
      compiled.push({
        pack_id: selection.pack_id,
        section_id: sectionId,
        title: match.section.title ?? sectionId,
        source_path: match.document.path,
        content: match.section.anchor
          ? await extractSection(source, match.section.anchor)
          : (match.section.summary ?? ""),
      });
    }
  }
  return compiled;
}

function renderList(title: string, values: string[] | undefined): string[] {
  if (!values?.length) return [];
  return [`## ${title}`, "", ...values.map((value) => `- ${value}`), ""];
}

async function renderPack(
  path: string,
  args: ReturnType<typeof parseArgs>,
): Promise<string> {
  const pack = await loadPack(path);
  const lines = [
    `# ${pack.pack_id}`,
    "",
    pack.summary ?? "",
    "",
    ...renderList("Use When", pack.routing?.use_when),
    ...renderList("Do Not Use When", pack.routing?.do_not_use_when),
  ];
  if (boolFlag(args, "summary-only")) return `${lines.join("\n").trimEnd()}\n`;
  let matched = 0;
  for (const document of pack.documents ?? []) {
    for (const section of document.sections ?? []) {
      if (!sectionMatches(pack, document, section, args)) continue;
      matched += 1;
      const source = resolve(ROOT, document.path);
      lines.push(
        `## ${section.title ?? section.id}`,
        "",
        `Source: \`${document.path}\``,
        "",
      );
      if (section.anchor) lines.push(await extractSection(source, section.anchor), "");
      else if (section.summary) lines.push(section.summary, "");
    }
  }
  const hasFilters =
    flags(args, "section").length ||
    flags(args, "part").length ||
    flags(args, "tag").length ||
    Boolean(flag(args, "query"));
  if (hasFilters && !matched) {
    throw new CascadeError(`no sections matched in pack ${pack.pack_id}`);
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

export async function main(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  const paths = await selectPacks(args);
  if (boolFlag(args, "list-packs")) {
    console.log("pack_id\tentry_id\tkind\tpath\tsummary");
    for (const path of paths) {
      const pack = await loadPack(path);
      console.log(
        [pack.pack_id, pack.entry_id ?? "", pack.kind ?? "", rel(path), pack.summary ?? ""].join(
          "\t",
        ),
      );
    }
    return 0;
  }
  if (boolFlag(args, "list-sections")) {
    console.log("pack_id\tsection_id\ttitle\tsource");
    for (const path of paths) {
      const pack = await loadPack(path);
      for (const document of pack.documents ?? []) {
        for (const section of document.sections ?? []) {
          console.log(
            [pack.pack_id, section.id, section.title ?? "", document.path].join("\t"),
          );
        }
      }
    }
    return 0;
  }
  const rendered: string[] = [];
  for (const path of paths) rendered.push(await renderPack(path, args));
  process.stdout.write(rendered.join("\n"));
  return 0;
}
