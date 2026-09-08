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

export interface FreezeCampaignFileInput {
  source_path: string;
  namespace: string;
  producer: string;
  platform: string;
  redaction_profile: "source-code-v1" | "no-secrets-v1";
  max_bytes?: number;
}
