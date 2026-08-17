export type AdmissionClauseSource = "USER" | "EXTERNAL_SOURCE";
export type AdmissionClauseRelation = "NEW" | "CONTINUE" | "CANCEL" | "OVERRIDE";
export type AdmissionClauseIntent = "REVIEW" | "VALIDATE" | "CHANGE" | "OPERATE";
export type AdmissionAuthorityTag = "destructive" | "external-write" | "privileged";
export type AdmissionClaimKind = "CURRENT_STATE" | "NON_GOAL" | "BOUNDARY" | "EVIDENCE";
export type AdmissionShellActionClass = "READ_ONLY" | "EXTERNAL_WRITE" | "DESTRUCTIVE";

export interface AdmissionClauseSpan {
  start: number;
  end: number;
  source: AdmissionClauseSource;
}

export interface RetainedAdmissionClause {
  index: number;
  prior_index: number | null;
  prior_link: "SENTENCE" | "COORDINATE" | null;
  start: number;
  end: number;
  text: string;
  source: AdmissionClauseSource;
  quoted_mentioned: boolean;
  operator: "ADVISORY" | "ASSESSMENT" | "EXPLANATION" | null;
  polarity: "POSITIVE" | "NEGATIVE";
  quantifier: "NO" | "NONE" | "NOTHING" | "ZERO" | "ALL" | "EVERY" | "EACH" | null;
  modality: "DIRECT" | "REQUESTED" | "REQUIRED" | "SCHEDULED" | null;
  action_class: "LOCAL_MUTATION" | "OPERATION" | "HARD_ACTION" | null;
  action_polarity: "POSITIVE" | "NEGATIVE" | null;
  mutation_domain: "APPLICATION_SOURCE" | "DOCUMENTATION" | "REPOSITORY" | "GENERIC" | null;
  operation_subject: "VALIDATION" | "SHELL" | "GENERIC" | null;
  referenced_shell_action: AdmissionShellActionClass | null;
  repository_relation: "INSIDE" | "PART_OF" | null;
  discourse_edge: "CANCEL" | "OVERRIDE" | "PRIOR" | "EXTERNAL" | null;
  continuation_action: "CONTINUE" | "RESUME" | null;
  specialized_claim_role: AdmissionClaimKind | null;
}

export interface AdmissionClaimKindPatch {
  segment: string;
  kind: AdmissionClaimKind;
}

export interface AdmissionClausePatches {
  relation?: AdmissionClauseRelation;
  intent?: AdmissionClauseIntent;
  add_authority_tags?: AdmissionAuthorityTag[];
  remove_authority_tags?: AdmissionAuthorityTag[];
  add_policy_tags?: string[];
  claim_kinds?: AdmissionClaimKindPatch[];
  repository_scope?: "REPOSITORY";
  provenance_spans?: AdmissionClauseSpan[];
  non_goal_spans?: Array<{ start: number; end: number }>;
  shell_action_class?: AdmissionShellActionClass;
  conflicts?: string[];
  boundary_present?: boolean;
  boundary_targets?: string[];
  suppress_external_authority_tags?: boolean;
}

interface ShellToken {
  value: string;
  dynamic: boolean;
}

const HARD_ACTION = /\b(?:delete|erase|destroy|wipe|purge|obliterate|eradicate|expunge|discard)\w*\b/i;
const HARD_ACTION_NOUN = /\b(?:destruction|erasure|deletion|obliteration|purge)\b/i;
const HARD_ACTION_START = /^(?:please\s+)?(?:delete|erase|destroy|wipe|purge|obliterate|eradicate|expunge|discard)\w*\b/i;
const META_WORDING = /\b(?:parser|classifier|classification|detection|support|handling|tests?|docs?|documentation|wording|phrase|sentence|terms?)\b/i;
const MUTATION_START = /^(?:please\s+)?(?:add|apply|adjust|alter|revise|rewrite|rework|rebuild|redesign|repair|overhaul|refresh|modernize|revamp|change|edit|modify|update|implement|build|create|document|remove|delete|erase|destroy|wipe|purge|refactor|write)\b/i;
const OPERATION_START = /^(?:please\s+)?(?:run|execute(?:\s+(?:it|that|this))?|perform(?:\s+(?:it|that|that\s+action|the\s+requested\s+action))?|act\s+on\s+(?:it|that|this)|carry(?:\s+(?:it|that))?\s+out|do\s+(?:it|that)|take\s+(?:it|that|the\s+action|requested\s+action))\b/i;
const VALIDATION_SUBJECT = /\b(?:checks?|tests?|validation|validators?|lint|typechecks?)\b/i;
const NO_MUTATION_SUBJECT = /\b(?:repository(?:\s+(?:artifacts?|files?|contents?|changes?|edits?|writes?|modifications?|mutations?))?|repo(?:sitory)?\s+(?:files?|artifacts?|contents?|changes?|edits?|writes?)|files?|contents?|items?|artifacts?|changes?|edits?|writes?|modifications?|mutations?|generation|freezing)\b/i;
const NO_MUTATION_STATE = /\b(?:unmodified|unchanged|untouched|intact|preserved(?:\s+verbatim)?|remain(?:s)?\s+(?:as\s+they\s+are|unmodified|unchanged|untouched|intact)|modified|altered|touched|changed|written|made|generated|frozen)\b/i;

