/** Fixture-only end-to-end wiring. No real admission, token usage or provider call. */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { decodeProjectionProfiles, decodeProjectionSnapshot, createProjectionEngine } from './projection_blocks.mjs';

export function runProjectionExample() {
  const profiles=decodeProjectionProfiles(readFileSync(new URL('../assets/projection-profiles.example.yaml',import.meta.url),'utf8'));
  const snapshot=decodeProjectionSnapshot(readFileSync(new URL('../assets/projection-state.example.json',import.meta.url),'utf8'));
  const engine=createProjectionEngine({profiles,
    authorize: request => request.scope==='fixture-scope' && request.task==='fixture-task' &&
      request.step==='fixture-step' && request.checkpoint==='fixture-checkpoint' && request.revision===snapshot.revision,
    countTokens: messages => JSON.stringify(messages).length, // Character-based fixture ceiling only.
  });
  const roles={};
  for (const profile of Object.keys(profiles)) {
    const request={profile,scope:'fixture-scope',task:'fixture-task',step:'fixture-step',
      checkpoint:'fixture-checkpoint',revision:snapshot.revision};
    roles[profile]=engine.assemble(engine.issue(request,snapshot),request);
  }
  return {evidence:'offline-fixture',budgetMeasure:'characters-not-provider-tokens',roles,cache:engine.cacheStats()};
}

if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  process.stdout.write(JSON.stringify(runProjectionExample(),null,2)+'\n');
}
