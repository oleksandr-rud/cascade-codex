import {
  appendFile,
  lstat,
  mkdir,
  open,
  readdir,
  readFile,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";

import {
  CascadeError,
  exists,
  readJson,
  sha256File,
  sha256Text,
  stableJson,
  utcNow,
  writeJsonAtomicExclusive,
  writeJsonExclusive,
} from "./common";

export const CAMPAIGN_ARTIFACT_SCHEMA_VERSION = "1.0.0";
export const DEFAULT_EVIDENCE_LIMIT_BYTES = 10 * 1024 * 1024;

const PRINCIPAL_ROLES = {
  operator: "simulation-operator",
  evaluator: "simulation-evaluator",
  aggregator: "campaign-aggregator",
  target: "target-actor",
  simulator: "simulator",
  recovery: "simulation-recovery",
} as const;

const MUTABLE_NAMESPACES = new Set([
  "execution",
  "calibrations",
  "specialized-evaluations",
  "evaluations",
  "refinements",
  "aggregations",
  "recovery",
]);
const MUTATION_LOCK_TIMEOUT_MS = 10_000;
const MUTATION_LOCK_STALE_MS = 60_000;

const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
] as const;

const EVIDENCE_SECRET_PATTERNS = [
  ...SECRET_PATTERNS,
  /\b(?:password|secret|token)\s*[:=]\s*["']?[^\s"']{8,}/i,
] as const;

export type CampaignPrincipalRole =
  (typeof PRINCIPAL_ROLES)[keyof typeof PRINCIPAL_ROLES];

export interface CampaignPrincipal {
  role: CampaignPrincipalRole;
  session_id: string;
  subject: string;
}

export interface CampaignIdentityEnvelope {
  operator: CampaignPrincipal;
  evaluator: CampaignPrincipal;
  aggregator: CampaignPrincipal;
  target: CampaignPrincipal;
  simulator: CampaignPrincipal;
  recovery: CampaignPrincipal;
}

export interface CampaignLease {
  lease_id: string;
  owner_session_id: string;
  acquired_at: string;
  expires_at: string;
  recovery_mode: "FINALIZE_UNKNOWN_OUTCOME";
}

export interface CampaignArtifactAuthority {
  principal: CampaignPrincipal;
  lease_id: string | null;
}

export interface CampaignRunReservation {
  schema_version: typeof CAMPAIGN_ARTIFACT_SCHEMA_VERSION;
  artifact_type: "campaign-run-reservation";
  run_id: string;
  campaign_id: string;
  campaign_digest: string;
  attempt: number;
  parent_run_id: string | null;
  reserved_at: string;
  identities: CampaignIdentityEnvelope;
  lease: CampaignLease;
}

export interface CampaignArtifactFile {
  path: string;
  sha256: string;
  size: number;
}

export interface FrozenCampaignArtifact extends CampaignArtifactFile {
  source_path: string;
  producer: string;
  platform: string;
  frozen_at: string;
  redaction_profile: "source-code-v1" | "no-secrets-v1";
  redaction_status: "CLEAN";
  lineage: {
    run_id: string;
    source_digest: string;
  };
}

export interface CampaignRunFinalization {
  schema_version: typeof CAMPAIGN_ARTIFACT_SCHEMA_VERSION;
  artifact_type: "campaign-run-finalization";
  run_id: string;
  status: "COMPLETED" | "BLOCKED" | "UNKNOWN_OUTCOME";
  finalized_at: string;
  finalized_by: CampaignPrincipal;
  recovery_reason: string | null;
  files: CampaignArtifactFile[];
  manifest_digest: string;
}

export interface CampaignArtifactVerification {
  status: "VALID";
  run_id: string;
  finalization_status: CampaignRunFinalization["status"];
  file_count: number;
  manifest_digest: string;
}

export interface ReserveCampaignRunInput {
  campaign_id: string;
  campaign_digest: string;
  attempt: number;
  parent_run_id?: string | null;
  identities: CampaignIdentityEnvelope;
  lease: CampaignLease;
}

export interface FreezeCampaignFileInput {
  source_path: string;
  namespace: string;
  producer: string;
  platform: string;
  redaction_profile: "source-code-v1" | "no-secrets-v1";
  max_bytes?: number;
}

function requireNonEmpty(name: string, value: string): void {
  if (!value.trim()) throw new CascadeError(`${name} must be non-empty`);
}

function validateIdentities(identities: CampaignIdentityEnvelope): void {
  const sessionIds = new Set<string>();
  for (const [name, expectedRole] of Object.entries(PRINCIPAL_ROLES)) {
    const principal = identities[name as keyof CampaignIdentityEnvelope];
    if (principal.role !== expectedRole) {
      throw new CascadeError(
        `${name} identity must use role ${expectedRole}, got ${principal.role}`,
      );
    }
    requireNonEmpty(`${name}.session_id`, principal.session_id);
    requireNonEmpty(`${name}.subject`, principal.subject);
    if (sessionIds.has(principal.session_id)) {
      throw new CascadeError(
        `campaign role sessions must be pairwise distinct: ${principal.session_id}`,
      );
    }
    sessionIds.add(principal.session_id);
  }
}

function validateLease(lease: CampaignLease): void {
  requireNonEmpty("lease.lease_id", lease.lease_id);
  requireNonEmpty("lease.owner_session_id", lease.owner_session_id);
  const acquired = Date.parse(lease.acquired_at);
  const expires = Date.parse(lease.expires_at);
  if (!Number.isFinite(acquired) || !Number.isFinite(expires)) {
    throw new CascadeError("campaign lease timestamps must be valid ISO dates");
  }
  if (expires <= acquired) {
    throw new CascadeError("campaign lease must expire after it is acquired");
  }
}

function assertSafeRunId(runId: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(runId)) {
    throw new CascadeError(`invalid campaign run id: ${runId}`);
  }
}

