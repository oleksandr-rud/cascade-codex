import type {
  FreezeCampaignFileInput,
  FrozenCampaignArtifact,
} from "./artifact-types";

/**
 * Artifact capabilities required by one task execution.
 *
 * The task application service depends on this port instead of the concrete
 * filesystem-backed CampaignArtifactStore. A local CLI, daemon, or MCP caller
 * can therefore supply the same governed persistence contract.
 */
export interface TaskArtifactRepository {
  readonly runRoot: string;

  writeStageJson(relativePath: string, value: unknown): Promise<void>;

  writeStageText(
    relativePath: string,
    value: string,
    options?: {
      redaction_profile?: FreezeCampaignFileInput["redaction_profile"];
      max_bytes?: number;
    },
  ): Promise<void>;

  freezeFile(input: FreezeCampaignFileInput): Promise<FrozenCampaignArtifact>;
}
