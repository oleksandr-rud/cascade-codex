export type AdmissionShellActionClass = "READ_ONLY" | "EXTERNAL_WRITE" | "DESTRUCTIVE";
interface ShellToken { value: string; dynamic: boolean }

// Exact shell invocation parsing; never receives user prose for semantic interpretation.
function lexShell(text: string): ShellToken[] | null {
  const tokens: ShellToken[] = [];
  let value = "";
  let dynamic = false;
  let quote: "'" | '"' | null = null;
  const flush = () => {
    if (!value.length) return;
    tokens.push({ value, dynamic });
    value = "";
    dynamic = false;
  };
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (quote) {
      if (character === quote) { quote = null; continue; }
      if (character === "\\" && quote === '"' && index + 1 < text.length) {
        const next = text[++index]!;
        value += next === "_" ? "\\_" : next;
        continue;
      }
      if (quote === '"' && (character === "$" || character === "`")) dynamic = true;
      value += character;
      continue;
    }
    if (character === "'" || character === '"') { quote = character; continue; }
    if (character === "\\" && index + 1 < text.length) {
      const next = text[++index]!;
      value += next === "_" ? "\\_" : next;
      continue;
    }
    if (/\s/u.test(character)) { flush(); continue; }
    if (character === "$" || character === "`" || /[?*\[\]{}]/u.test(character)) dynamic = true;
    value += character;
  }
  if (quote) return null;
  flush();
  return tokens;
}

function splitEnvString(value: string): ShellToken[] | null {
  return lexShell(value.replace(/\\_/g, " "));
}

function executable(token: string | undefined): string {
  return (token ?? "").replace(/\\/g, "/").split("/").at(-1)?.toLowerCase() ?? "";
}