function normalizedRelative(root: string, path: string): string {
  return relative(root, path).split(sep).join("/");
}

function scanForSecrets(
  bytes: Uint8Array,
  profile: FreezeCampaignFileInput["redaction_profile"],
  sensitiveValues: readonly string[] = [],
): void {
  const text = new TextDecoder("latin1").decode(bytes);
  const patterns =
    profile === "no-secrets-v1"
      ? EVIDENCE_SECRET_PATTERNS
      : SECRET_PATTERNS;
  if (
    patterns.some((pattern) => pattern.test(text)) ||
    sensitiveValues.some((value) => value.length >= 8 && text.includes(value))
  ) {
    throw new CascadeError(
      `artifact blocked by redaction profile ${profile}: secret-like material detected`,
    );
  }
}

function isAllowedSystemAlias(path: string): boolean {
  return process.platform === "darwin" && new Set(["/var", "/tmp", "/etc"]).has(path);
}

async function assertNoSymlinkAncestors(
  path: string,
  label: string,
): Promise<void> {
  let current = resolve(path);
  while (current !== dirname(current)) {
    const metadata = await lstat(current).catch(() => null);
    if (
      metadata?.isSymbolicLink() &&
      !isAllowedSystemAlias(current)
    ) {
      throw new CascadeError(`${label} has a symbolic-link ancestor: ${current}`);
    }
    current = dirname(current);
  }
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CascadeError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function assertIdentity(
  value: Record<string, unknown>,
  reservation: CampaignRunReservation,
  label: string,
): void {
  if (
    value.run_id !== reservation.run_id ||
    value.campaign_id !== reservation.campaign_id
  ) {
    throw new CascadeError(`${label} identity does not match the reservation`);
  }
}

function sha256Bytes(bytes: Uint8Array): string {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(bytes);
  return hasher.digest("hex");
}

async function fileRecord(
  root: string,
  path: string,
): Promise<CampaignArtifactFile> {
  const metadata = await stat(path);
  return {
    path: normalizedRelative(root, path),
    sha256: await sha256File(path),
    size: metadata.size,
  };
}

async function artifactFiles(root: string): Promise<string[]> {
  const result: string[] = [];
  const visit = async (directory: string): Promise<void> => {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      const metadata = await lstat(path);
      if (metadata.isSymbolicLink()) {
        throw new CascadeError(
          `campaign artifact tree contains a symbolic link: ${normalizedRelative(root, path)}`,
        );
      }
      if (metadata.isDirectory()) await visit(path);
      else if (metadata.isFile()) result.push(path);
      else {
        throw new CascadeError(
          `campaign artifact tree contains an unsupported entry: ${normalizedRelative(root, path)}`,
        );
      }
    }
  };
  await visit(root);
  return result;
}

export class CampaignArtifactStore {
  readonly runRoot: string;
  private readonly mutationLockPath: string;

  constructor(
    readonly artifactRoot: string,
    readonly runId: string,
    private readonly authority: CampaignArtifactAuthority | null = null,
    private readonly sensitiveValues: readonly string[] = [],
  ) {
    assertSafeRunId(runId);
    this.runRoot = resolve(artifactRoot, runId);
    if (
      this.runRoot === resolve(artifactRoot) ||
      !this.runRoot.startsWith(`${resolve(artifactRoot)}${sep}`)
    ) {
      throw new CascadeError(`campaign run escapes artifact root: ${runId}`);
    }
    this.mutationLockPath = resolve(artifactRoot, `.${runId}.mutation.lock`);
  }