function normalizedSegment(value: string): string {
  return value.trim().replace(/^[\s:;,.!?—–-]+|[\s:;,.!?—–-]+$/gu, "").trim();
}

function isIntraWordApostrophe(text: string, index: number): boolean {
  return /['’]/u.test(text[index] ?? "")
    && /[\p{L}\p{N}]/u.test(text[index - 1] ?? "")
    && /[\p{L}\p{N}]/u.test(text[index + 1] ?? "");
}

function isOpeningQuote(text: string, index: number): boolean {
  const character = text[index] ?? "";
  if (!["'", '"', "`", "“", "‘"].includes(character)) return false;
  if (character === "'" && /[\p{L}\p{N}]/u.test(text[index - 1] ?? "")) return false;
  return true;
}

function hasQuotationDelimiter(text: string): boolean {
  for (let index = 0; index < text.length; index += 1) {
    if (isOpeningQuote(text, index)) return true;
  }
  return false;
}

function clauseRole(text: string): AdmissionClaimKind | null {
  if (/^USER\s+NON_GOAL\b/i.test(text) || /^(?:(?:afterwards|subsequently|then)\s+)?(?:do\s+not|don't|never)\s+(?:execute|perform|carry|act|take)\b/i.test(text)) return "NON_GOAL";
  if (/^(?:the\s+)?(?:most\s+recent|latest|recent|newest)\s+(?:run|receipt|report|log)\b[^.!?]{0,180}\b(?:documents?|chronicles?|lists?|records?)\b[^.!?]{0,120}\b(?:successful|passing|failed|checks?|assertions?)\b/i.test(text)) return "EVIDENCE";
  if (/^(?:currently\b|on\s+(?:the\s+current|this)\s+branch\b|(?:in|from)\s+(?:the\s+)?(?:checked[- ]out\s+source|current\s+checkout|this\s+checkout)\b|(?:this|the\s+current)\s+checkout\b|as\s+checked\s+out\b|as\s+of\s+this\s+(?:morning|afternoon|evening)|at\s+this\s+moment|at\s+present|right\s+now|today\b|according\s+to\s+(?:the\s+)?current\s+(?:source|branch|revision|implementation)|current\s+source\s+indicates\s+that|at\s+the\s+moment,?)\b/i.test(text)) return "CURRENT_STATE";
  if (/^(?:only\s+.+?\s+(?:may|can|must)\s+(?:change|be\s+(?:modified|changed|edited|written))\b|(?:all\s+)?(?:writes?|changes?|edits?|modifications?)\s+(?:(?:are|must\s+be|remain|must\s+remain)\s+(?:confined|restricted|limited|bounded|fenced)\s+(?:to|inside|within|by)|must\s+(?:stay|remain)\s+(?:inside|within))\b|(?:do\s+not|don't|never)\s+(?:edit|touch|change|write|modify)\b.+?\b(?:outside|beyond)\b|keep\s+every\s+other\s+(?:file|path)\s+(?:untouched|unchanged)|admission\s+files\s+(?:put\s+a\s+bound\s+on\s+all\s+writes|fence\s+in\s+every\s+modification|delimit\s+the\s+permitted\s+write\s+area)|scripts\/cascade\s+is\s+where\s+changes\s+must\s+stop|all\s+modifications\s+are\s+bounded\s+to\s+admission\s+files|changes\s+cannot\s+extend\s+beyond\s+scripts\/cascade|every\s+edit\s+is\s+fenced\s+within\s+admission\s+files|no\s+(?:modification|edit)\s+(?:can|may)\s+cross\s+(?:beyond|outside)\s+scripts\/cascade|outside\s+scripts\/cascade\s+modifications\s+are\s+forbidden)\b/i.test(text)) return "BOUNDARY";
  return null;
}

function splitCoordinatedSegment(text: string): Array<{ text: string; offset: number; link: "SENTENCE" | "COORDINATE" | null }> {
  const pieces: Array<{ text: string; offset: number; link: "SENTENCE" | "COORDINATE" | null }> = [];
  let cursor = 0;
  let pendingLink: "SENTENCE" | "COORDINATE" | null = null;
  const boundary = /(?:\s+(?:and\s+(?:then\s+)?|but\s+|then\s+)|(?<=application\s+source),\s+|\s+(?=after\s+(?:validating|validation|testing|checks?|verification)\b)|\s*(?:—|–|:)\s*)(?=(?:(?:then|afterwards?|subsequently)\s*,?\s*)?(?:please\s+)?(?:add|apply|adjust|alter|revise|rewrite|rework|rebuild|redesign|repair|overhaul|refresh|modernize|revamp|change|edit|modify|update|implement|build|create|document|remove|delete|erase|destroy|wipe|purge|refactor|write|continue|resume|do\s+it|run\s+it|execute\s+it|perform\s+it|carry\s+it\s+out|after\s+(?:validating|validation|testing|checks?|verification))\b)/giu;
  let quote: "'" | '"' | "`" | "“" | "‘" | null = null;
  const searchable = [...text].map((character, index, characters) => {
    if (character === "\\") return quote ? " " : character;
    if (quote) {
      if ((character === quote || quote === "“" && character === "”" || quote === "‘" && character === "’") && !isIntraWordApostrophe(text, index)) quote = null;
      return " ";
    }
    if (isOpeningQuote(text, index) && characters[index - 1] !== "\\") { quote = character as typeof quote; return " "; }
    return character;
  }).join("");
  const assessmentFrame = /^(?:first\s+)?(?:assess|analy[sz]e|evaluate|review|audit|examine)\s+whether\b/i.test(text);
  for (const match of searchable.matchAll(boundary)) {
    if (assessmentFrame && /^\s+and\s+(?!then\b)/i.test(match[0]!)) continue;
    const before = normalizedSegment(text.slice(cursor, match.index!));
    if (before) pieces.push({ text: before, offset: text.indexOf(before, cursor), link: pendingLink });
    pendingLink = /[—–:]/u.test(match[0]!) ? "SENTENCE" : "COORDINATE";
    cursor = match.index! + match[0]!.length;
  }
  const tail = normalizedSegment(text.slice(cursor));
  if (tail) pieces.push({ text: tail, offset: text.indexOf(tail, cursor), link: pendingLink });
  return pieces;
}

function splitSentenceSegments(text: string): Array<{ text: string; offset: number }> {
  const pieces: Array<{ text: string; offset: number }> = [];
  let start = 0;
  let quote: "'" | '"' | "`" | "“" | "‘" | null = null;
  const closeQuote = (character: string): boolean => quote === character || quote === "“" && character === "”" || quote === "‘" && character === "’";
  const retain = (end: number) => {
    const raw = text.slice(start, end);
    const value = normalizedSegment(raw);
    if (value) pieces.push({ text: value, offset: start + raw.indexOf(value) });
  };
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (character === "\\") { index += 1; continue; }
    if (quote) {
      if (closeQuote(character) && !isIntraWordApostrophe(text, index)) {
        quote = null;
        if (/[.!?]/u.test(text[index - 1] ?? "") && /^\s+(?:then|afterwards|subsequently)\b/iu.test(text.slice(index + 1))) {
          retain(index + 1);
          start = index + 1;
          while (/\s/u.test(text[start] ?? "")) start += 1;
          index = start - 1;
        }
      }
      continue;
    }
    if (isOpeningQuote(text, index)) { quote = character as typeof quote; continue; }
    const sentenceBoundary = character === ";" || character === "!" || character === "?"
      || character === "." && (index + 1 === text.length || !/[\s=\/]/u.test(text[index - 1] ?? "") && /\s/u.test(text[index + 1] ?? ""));
    if (!sentenceBoundary && character !== "\n") continue;
    retain(index);
    start = index + 1;
    while (/\s/u.test(text[start] ?? "")) start += 1;
    index = start - 1;
  }
  retain(text.length);
  return pieces;
}

export function parseAdmissionClauses(request: string, spans: readonly AdmissionClauseSpan[]): RetainedAdmissionClause[] {
  const pending: Array<{ text: string; start: number; source: AdmissionClauseSource; prior_link: "SENTENCE" | "COORDINATE" | null }> = [];
  for (const span of spans) {
    const piece = request.slice(span.start, span.end);
    const retainSentence = (raw: string, sentenceOffset: number) => {
      const sentence = normalizedSegment(raw);
      if (!sentence || !/[\p{L}\p{N}]/u.test(sentence)) return;
      const normalizedOffset = raw.indexOf(sentence);
      for (const [partIndex, part] of splitCoordinatedSegment(sentence).entries()) {
        if (!/[\p{L}\p{N}]/u.test(part.text)) continue;
        pending.push({
          text: part.text,
          start: span.start + sentenceOffset + normalizedOffset + part.offset,
          source: span.source,
          prior_link: pending.length ? (partIndex ? part.link ?? "COORDINATE" : "SENTENCE") : null,
        });
      }
    };
    for (const sentence of splitSentenceSegments(piece)) retainSentence(sentence.text, sentence.offset);
  }
  return pending.map((clause, index) => retainClause(clause.text, clause.start, clause.source, index, index ? index - 1 : null, clause.prior_link));
}

function retainClause(text: string, start: number, source: AdmissionClauseSource, index: number, priorIndex: number | null, priorLink: "SENTENCE" | "COORDINATE" | null): RetainedAdmissionClause {
  const semanticText = text
    .replace(/^(?:first|then|afterwards?|subsequently)\s*,?\s+/i, "")
    .replace(/^direct\s+user\s+instruction\s*:\s*/i, "");
  const advisory = /\b(?:audit|compliance)\s+(?:purposes?|inspection|examination)\s+only\b|^for\s+(?:audit|compliance)\s+(?:purposes?|inspection|examination)\b|^(?:under\s+no\s+circumstances\s+act\s+on\s+this\s+request|do\s+not\s+carry\s+out\s+this\s+request|never\s+act\s+on\s+this\s+instruction)\b|^(?:review-only|(?:review|audit|inspect|analy[sz]e|assess|evaluate|examine)\b[^.!?;—–:]{0,120}\b(?:copied|pasted|quoted|clipboard|phrase|proposed\s+(?:action|command|request)|message\s+copied))\b/i.test(text);
  const explanation = /^(?:explain|discuss|classify|quote)\b/i.test(text);
  const assessment = /^(?:first\s+)?(?:assess|analy[sz]e|evaluate|review|audit|examine)\b/i.test(text)
    || /^(?:(?:fresh|independent|read[- ]only|architecture|functional|security|code|harness)\s+){1,6}(?:review|audit|assessment|analysis)\b/i.test(text)
    || /^(?:perform|conduct)\s+(?:an?\s+)?(?:read[- ]only\s+)?(?:(?:architecture|security|code)\s+)?(?:review|assessment|audit|analysis)\b/i.test(text);
  const negative = /\b(?:under\s+no\s+circumstances|do\s+not|don't|should\s+not|shouldn't|ought\s+not|must\s+not|need\s+not|never|none|nothing|zero|neither|without|no\s+(?:\w+\s+){0,3}(?:artifacts?|files?|contents?|items?|changes?|edits?|writes?|modifications?|mutations?|generation|freezing))\b/i.test(text)
    || /\b(?:all|every|each)\b[\s\S]*\b(?:files?|contents?|items?|artifacts?)\b[\s\S]*\b(?:unmodified|unchanged|untouched|intact|preserved|remain|stay|kept)\b/i.test(text);
  const hard = (HARD_ACTION.test(text) || HARD_ACTION_NOUN.test(text)) && !META_WORDING.test(text);
  const continuation = /^(?:CONTINUE\s+)?(continue|resume)\b/i.exec(text)?.[1]?.toUpperCase() as "CONTINUE" | "RESUME" | undefined;
  const local = (MUTATION_START.test(semanticText) || Boolean(continuation && /^(?:continue|resume)\s+(?:add|apply|adjust|alter|revise|rewrite|rework|rebuild|redesign|repair|overhaul|refresh|modernize|revamp|change|edit|modify|update|implement|build|create|document|remove|refactor|write)(?:ing)?\b/i.test(text))) && !hard;
  const operation = OPERATION_START.test(semanticText)
    || /^(?:(?:could|would)\s+you\s+(?:please\s+)?)(?:run|execute|perform)\b/i.test(semanticText)
    || /^(?:with|while|provided|on\s+condition|so\s+that)\b[\s\S]*\b(?:run|execute|perform)\s+(?:checks?|tests?|validation|validators?)\b/i.test(semanticText);
  const repository = /\b(?:inside|internal\s+to|housed\s+within|located\s+inside|forming\s+part|making\s+up|contained\s+in|belong(?:ing|s)?\s+to)\s+(?:(?:this|the|our|my|your)\s+)?(?:repository|repo|codebase|project)\b/i.test(text);
  const direct = hard || local || operation || continuation;
  const actionNegative = direct && /^(?:under\s+no\s+circumstances\s+|do\s+not\s+|don't\s+|never\s+)/i.test(semanticText);
  const requested = /^(?:could|would)\s+you\b|^hoping\s+you\s+could\b|\bmay\b/i.test(text);
  const required = /\b(?:obligatory|compulsory|necessary|has\s+to)\b/i.test(text);
  const scheduled = /\b(?:scheduled|designated|marked)\b/i.test(text);
  const claimRole = clauseRole(text);
  const validation = VALIDATION_SUBJECT.test(text);
  const shell = operation && /\b(?:git|gh|env|command|exec|rm|sed|npm|pnpm|yarn|bun|npx)\b/i.test(text);
  const referentialOperation = /^(?:then\s+)?(?:please\s+)?(?:do\s+(?:it|that)|run\s+(?:it|that|this)|execute\s+(?:it|that|this)|perform\s+(?:it|that|that\s+action|the\s+requested\s+action)|carry(?:\s+(?:it|that))?\s+out|act\s+on\s+(?:it|that|this)|take\s+(?:it|that|the\s+action|requested\s+action))\b/i.test(semanticText);
  const quotedShell = /["'`“‘]([^"'`”’]*(?:\benv\b|\bgit\b)[^"'`”’]*)["'`”’]/iu.exec(text)?.[1];
  const inlineShell = /\b((?:env|command|exec|git)\s+[\s\S]+)$/iu.exec(text)?.[1];
  const referencedShellAction = classifyEnvGitAction(quotedShell ?? inlineShell ?? "") ?? null;
  const mentionedShellAction = referencedShellAction ?? (explanation && /\benv\s+-S\b[\s\S]*\bpush\b[\s\S]*\b(?:classification|classified|works?)\b/i.test(text) ? "EXTERNAL_WRITE" : null);
  const mutationDomain = /\b(?:docs?|documentation|changelog(?:\.md)?)\b/i.test(text)
    ? "DOCUMENTATION"
    : /\b(?:application\s+(?:source|code|files?)|source\s+code)\b/i.test(text)
      ? "APPLICATION_SOURCE"
      : /\b(?:repository|repo|codebase|project)\b/i.test(text)
        ? "REPOSITORY"
        : local || negative && /\b(?:edit|modify|change|write|touch)\w*\b/i.test(text)
          ? "GENERIC"
          : null;
  return {
    index,
    prior_index: priorIndex,
    prior_link: priorLink,
    start,
    end: start + text.length,
    text,
    source,
    quoted_mentioned: hasQuotationDelimiter(text),
    operator: advisory ? "ADVISORY" : explanation ? "EXPLANATION" : assessment ? "ASSESSMENT" : null,
    polarity: negative ? "NEGATIVE" : "POSITIVE",
    quantifier: /\bno\b/i.test(text) ? "NO" : /\bnone\b/i.test(text) ? "NONE" : /\bnothing\b/i.test(text) ? "NOTHING" : /\b(?:zero|0)\b/i.test(text) ? "ZERO" : /\ball\b/i.test(text) ? "ALL" : /\bevery\b/i.test(text) ? "EVERY" : /\beach\b/i.test(text) ? "EACH" : null,
    modality: scheduled ? "SCHEDULED" : required ? "REQUIRED" : requested ? "REQUESTED" : direct ? "DIRECT" : null,
    action_class: hard ? "HARD_ACTION" : local ? "LOCAL_MUTATION" : operation ? "OPERATION" : null,
    action_polarity: direct ? (actionNegative ? "NEGATIVE" : "POSITIVE") : null,
    mutation_domain: mutationDomain,
    operation_subject: validation ? "VALIDATION" : shell ? "SHELL" : operation ? "GENERIC" : null,
    referenced_shell_action: mentionedShellAction,
    repository_relation: repository ? (/\b(?:forming\s+part|making\s+up)\b/i.test(text) ? "PART_OF" : "INSIDE") : null,
    discourse_edge: source === "EXTERNAL_SOURCE" ? "EXTERNAL" : negative && /\b(?:perform|execute|carry|act|take)\b/i.test(text) ? "CANCEL" : priorIndex !== null && (continuation || referentialOperation) ? "PRIOR" : null,
    continuation_action: continuation ?? null,
    specialized_claim_role: claimRole,
  };
}

function copiedSourceContinuationSpans(request: string): AdmissionClauseSpan[] | undefined {
  const marker = /^(?:Copied\s+(?:command|request)|Clipboard\s+(?:command|note))\s*(?::|—|–|\s+)\s*/i.exec(request);
  if (!marker) return undefined;
  const externalStart = marker[0].length;
  const sentenceEnd = request.indexOf(".", externalStart);
  if (sentenceEnd < externalStart) return undefined;
  let continuationStart = sentenceEnd + 1;
  while (/\s/u.test(request[continuationStart] ?? "")) continuationStart += 1;
  const continuation = request.slice(continuationStart);
  if (!/^(?:(?:Then|Afterwards|Subsequently)\b|My\s+request\b|Continue\b)/i.test(continuation)) return undefined;
  if (/^(?:Then|Afterwards|Subsequently)\s+["'`“‘]/iu.test(continuation)) return undefined;
  return [
    { start: 0, end: externalStart, source: "USER" },
    { start: externalStart, end: continuationStart, source: "EXTERNAL_SOURCE" },
    { start: continuationStart, end: request.length, source: "USER" },
  ];
}

function isNoMutationConstraint(clause: RetainedAdmissionClause): boolean {
  if (clause.polarity !== "NEGATIVE") return false;
  if (/\b(?:making|make|with)\s+no\s+(?:(?:repository|repo|project|codebase|file)\s+)?(?:changes?|edits?|writes?|modifications?|mutations?)\b/i.test(clause.text)) return true;
  if (/^(?:no|without)\s+(?:edits?|changes?|writes?|modifications?|mutations?|generation|freezing)(?:\s*,\s*(?:edits?|changes?|writes?|modifications?|mutations?|generation|freezing)|\s*,?\s+or\s+(?:edits?|changes?|writes?|modifications?|mutations?|generation|freezing))*\b/i.test(clause.text)) return true;
  if (clause.quantifier === "NO" && NO_MUTATION_SUBJECT.test(clause.text) && NO_MUTATION_STATE.test(clause.text)) return true;
  if (clause.quantifier === "NOTHING" && /^(?:change|modify|edit|write)\b/i.test(clause.text)) return true;
  return /\bwithout\s+(?:changing|editing|modifying|writing|touching)\s+(?:the\s+)?files?\b/i.test(clause.text)
    || NO_MUTATION_SUBJECT.test(clause.text) && NO_MUTATION_STATE.test(clause.text);
}

function canonicalClauseTarget(value: string): string | null {
  const target = value.trim().replace(/^["'`“‘]|["'`”’]$/gu, "").replace(/^\.\//u, "").replace(/\/$/u, "");
  if (!target || target.length > 300 || /[\\\0\r\n]/u.test(target) || target.startsWith("/") || target.startsWith("~") || target.includes("//")) return null;
  if (target.split("/").some((segment) => !segment || segment === "." || segment === "..")) return null;
  if (/^\d+(?:\.\d+)+$/u.test(target)) return null;
  return target;
}

function pathTargets(text: string): string[] {
  const targets: string[] = [];
  const add = (value: string) => {
    const target = canonicalClauseTarget(value);
    if (target) targets.push(target);
  };
  for (const match of text.matchAll(/["'`“‘]([^"'`”’\r\n]+)["'`”’]/gu)) {
    if (match[1]!.includes("/") || /\.[\p{L}\p{N}_.@\[\]-]+$/u.test(match[1]!)) add(match[1]!);
  }
  for (const match of text.matchAll(/(?:^|[\s"'`“‘(])((?:\.{0,2}\/)?[\p{L}\p{N}_.@\[\]-]+(?:\/[\p{L}\p{N}_.@\[\]-]+)+|[\p{L}\p{N}_.@\[\]-]+\.[\p{L}\p{N}_.@\[\]-]+)(?=$|[\s"'`”’),;:.!?])/gu)) add(match[1]!);
  return [...new Set(targets)].sort();
}

function boundaryPathTargets(text: string): string[] {
  const targets = pathTargets(text);
  const exact = [
    /^only\s+(.+?)\s+(?:may|can|must)\s+(?:change|be\s+(?:modified|changed|edited|written))\b/iu,
    /^(?:all\s+)?(?:writes?|changes?|edits?|modifications?)\s+(?:are|must\s+be|remain|must\s+remain)\s+(?:confined|restricted|limited|bounded|fenced)\s+(?:to|inside|within|by)\s+(.+?)$/iu,
    /^(?:all\s+)?(?:writes?|changes?|edits?|modifications?)\s+must\s+(?:stay|remain)\s+(?:inside|within)\s+(.+?)$/iu,
    /^(?:do\s+not|don't|never)\s+(?:edit|touch|change|write|modify)\b.+?\b(?:outside|beyond)\s+(.+?)$/iu,
  ].map((pattern) => pattern.exec(text)?.[1]).find((value): value is string => Boolean(value));
  if (exact) {
    const stripped = exact.replace(/^(?:the\s+)?(?:file|path|directory|folder)\s+/iu, "").trim();
    for (const candidate of stripped.split(/\s*(?:,|\band\b|\bor\b)\s*/iu).filter(Boolean)) {
      const target = canonicalClauseTarget(candidate);
      if (!target || /\s/u.test(target) && !/^["'`“‘]/u.test(candidate)) continue;
      if (/^(?:documentation|docs?|application\s+(?:code|source)|source\s+code|admission\s+code|repository|repo|codebase|project)$/iu.test(target)) continue;
      targets.push(target);
    }
  }
  return [...new Set(targets)].sort();
}

function boundaryAllowsWrite(boundary: RetainedAdmissionClause, write: RetainedAdmissionClause): boolean {
  const allowed = boundaryPathTargets(boundary.text);
  const targets = pathTargets(write.text);
  if (allowed.length) {
    if (!targets.length) return allowed.length === 1
      && /\b(?:update|edit|modify|change|write|touch)\s+(?:that|the)\s+file\b|\b(?:update|edit|modify|change|write|touch)\s+it\b/iu.test(write.text)
      && /(?:^|\/)[^/]+\.[^/]+$/u.test(allowed[0]!);
    return targets.every((target) => allowed.some((candidate) => target === candidate || target.startsWith(`${candidate}/`)));
  }
  if (boundary.mutation_domain === "DOCUMENTATION") return write.mutation_domain === "DOCUMENTATION";
  if (!targets.length) return false;
  return false;
}

function priorClause(clauses: readonly RetainedAdmissionClause[], clause: RetainedAdmissionClause): RetainedAdmissionClause | undefined {
  return clause.prior_index === null ? undefined : clauses.find((candidate) => candidate.index === clause.prior_index);
}

export function deriveAdmissionClausePatches(request: string, spans: readonly AdmissionClauseSpan[]): AdmissionClausePatches {
  const provenanceSpans = copiedSourceContinuationSpans(request);
  const patches: AdmissionClausePatches = {};
  let effectiveSpans = provenanceSpans ?? spans;
  let clauses = parseAdmissionClauses(request, effectiveSpans);
  if (!provenanceSpans && spans.some((span) => span.source === "EXTERNAL_SOURCE")) {
    const directUserSpans: AdmissionClauseSpan[] = [{ start: 0, end: request.length, source: "USER" }];
    const directClauses = parseAdmissionClauses(request, directUserSpans);
    const destructive = directClauses.filter((clause) => clause.action_class === "HARD_ACTION");
    const negatedReview = destructive.length > 0
      && directClauses.some((clause) => clause.operator === "ASSESSMENT")
      && destructive.every((clause) => clause.operator !== null && clause.polarity === "NEGATIVE" || clause.action_polarity === "NEGATIVE");
    const explicitContinuationMarker = /(?:—|–|:)\s*(?:then|afterwards?|subsequently)\s*,?\s*(?:please\s+)?(?:add|apply|adjust|alter|revise|rewrite|rework|rebuild|redesign|repair|overhaul|refresh|modernize|revamp|change|edit|modify|update|implement|build|create|document|remove|delete|erase|destroy|wipe|purge|refactor|write|do\s+it|run\s+it|execute\s+it|perform\s+it|carry\s+it\s+out)\b/iu.test(request);
    const directAssessmentAction = explicitContinuationMarker && directClauses.some((clause) => clause.operator === null
      && clause.action_polarity === "POSITIVE"
      && clause.action_class !== null
      && directClauses.some((assessment) => assessment.operator === "ASSESSMENT" && assessment.index < clause.index));
    if (negatedReview || directAssessmentAction) {
      effectiveSpans = directUserSpans;
      clauses = directClauses;
      patches.provenance_spans = directUserSpans;
    }
  }
  const userClauses = clauses.filter((clause) => clause.source === "USER");

  const claimKinds = userClauses
    .filter((clause) => clause.specialized_claim_role)
    .map((clause) => ({ segment: clause.text, kind: clause.specialized_claim_role! }));
  if (claimKinds.length) patches.claim_kinds = claimKinds;
  const nonGoalSpans = userClauses
    .filter((clause) => clause.specialized_claim_role === "NON_GOAL")
    .map((clause) => ({ start: clause.start, end: clause.end }));
  if (nonGoalSpans.length) patches.non_goal_spans = nonGoalSpans;
  if (provenanceSpans) patches.provenance_spans = provenanceSpans;

  if (userClauses.some((clause) => clause.specialized_claim_role === "CURRENT_STATE")) patches.add_policy_tags = ["current-state"];
  const continuationClauses = userClauses.filter((clause) => clause.continuation_action && clause.discourse_edge === "PRIOR");
  if (continuationClauses.some((clause) => {
    if (!clause.continuation_action || clause.discourse_edge !== "PRIOR") return false;
    const prior = priorClause(clauses, clause);
    return clause.prior_link === "SENTENCE" && prior?.source === "USER" || clause.text.startsWith("CONTINUE ");
  })) patches.relation = "CONTINUE";
  else if (continuationClauses.some((clause) => {
    const prior = priorClause(clauses, clause);
    return clause.prior_link === "COORDINATE" && (prior?.action_class === "HARD_ACTION" || prior?.action_class === "LOCAL_MUTATION");
  })) patches.relation = "NEW";

  const positiveWrites = userClauses.filter((clause) => clause.action_polarity === "POSITIVE" && clause.action_class === "LOCAL_MUTATION");
  const validationOperations = userClauses.filter((clause) => clause.action_polarity === "POSITIVE" && clause.action_class === "OPERATION" && clause.operation_subject === "VALIDATION");
  const noMutationConstraints = userClauses.filter(isNoMutationConstraint);
  const assessments = userClauses.filter((clause) => clause.operator === "ASSESSMENT" || clause.operator === "ADVISORY");
  const directAssessments = assessments.filter((clause) => clause.operator === "ASSESSMENT");
  const advisories = assessments.filter((clause) => clause.operator === "ADVISORY");
  const explanations = userClauses.filter((clause) => clause.operator === "EXPLANATION");
  const hardActions = userClauses.filter((clause) => clause.action_class === "HARD_ACTION");
  const linkedExecutions = userClauses.filter((clause) => clause.discourse_edge === "PRIOR" && clause.action_polarity === "POSITIVE" && clause.action_class === "OPERATION");

  const scopedValidationWrite = positiveWrites.some((write) => userClauses.some((clause) => clause.index < write.index && clause.operation_subject === "VALIDATION" && /\bwithout\b/i.test(clause.text) && isNoMutationConstraint(clause)));
  const disjointScopedWrite = positiveWrites.some((write) => userClauses.some((clause) => clause.index !== write.index
    && clause.polarity === "NEGATIVE"
    && clause.mutation_domain === "APPLICATION_SOURCE"
    && write.mutation_domain === "DOCUMENTATION"));
  const assessedLocalWrite = positiveWrites.some((write) => directAssessments.some((assessment) => assessment.index < write.index));
  if (scopedValidationWrite || disjointScopedWrite || assessedLocalWrite) {
    patches.intent = "CHANGE";
  }
  else if (validationOperations.length && noMutationConstraints.length) {
    patches.intent = "VALIDATE";
    patches.remove_authority_tags = ["destructive", "external-write", "privileged"];
  } else if (assessments.some((assessment) => !userClauses.some((clause) => clause.index > assessment.index && clause.operator === null && clause.action_polarity === "POSITIVE" && clause.action_class !== null))) {
    patches.intent = "REVIEW";
  }
  if (!positiveWrites.length && userClauses.some((clause) => {
    if (!clause.continuation_action || !/\b(?:validation|tests?|checks?|verification|validating|testing|checking|verifying)\b/i.test(clause.text)) return false;
    if (clause.text.startsWith("CONTINUE ")) return true;
    const prior = priorClause(clauses, clause);
    return clause.discourse_edge === "PRIOR" && prior?.action_polarity !== "NEGATIVE";
  })) patches.intent = "VALIDATE";

  const metaOnlyHardAction = hardActions.length > 0
    && hardActions.every((clause) => clause.operator !== null)
    && linkedExecutions.every((clause) => priorClause(clauses, clause)?.action_class !== "HARD_ACTION")
    && [...assessments, ...explanations].some((clause) => clause.quoted_mentioned || clause.action_class === "HARD_ACTION" || clause.referenced_shell_action !== null);
  const metaOnlyReferencedShell = [...assessments, ...explanations].some((clause) => clause.referenced_shell_action !== null)
    && linkedExecutions.length === 0;
  const negatedDestructiveReview = hardActions.length > 0
    && hardActions.every((clause) => clause.polarity === "NEGATIVE" || clause.action_polarity === "NEGATIVE")
    && assessments.length > 0;
  const explicitlyNegatedDestructiveReview = assessments.length > 0
    && linkedExecutions.length === 0
    && (assessments.some((clause) => clause.action_class === "HARD_ACTION" && /\b(?:should(?:\s+not|n't)|ought\s+not|must\s+not|need\s+not|never)\b/i.test(clause.text))
      || hardActions.some((clause) => clause.action_polarity === "NEGATIVE" && assessments.some((assessment) => assessment.index > clause.index)));
  const advisoryHardAction = hardActions.length > 0
    && linkedExecutions.length === 0
    && hardActions.every((clause) => advisories.some((advisoryClause) => advisoryClause.index < clause.index));
  if (advisoryHardAction) patches.intent = "REVIEW";
  if (metaOnlyHardAction || metaOnlyReferencedShell || negatedDestructiveReview || explicitlyNegatedDestructiveReview || advisoryHardAction || noMutationConstraints.length && !positiveWrites.length) patches.remove_authority_tags = ["destructive", "external-write", "privileged"];
  if (explicitlyNegatedDestructiveReview || negatedDestructiveReview) patches.suppress_external_authority_tags = true;

  const executablePriorHardActions = linkedExecutions
    .map((clause) => priorClause(clauses, clause))
    .filter((clause): clause is RetainedAdmissionClause => clause?.action_class === "HARD_ACTION");
  const passiveHardActions = hardActions.filter((clause) => clause.operator === null
    && clause.operation_subject === null
    && clause.action_polarity === "POSITIVE"
    && !isNoMutationConstraint(clause)
    && ["REQUESTED", "REQUIRED", "SCHEDULED"].includes(clause.modality ?? ""));
  const directHardActionsAfterAssessment = hardActions.filter((clause) => clause.operator === null
    && clause.operation_subject === null
    && clause.action_polarity === "POSITIVE"
    && !isNoMutationConstraint(clause)
    && HARD_ACTION_START.test(clause.text.replace(/^(?:then|afterwards?|subsequently)\s*,?\s+/i, ""))
    && directAssessments.some((assessment) => assessment.index < clause.index));
  if (executablePriorHardActions.length) {
    patches.intent = "OPERATE";
    patches.add_authority_tags = ["destructive"];
  } else if (passiveHardActions.length || directHardActionsAfterAssessment.length) {
    patches.intent = "CHANGE";
    patches.add_authority_tags = ["destructive"];
  }
  const executablePriorLocalActions = linkedExecutions
    .map((clause) => priorClause(clauses, clause))
    .filter((clause): clause is RetainedAdmissionClause => clause?.action_class === "LOCAL_MUTATION");
  if (executablePriorLocalActions.length) patches.intent = "OPERATE";
  const executablePriorShellActions = linkedExecutions
    .map((clause) => priorClause(clauses, clause)?.referenced_shell_action)
    .filter((action): action is AdmissionShellActionClass => action !== null && action !== undefined);
  if (executablePriorShellActions.length) {
    patches.intent = "OPERATE";
    if (executablePriorShellActions.includes("DESTRUCTIVE")) patches.add_authority_tags = ["destructive"];
    else if (executablePriorShellActions.includes("EXTERNAL_WRITE")) patches.add_authority_tags = ["external-write"];
    else patches.shell_action_class = "READ_ONLY";
  }

  const boundaries = userClauses.filter((clause) => clause.specialized_claim_role === "BOUNDARY");
  if (boundaries.length) {
    patches.boundary_present = true;
    const boundaryTargets = [...new Set(boundaries.flatMap((boundary) => boundaryPathTargets(boundary.text)))].sort();
    if (boundaryTargets.length) patches.boundary_targets = boundaryTargets;
  }
  const scopeConflicts = boundaries.flatMap((boundary) => positiveWrites
    .filter((write) => write.index !== boundary.index && !boundaryAllowsWrite(boundary, write))
    .map((write) => `SCOPE_CONFLICT:${boundary.index}:${write.index}`));
  if (scopeConflicts.length) patches.conflicts = [...new Set(scopeConflicts)].sort();

  const scopedRepositoryMutation = positiveWrites.some((clause) => clause.repository_relation !== null && ["ALL", "EVERY", "EACH"].includes(clause.quantifier ?? ""));
  if (scopedRepositoryMutation) patches.repository_scope = "REPOSITORY";

  for (const clause of userClauses) {
    if (clause.action_polarity !== "POSITIVE" || clause.operator !== null || clause.action_class !== "OPERATION" || clause.operation_subject !== "SHELL") continue;
    const shell = /^(?:run|execute|perform)\s+([\s\S]+)$/i.exec(clause.text)?.[1];
    const shellAction = shell ? classifyEnvGitAction(shell) : undefined;
    if (shellAction) patches.shell_action_class = shellAction;
  }
  if (!userClauses.length && clauses.length === 1) {
    const clause = clauses[0]!;
    if (clause.source === "EXTERNAL_SOURCE" && clause.action_polarity === "POSITIVE" && clause.operator === null && clause.action_class === "OPERATION" && clause.operation_subject === "SHELL") {
      const shell = /^(?:run|execute|perform)\s+([\s\S]+)$/i.exec(clause.text)?.[1];
      const shellAction = shell ? classifyEnvGitAction(shell) : undefined;
      if (shellAction) patches.shell_action_class = shellAction;
    }
  }
  return patches;
}

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