export function classifyEnvGitAction(text: string): AdmissionShellActionClass | undefined {
  if (!text.trim() || text.length > 4096 || /[;&|\n]|[<>]\(|(?:^|\s)\d*>\s*(?!&)/u.test(text)) return undefined;
  const words = lexShell(text);
  if (!words?.length || words.length > 128) return undefined;
  if (words.some((word) => word.dynamic) && /(?:^|\s)(?:env\s+)?(?:-S|--split-string(?:=|\s))/u.test(text)) return "DESTRUCTIVE";
  if (words.some((word) => word.dynamic)) return undefined;
  const tokens = words.map((word) => word.value);
  let index = 0;
  let environmentSensitive = false;
  let wrapperSensitive = false;
  let expansions = 0;
  const consumeAssignments = () => {
    while (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[index] ?? "")) {
      const name = tokens[index]!.slice(0, tokens[index]!.indexOf("=")).toUpperCase();
      if (/^(?:GIT(?:_|$)|SSH(?:_|$)|GCM_|GH_|HOME$|PATH$|XDG_|LD_|DYLD_|PAGER$|EDITOR$|VISUAL$)/.test(name)) environmentSensitive = true;
      index += 1;
    }
  };
  consumeAssignments();
  wrapperLoop: while (index < tokens.length) {
    if (++expansions > 16) return "DESTRUCTIVE";
    const wrapper = executable(tokens[index]);
    if (wrapper === "command" || wrapper === "exec") {
      index += 1;
      while (tokens[index]?.startsWith("-")) {
        if (tokens[index] === "--") { index += 1; break; }
        wrapperSensitive = true;
        index += 1;
      }
      consumeAssignments();
      continue;
    }
    if (wrapper !== "env") break;
    index += 1;
    while (index < tokens.length) {
      const token = tokens[index]!;
      if (token === "--") { index += 1; break; }
      if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(token)) { consumeAssignments(); continue; }
      if (token === "-i" || token === "--ignore-environment") { environmentSensitive = true; index += 1; continue; }
      if (token === "-v" || token === "--debug") { index += 1; continue; }
      if (token === "-u" || token === "--unset") { environmentSensitive = true; if (tokens[++index] === undefined) return "DESTRUCTIVE"; index += 1; continue; }
      if (token.startsWith("--unset=") || /^-u\S+/.test(token)) { environmentSensitive = true; index += 1; continue; }
      if (["-C", "--chdir", "-P", "--path"].includes(token)) { wrapperSensitive = true; if (tokens[++index] === undefined) return "DESTRUCTIVE"; index += 1; continue; }
      if (/^--(?:chdir|path)=/.test(token) || /^-[CP]\S+/.test(token)) { wrapperSensitive = true; index += 1; continue; }
      let value: string | undefined;
      let remove = 1;
      if (token === "-S" || token === "--split-string") { value = tokens[index + 1]; remove = 2; }
      else if (token.startsWith("--split-string=")) value = token.slice("--split-string=".length);
      else if (/^-S\S+/.test(token)) value = token.slice(2);
      else if (/^-[A-Za-z0-9]+$/.test(token)) {
        const cluster = token.slice(1);
        if (cluster.includes("i")) environmentSensitive = true;
        const splitIndex = cluster.indexOf("S");
        if (splitIndex >= 0) {
          value = cluster.slice(splitIndex + 1) || tokens[index + 1];
          remove = cluster.slice(splitIndex + 1) ? 1 : 2;
        } else {
          if ([...cluster].some((option) => !["i", "v"].includes(option))) wrapperSensitive = true;
          index += 1;
          continue;
        }
      } else if (token.startsWith("-")) { wrapperSensitive = true; index += 1; continue; }
      else break;
      if (!value || /[$`]/u.test(value)) return "DESTRUCTIVE";
      const expanded = splitEnvString(value);
      if (!expanded?.length || expanded.some((word) => word.dynamic)) return "DESTRUCTIVE";
      tokens.splice(index, remove, ...expanded.map((word) => word.value));
      continue wrapperLoop;
    }
    consumeAssignments();
  }
  consumeAssignments();
  if (executable(tokens[index]) !== "git" && wrapperSensitive) {
    const gitIndex = tokens.findIndex((token, tokenIndex) => tokenIndex > index && executable(token) === "git");
    if (gitIndex >= 0) index = gitIndex;
  }
  if (executable(tokens[index]) !== "git") return undefined;
  const args = tokens.slice(index + 1);
  const actionIndex = args.findIndex((token) => ["push", "status", "diff"].includes(token.toLowerCase()));
  if (actionIndex < 0) return undefined;
  const action = args[actionIndex]!.toLowerCase();
  if (action === "status" || action === "diff") {
    const globalArgs = args.slice(0, actionIndex);
    for (let optionIndex = 0; optionIndex < globalArgs.length; optionIndex += 1) {
      const option = globalArgs[optionIndex]!;
      if (["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--config-env", "--exec-path", "--super-prefix"].includes(option)) {
        if (globalArgs[++optionIndex] === undefined) return undefined;
        continue;
      }
      if (/^--(?:git-dir|work-tree|namespace|config-env|exec-path|super-prefix)=\S+$/u.test(option)) continue;
      if (["--no-pager", "--paginate", "-P", "-p", "--literal-pathspecs", "--no-literal-pathspecs", "--glob-pathspecs", "--noglob-pathspecs", "--icase-pathspecs", "--no-replace-objects", "--no-optional-locks", "--bare"].includes(option)) continue;
      return undefined;
    }
    const actionArgs = args.slice(actionIndex + 1).map((token) => token.toLowerCase());
    if (actionArgs.some((token) => /^(?:--output(?:=|$)|--ext-diff$|--textconv$|--open-files-in-pager(?:=|$))/.test(token))) return undefined;
    return "READ_ONLY";
  }
  if (environmentSensitive || wrapperSensitive || args.slice(0, actionIndex).length) return "DESTRUCTIVE";
  const pushArgs = args.slice(actionIndex + 1).map((token) => token.toLowerCase());
  const destructive = pushArgs.some((token) =>
    /^--(?:de(?:l(?:e(?:t(?:e)?)?)?)?|f(?:o(?:r(?:c(?:e(?:-with-lease|-if-includes)?)?)?)?)?|mi(?:r(?:r(?:o(?:r)?)?)?)?|pr(?:u(?:n(?:e)?)?)?)(?:=|$)/.test(token)
    || /^-[a-z0-9]*f[a-z0-9]*$/i.test(token)
    || /^\+\S+/.test(token)
    || /^:\S+/.test(token)
    || /^[^:]+:[.,;!?]*$/.test(token));
  return destructive ? "DESTRUCTIVE" : "EXTERNAL_WRITE";
}

export const classifyEnvGitPushAction = classifyEnvGitAction;