  withAuthority(
    principal: CampaignPrincipal,
    leaseId: string | null = null,
  ): CampaignArtifactStore {
    return new CampaignArtifactStore(this.artifactRoot, this.runId, {
      principal,
      lease_id: leaseId,
    }, this.sensitiveValues);
  }

  withSensitiveValues(values: readonly string[]): CampaignArtifactStore {
    return new CampaignArtifactStore(
      this.artifactRoot,
      this.runId,
      this.authority,
      [...new Set(values.filter(Boolean))],
    );
  }

  private path(relativePath: string): string {
    const path = resolve(this.runRoot, relativePath);
    if (
      path === this.runRoot ||
      !path.startsWith(`${this.runRoot}${sep}`)
    ) {
      throw new CascadeError(`artifact path escapes run root: ${relativePath}`);
    }
    return path;
  }

  private async assertMutable(): Promise<void> {
    if (
      (await exists(this.path("terminal.lock"))) ||
      (await exists(this.path("finalization.json")))
    ) {
      throw new CascadeError(`campaign run ${this.runId} is already finalized`);
    }
  }

  private async withMutationLock<T>(operation: () => Promise<T>): Promise<T> {
    const started = Date.now();
    await assertNoSymlinkAncestors(this.artifactRoot, "artifact root");
    await mkdir(this.artifactRoot, { recursive: true });
    while (true) {
      try {
        await writeFile(
          this.mutationLockPath,
          stableJson({
            run_id: this.runId,
            pid: process.pid,
            acquired_at: utcNow(),
          }),
          { encoding: "utf8", flag: "wx" },
        );
        break;
      } catch (error) {
        if (
          !error ||
          typeof error !== "object" ||
          !("code" in error) ||
          error.code !== "EEXIST"
        ) {
          throw error;
        }
        if (
          (await exists(this.path("terminal.lock"))) ||
          (await exists(this.path("finalization.json")))
        ) {
          throw new CascadeError(`campaign run ${this.runId} is already finalized`);
        }
        const lock = await stat(this.mutationLockPath).catch(() => null);
        if (lock && Date.now() - lock.mtimeMs > MUTATION_LOCK_STALE_MS) {
          await unlink(this.mutationLockPath).catch(() => undefined);
          continue;
        }
        if (Date.now() - started >= MUTATION_LOCK_TIMEOUT_MS) {
          throw new CascadeError(
            `timed out acquiring campaign mutation lock: ${this.runId}`,
          );
        }
        await Bun.sleep(5);
      }
    }
    try {
      await this.assertMutable();
      return await operation();
    } finally {
      await unlink(this.mutationLockPath).catch(() => undefined);
    }
  }

  private async assertOperatorLease(): Promise<CampaignRunReservation> {
    if (!this.authority) {
      throw new CascadeError("campaign artifact mutation requires explicit authority");
    }
    const reservation = await this.readReservation();
    const operator = reservation.identities.operator;
    if (
      this.authority.principal.role !== "simulation-operator" ||
      this.authority.principal.session_id !== operator.session_id ||
      this.authority.principal.subject !== operator.subject ||
      this.authority.lease_id !== reservation.lease.lease_id ||
      reservation.lease.owner_session_id !== operator.session_id
    ) {
      throw new CascadeError(
        "campaign artifact mutation requires the reserved operator lease",
      );
    }
    if (Date.now() >= Date.parse(reservation.lease.expires_at)) {
      throw new CascadeError("campaign operator lease is expired");
    }
    return reservation;
  }

  private async assertSafeAncestors(path: string): Promise<void> {
    let current = dirname(path);
    while (
      current === this.runRoot ||
      current.startsWith(`${this.runRoot}${sep}`)
    ) {
      const metadata = await lstat(current).catch(() => null);
      if (metadata?.isSymbolicLink()) {
        throw new CascadeError(
          `artifact path has a symbolic-link ancestor: ${normalizedRelative(this.runRoot, current)}`,
        );
      }
      if (current === this.runRoot) break;
      current = dirname(current);
    }
  }

  async reserve(
    input: ReserveCampaignRunInput,
  ): Promise<CampaignRunReservation> {
    requireNonEmpty("campaign_id", input.campaign_id);
    requireNonEmpty("campaign_digest", input.campaign_digest);
    if (!Number.isInteger(input.attempt) || input.attempt < 1) {
      throw new CascadeError("campaign attempt must be a positive integer");
    }
    validateIdentities(input.identities);
    validateLease(input.lease);
    if (input.lease.owner_session_id !== input.identities.operator.session_id) {
      throw new CascadeError(
        "campaign lease owner must match the reserved operator session",
      );
    }

    await assertNoSymlinkAncestors(this.artifactRoot, "artifact root");
    await mkdir(this.artifactRoot, { recursive: true });
    try {
      await mkdir(this.runRoot);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "EEXIST"
      ) {
        throw new CascadeError(
          `campaign run already reserved: ${this.runId}; retry with a new run id or recover the existing run`,
        );
      }
      throw error;
    }

    const reservation: CampaignRunReservation = {
      schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
      artifact_type: "campaign-run-reservation",
      run_id: this.runId,
      campaign_id: input.campaign_id,
      campaign_digest: input.campaign_digest,
      attempt: input.attempt,
      parent_run_id: input.parent_run_id ?? null,
      reserved_at: utcNow(),
      identities: input.identities,
      lease: input.lease,
    };
    await writeJsonExclusive(this.path("reservation.json"), reservation);
    return reservation;
  }

  async readReservation(): Promise<CampaignRunReservation> {
    return readJson<CampaignRunReservation>(this.path("reservation.json"));
  }

  async writeStageJson(
    relativePath: string,
    value: unknown,
  ): Promise<void> {
    await this.withMutationLock(async () => {
      await this.assertOperatorLease();
      const normalized = relativePath.replaceAll("\\", "/");
      if (
        normalized.startsWith("/") ||
        normalized
          .split("/")
          .some((part) => !part || part === "." || part === "..")
      ) {
        throw new CascadeError(`invalid artifact stage path: ${relativePath}`);
      }
      const [namespace] = normalized.split("/");
      const topLevelAllowed =
        normalized === "summary.json" || normalized === "source-manifest.json";
      if (!topLevelAllowed && !MUTABLE_NAMESPACES.has(namespace)) {
        throw new CascadeError(
          `artifact stage path is outside a governed namespace: ${relativePath}`,
        );
      }
      const serialized = stableJson(value);
      scanForSecrets(
        Buffer.from(serialized, "utf8"),
        "no-secrets-v1",
        this.sensitiveValues,
      );
      const destination = this.path(normalized);
      await this.assertSafeAncestors(destination);
      await writeJsonExclusive(destination, value);
    });
  }

  async writeStageText(
    relativePath: string,
    value: string,
    options: {
      redaction_profile?: FreezeCampaignFileInput["redaction_profile"];
      max_bytes?: number;
    } = {},
  ): Promise<void> {
    await this.withMutationLock(async () => {
      await this.assertOperatorLease();
      const normalized = relativePath.replaceAll("\\", "/");
      if (
        normalized.startsWith("/") ||
        normalized
          .split("/")
          .some((part) => !part || part === "." || part === "..")
      ) {
        throw new CascadeError(`invalid artifact stage path: ${relativePath}`);
      }
      const [namespace] = normalized.split("/");
      if (!MUTABLE_NAMESPACES.has(namespace)) {
        throw new CascadeError(
          `artifact stage path is outside a governed namespace: ${relativePath}`,
        );
      }
      const bytes = Buffer.from(value, "utf8");
      const limit = options.max_bytes ?? DEFAULT_EVIDENCE_LIMIT_BYTES;
      if (bytes.byteLength > limit) {
        throw new CascadeError(
          `artifact stage text exceeds ${limit} bytes: ${relativePath}`,
        );
      }
      scanForSecrets(
        bytes,
        options.redaction_profile ?? "no-secrets-v1",
        this.sensitiveValues,
      );
      const destination = this.path(normalized);
      await this.assertSafeAncestors(destination);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, bytes, { flag: "wx" });
    });
  }

  async writeStageFile(
    relativePath: string,
    sourcePath: string,
    options: {
      redaction_profile?: FreezeCampaignFileInput["redaction_profile"];
      max_bytes?: number;
    } = {},
  ): Promise<void> {
    await assertNoSymlinkAncestors(sourcePath, "artifact stage source");
    const source = await lstat(sourcePath).catch(() => null);
    if (!source || source.isSymbolicLink() || !source.isFile()) {
      throw new CascadeError(
        `artifact stage source must be a regular non-symlink file: ${sourcePath}`,
      );
    }
    const limit = options.max_bytes ?? DEFAULT_EVIDENCE_LIMIT_BYTES;
    if (source.size > limit) {
      throw new CascadeError(
        `artifact stage source exceeds ${limit} bytes: ${sourcePath}`,
      );
    }
    const handle = await open(sourcePath, constants.O_RDONLY | constants.O_NOFOLLOW);
    let bytes: Buffer;
    try {
      const bounded = Buffer.alloc(limit + 1);
      let offset = 0;
      while (offset < bounded.byteLength) {
        const chunk = await handle.read(
          bounded,
          offset,
          bounded.byteLength - offset,
          offset,
        );
        if (chunk.bytesRead === 0) break;
        offset += chunk.bytesRead;
      }
      if (offset > limit) {
        throw new CascadeError(
          `artifact stage source exceeds ${limit} bytes while being read: ${sourcePath}`,
        );
      }
      bytes = bounded.subarray(0, offset);
    } finally {
      await handle.close();
    }
    scanForSecrets(
      bytes,
      options.redaction_profile ?? "no-secrets-v1",
      this.sensitiveValues,
    );
    await this.writeStageText(relativePath, bytes.toString("utf8"), {
      redaction_profile: options.redaction_profile,
      max_bytes: limit,
    });
  }

  async appendLifecycle(value: unknown): Promise<void> {
    await this.withMutationLock(async () => {
      await this.assertOperatorLease();
      const serialized = stableJson(value);
      scanForSecrets(
        Buffer.from(serialized, "utf8"),
        "no-secrets-v1",
        this.sensitiveValues,
      );
      const lifecyclePath = this.path("lifecycle.jsonl");
      await this.assertSafeAncestors(lifecyclePath);
      await mkdir(dirname(lifecyclePath), { recursive: true });
      await appendFile(lifecyclePath, `${serialized}\n`, {
        encoding: "utf8",
        flag: "a",
      });
    });
  }

  async freezeFile(
    input: FreezeCampaignFileInput,
  ): Promise<FrozenCampaignArtifact> {
    return this.withMutationLock(async () => {
    await this.assertOperatorLease();
    requireNonEmpty("producer", input.producer);
    requireNonEmpty("platform", input.platform);
    const limit = input.max_bytes ?? DEFAULT_EVIDENCE_LIMIT_BYTES;
    if (!Number.isInteger(limit) || limit < 1) {
      throw new CascadeError("artifact byte limit must be a positive integer");
    }

    const sourcePath = resolve(input.source_path);
    await assertNoSymlinkAncestors(sourcePath, "artifact source");
    const before = await lstat(sourcePath).catch(() => null);
    if (!before) {
      throw new CascadeError(`artifact source is missing: ${input.source_path}`);
    }
    if (before.isSymbolicLink() || !before.isFile()) {
      throw new CascadeError(
        `artifact source must be a regular non-symlink file: ${input.source_path}`,
      );
    }
    if (before.size > limit) {
      throw new CascadeError(
        `artifact source exceeds ${limit} bytes: ${input.source_path}`,
      );
    }

    const handle = await open(sourcePath, constants.O_RDONLY | constants.O_NOFOLLOW);
    let bytes: Buffer;
    try {
      const opened = await handle.stat();
      if (
        !opened.isFile() ||
        opened.dev !== before.dev ||
        opened.ino !== before.ino ||
        opened.size !== before.size ||
        opened.mtimeMs !== before.mtimeMs
      ) {
        throw new CascadeError(
          `artifact source changed while being opened: ${input.source_path}`,
        );
      }
      const bounded = Buffer.alloc(limit + 1);
      let offset = 0;
      while (offset < bounded.byteLength) {
        const chunk = await handle.read(
          bounded,
          offset,
          bounded.byteLength - offset,
          offset,
        );
        if (chunk.bytesRead === 0) break;
        offset += chunk.bytesRead;
      }
      if (offset > limit) {
        throw new CascadeError(
          `artifact source exceeds ${limit} bytes while being read: ${input.source_path}`,
        );
      }
      bytes = bounded.subarray(0, offset);
      const after = await handle.stat();
      const current = await lstat(sourcePath);
      if (
        after.dev !== before.dev ||
        after.ino !== before.ino ||
        after.size !== before.size ||
        after.mtimeMs !== before.mtimeMs ||
        current.isSymbolicLink() ||
        current.dev !== before.dev ||
        current.ino !== before.ino
      ) {
        throw new CascadeError(
          `artifact source changed while being frozen: ${input.source_path}`,
        );
      }
    } finally {
      await handle.close();
    }
    scanForSecrets(bytes, input.redaction_profile, this.sensitiveValues);

    const digest = sha256Bytes(bytes);
    const namespace = input.namespace.replaceAll("\\", "/");
    if (
      !namespace ||
      namespace.startsWith("/") ||
      namespace.includes("..") ||
      !MUTABLE_NAMESPACES.has(namespace.split("/")[0] ?? "")
    ) {
      throw new CascadeError(
        `artifact freeze namespace is not governed: ${input.namespace}`,
      );
    }
    const destination = this.path(`${namespace}/${digest}`);
    await this.assertSafeAncestors(destination);
    await mkdir(dirname(destination), { recursive: true });
    try {
      await writeFile(destination, bytes, { flag: "wx" });
    } catch (error) {
      if (
        !error ||
        typeof error !== "object" ||
        !("code" in error) ||
        error.code !== "EEXIST" ||
        (await sha256File(destination)) !== digest
      ) {
        throw error;
      }
    }

    return {
      ...(await fileRecord(this.runRoot, destination)),
      source_path: input.source_path,
      producer: input.producer,
      platform: input.platform,
      frozen_at: utcNow(),
      redaction_profile: input.redaction_profile,
      redaction_status: "CLEAN",
      lineage: {
        run_id: this.runId,
        source_digest: digest,
      },
    };
    });
  }

  private async validateTerminalEvidence(
    status: CampaignRunFinalization["status"],
    reservation: CampaignRunReservation,
    relativeFiles: string[],
  ): Promise<void> {
    const lifecyclePath = this.path("lifecycle.jsonl");
    if (!relativeFiles.includes("lifecycle.jsonl")) {
      throw new CascadeError(`${status} finalization requires lifecycle evidence`);
    }
    const lifecycleLines = (await readFile(lifecyclePath, "utf8"))
      .split(/\r?\n/)
      .filter(Boolean);
    const lifecycle = lifecycleLines.map((line, index) => {
      try {
        return requireRecord(JSON.parse(line), `lifecycle line ${index + 1}`);
      } catch (error) {
        if (error instanceof CascadeError) throw error;
        throw new CascadeError(`lifecycle line ${index + 1} is invalid JSON`);
      }
    });
    if (!lifecycle.length || !lifecycle.some((event) => event.status === "RUNNING")) {
      throw new CascadeError(`${status} finalization requires a RUNNING lifecycle event`);
    }

    if (status === "UNKNOWN_OUTCOME") {
      const recovery = requireRecord(
        await readJson<unknown>(this.path("recovery/recovery-receipt.json")),
        "recovery receipt",
      );
      assertIdentity(recovery, reservation, "recovery receipt");
      if (
        recovery.status !== "UNKNOWN_OUTCOME" ||
        !["VERIFIED", "INCOMPLETE", "UNKNOWN"].includes(
          String(recovery.cleanup_status),
        ) ||
        typeof recovery.reason !== "string" ||
        !recovery.reason.trim() ||
        typeof recovery.recovery_action !== "string" ||
        !recovery.recovery_action.trim()
      ) {
        throw new CascadeError("UNKNOWN_OUTCOME recovery receipt is incomplete");
      }
      if (!lifecycle.some((event) => event.status === "UNKNOWN_OUTCOME")) {
        throw new CascadeError(
          "UNKNOWN_OUTCOME finalization requires a matching lifecycle event",
        );
      }
      return;
    }

    const sourceManifest = requireRecord(
      await readJson<unknown>(this.path("execution/source-manifest.json")),
      "source manifest",
    );
    const execution = requireRecord(
      await readJson<unknown>(this.path("execution/execution-receipt.json")),
      "execution receipt",
    );
    const summary = requireRecord(
      await readJson<unknown>(this.path("summary.json")),
      "campaign summary",
    );
    for (const [value, label] of [
      [sourceManifest, "source manifest"],
      [execution, "execution receipt"],
      [summary, "campaign summary"],
    ] as const) {
      assertIdentity(value, reservation, label);
    }
    const sourceDigest = sha256Text(stableJson(sourceManifest));
    const executionDigest = sha256Text(stableJson(execution));
    if (
      execution.source_manifest_digest !== sourceDigest ||
      summary.execution_receipt_digest !== executionDigest ||
      execution.cleanup_verified !== true
    ) {
      throw new CascadeError(
        `${status} terminal evidence has invalid source, execution, or cleanup linkage`,
      );
    }
    if (status === "BLOCKED") {
      if (
        summary.campaign_status !== "BLOCKED" ||
        !lifecycle.some((event) => event.status === "BLOCKED")
      ) {
        throw new CascadeError("BLOCKED finalization requires matching terminal evidence");
      }
      return;
    }

    const evaluationPaths = relativeFiles.filter(
      (path) => path.startsWith("evaluations/") && path.endsWith("/receipt.json"),
    );
    const aggregationPaths = relativeFiles.filter(
      (path) => path.startsWith("aggregations/") && path.endsWith(".json"),
    );
    if (evaluationPaths.length !== 1 || aggregationPaths.length !== 1) {
      throw new CascadeError(
        "COMPLETED finalization requires exactly one evaluation and aggregation receipt",
      );
    }
    const evaluation = requireRecord(
      await readJson<unknown>(this.path(evaluationPaths[0]!)),
      "evaluation receipt",
    );
    const aggregation = requireRecord(
      await readJson<unknown>(this.path(aggregationPaths[0]!)),
      "aggregation receipt",
    );
    assertIdentity(evaluation, reservation, "evaluation receipt");
    assertIdentity(aggregation, reservation, "aggregation receipt");
    const evaluationDigest = sha256Text(stableJson(evaluation));
    const aggregationDigest = sha256Text(stableJson(aggregation));
    if (
      evaluation.source_manifest_digest !== sourceDigest ||
      evaluation.execution_receipt_digest !== executionDigest ||
      aggregation.execution_receipt_digest !== executionDigest ||
      aggregation.evaluation_receipt_digest !== evaluationDigest ||
      summary.evaluation_receipt_digest !== evaluationDigest ||
      summary.aggregation_receipt_digest !== aggregationDigest ||
      !["PASS", "FAIL"].includes(String(summary.campaign_status)) ||
      !lifecycle.some((event) => event.status === "COMPLETED")
    ) {
      throw new CascadeError(
        "COMPLETED terminal evidence has invalid evaluation or aggregation linkage",
      );
    }
  }

  async finalize(input: {
    status: CampaignRunFinalization["status"];
    finalized_by: CampaignPrincipal;
    recovery_reason?: string | null;
    recovery_cleanup_status?: "VERIFIED" | "INCOMPLETE" | "UNKNOWN";
    recovery_action?: string;
  }): Promise<CampaignRunFinalization> {
    return this.withMutationLock(async () => {
    const reservation = await this.readReservation();
    if (input.status === "UNKNOWN_OUTCOME") {
      const recovery = reservation.identities.recovery;
      if (
        input.finalized_by.role !== "simulation-recovery" ||
        recovery.session_id !== input.finalized_by.session_id ||
        recovery.subject !== input.finalized_by.subject
      ) {
        throw new CascadeError(
          "campaign recovery finalizer must match the reserved recovery identity",
        );
      }
      if (
        this.authority?.principal.role !== "simulation-recovery" ||
        this.authority.principal.session_id !== recovery.session_id ||
        this.authority.principal.subject !== recovery.subject
      ) {
        throw new CascadeError(
          "UNKNOWN_OUTCOME finalization requires explicit recovery authority",
        );
      }
    } else {
      await this.assertOperatorLease();
      if (
        input.finalized_by.role !== reservation.identities.operator.role ||
        input.finalized_by.session_id !==
          reservation.identities.operator.session_id ||
        input.finalized_by.subject !== reservation.identities.operator.subject
      ) {
        throw new CascadeError(
          "completed or blocked campaign finalization requires the reserved operator",
        );
      }
    }
    if (
      input.status === "UNKNOWN_OUTCOME" &&
      (!input.recovery_reason?.trim() ||
        !input.recovery_action?.trim() ||
        !input.recovery_cleanup_status)
    ) {
      throw new CascadeError(
        "UNKNOWN_OUTCOME finalization requires recovery reason, action, and cleanup disposition",
      );
    }

    if (input.status === "UNKNOWN_OUTCOME") {
      const recoveryReceipt = {
        schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
        artifact_type: "campaign-recovery-receipt",
        run_id: this.runId,
        campaign_id: reservation.campaign_id,
        status: "UNKNOWN_OUTCOME",
        reason: input.recovery_reason,
        recovery_action: input.recovery_action,
        cleanup_status: input.recovery_cleanup_status,
        recovery_identity: input.finalized_by,
        created_at: utcNow(),
      };
      const recoveryPath = this.path("recovery/recovery-receipt.json");
      await this.assertSafeAncestors(recoveryPath);
      await writeJsonExclusive(recoveryPath, recoveryReceipt);
      await appendFile(
        this.path("lifecycle.jsonl"),
        `${stableJson({
          status: "UNKNOWN_OUTCOME",
          at: utcNow(),
          recovery_receipt_digest: sha256Text(stableJson(recoveryReceipt)),
          cleanup_status: input.recovery_cleanup_status,
        })}\n`,
        { encoding: "utf8", flag: "a" },
      );
    }

    const beforeLock = await artifactFiles(this.runRoot);
    const relativeBeforeLock = beforeLock.map((path) =>
      normalizedRelative(this.runRoot, path),
    );
    const required = ["reservation.json", "lifecycle.jsonl"];
    if (input.status === "COMPLETED") {
      required.push(
        "lifecycle.jsonl",
        "execution/source-manifest.json",
        "execution/execution-receipt.json",
        "summary.json",
      );
      if (
        !relativeBeforeLock.some(
          (path) => path.startsWith("evaluations/") && path.endsWith("/receipt.json"),
        ) ||
        !relativeBeforeLock.some(
          (path) => path.startsWith("aggregations/") && path.endsWith(".json"),
        )
      ) {
        throw new CascadeError(
          "COMPLETED finalization requires evaluation and aggregation receipts",
        );
      }
    } else if (input.status === "BLOCKED") {
      required.push(
        "lifecycle.jsonl",
        "execution/source-manifest.json",
        "execution/execution-receipt.json",
        "summary.json",
      );
    } else {
      required.push("recovery/recovery-receipt.json");
    }
    const missing = required.filter((path) => !relativeBeforeLock.includes(path));
    if (missing.length) {
      throw new CascadeError(
        `${input.status} finalization is missing required artifacts: ${missing.join(", ")}`,
      );
    }
    await this.validateTerminalEvidence(
      input.status,
      reservation,
      relativeBeforeLock,
    );
    await writeJsonAtomicExclusive(this.path("terminal.lock"), {
      schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
      run_id: this.runId,
      status: input.status,
      locked_at: utcNow(),
      locked_by: input.finalized_by,
    });
    const files = await artifactFiles(this.runRoot);
    const records = await Promise.all(
      files
        .filter((path) => normalizedRelative(this.runRoot, path) !== "finalization.json")
        .map((path) => fileRecord(this.runRoot, path)),
    );
    records.sort((left, right) => left.path.localeCompare(right.path));
    const manifestDigest = sha256Text(stableJson(records));
    const finalization: CampaignRunFinalization = {
      schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
      artifact_type: "campaign-run-finalization",
      run_id: this.runId,
      status: input.status,
      finalized_at: utcNow(),
      finalized_by: input.finalized_by,
      recovery_reason: input.recovery_reason ?? null,
      files: records,
      manifest_digest: manifestDigest,
    };
    await writeJsonAtomicExclusive(
      this.path("finalization.json"),
      finalization,
    );
    return finalization;
    });
  }

  async verify(): Promise<CampaignArtifactVerification> {
    const finalization = await readJson<CampaignRunFinalization>(
      this.path("finalization.json"),
    );
    if (
      finalization.schema_version !== CAMPAIGN_ARTIFACT_SCHEMA_VERSION ||
      finalization.artifact_type !== "campaign-run-finalization" ||
      finalization.run_id !== this.runId
    ) {
      throw new CascadeError(
        `invalid campaign finalization contract for ${this.runId}`,
      );
    }

    const expectedPaths = new Set(finalization.files.map((file) => file.path));
    if (expectedPaths.size !== finalization.files.length) {
      throw new CascadeError(
        `campaign finalization contains duplicate paths: ${this.runId}`,
      );
    }
    const currentFiles = (await artifactFiles(this.runRoot))
      .map((path) => normalizedRelative(this.runRoot, path))
      .filter((path) => path !== "finalization.json")
      .sort();
    const expected = [...expectedPaths].sort();
    if (stableJson(currentFiles) !== stableJson(expected)) {
      throw new CascadeError(
        `campaign artifact file set does not match finalization: ${this.runId}`,
      );
    }

    for (const record of finalization.files) {
      const actual = await fileRecord(this.runRoot, this.path(record.path));
      if (
        actual.sha256 !== record.sha256 ||
        actual.size !== record.size ||
        actual.path !== record.path
      ) {
        throw new CascadeError(
          `campaign artifact digest mismatch: ${this.runId}/${record.path}`,
        );
      }
    }
    const manifestDigest = sha256Text(stableJson(finalization.files));
    if (manifestDigest !== finalization.manifest_digest) {
      throw new CascadeError(
        `campaign finalization manifest digest mismatch: ${this.runId}`,
      );
    }
    return {
      status: "VALID",
      run_id: this.runId,
      finalization_status: finalization.status,
      file_count: finalization.files.length,
      manifest_digest: manifestDigest,
    };
  }
}
