import { describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { compileTaskEnvelope, semanticAdmissionRequest } from "./admission";
import { rootPath, sha256Text, stableJson } from "./common";
import { buildPluginCapabilityCatalog, capabilitySelectionDigest, validateCapabilitySelection, validateCatalogDigest } from "./plugin-workflow";
import { createCapabilityIntake, acceptCapabilitySelection } from "./workflow-composition";

// Independently authored expectations, not model inference, semantic qualification,
// domain artifact validation, or a lexical router. No request text selects a route.
const cases = [
  {id:"spacing",request:"Adjust this accepted button's spacing and check the rendered result.",route:"cascade-design:visual-qa",inputs:["visual-evidence"],topic:"visual-style",depth:"LIGHTWEIGHT"},
  {id:"theme",request:"Revise the shared theme and semantic typography tokens under this accepted platform decision.",route:"cascade-design:design-system",inputs:["design-evidence"],topic:"visual-style",depth:"FOCUSED"},
  {id:"component",request:"Define reusable pending, failed and disabled variants without claiming completion.",route:"cascade-design:design-system",inputs:["design-evidence"],topic:"component-states",depth:"FOCUSED"},
  {id:"parameters",request:"Review the per-parameter value/control/save bindings; the generic records editor loses units and individual values.",route:"cascade-design:ux-flow-review",inputs:["product-contract"],topic:"form-parameters",depth:"FOCUSED"},
  {id:"form-errors",request:"Check label, error, preserved input and focus behavior in this parameter form.",route:"cascade-design:accessibility-review",inputs:["design-evidence"],topic:"form-parameters",depth:"FOCUSED"},
  {id:"search",request:"Review async search and selection with no-results, retained query and clear selection state.",route:"cascade-design:ux-flow-review",inputs:["design-evidence"],topic:"search-selection",depth:"FOCUSED"},
  {id:"picker",request:"Check the supplied combobox keyboard, name, selection and focus behavior.",route:"cascade-design:accessibility-review",inputs:["design-evidence"],topic:"search-selection",depth:"FOCUSED"},
  {id:"right-panel",request:"The right inspector takes too much workspace; compare co-present detail, a drawer and a modal for this task.",route:"cascade-design:ux-flow-review",inputs:["design-evidence"],topic:"navigation-layout",depth:"FOCUSED"},
  {id:"modal",request:"Create the accepted dialog alternative with unsaved state, dismissal and focus behavior.",route:"cascade-design:create-design",inputs:["design-brief"],topic:"navigation-layout",depth:"FOCUSED"},
  {id:"ia",request:"Review the accepted new object/task hierarchy and cross-workflow navigation before concrete mockups.",route:"cascade-design:ux-flow-review",inputs:["product-contract"],topic:"information-architecture",depth:"STRUCTURAL"},
  {id:"narrow",request:"Check the affected narrow-width layout against the accepted reference, including long labels.",route:"cascade-design:visual-qa",inputs:["visual-evidence"],topic:"responsive-input",depth:"LIGHTWEIGHT"},
  {id:"focus",request:"Check the changed focus path and reduced-motion behavior using supplied markup and observations.",route:"cascade-design:accessibility-review",inputs:["design-evidence"],topic:"responsive-input",depth:"FOCUSED"},
  {id:"chart",request:"Review this chart's units, scale, missing data and comparable accessible view for the actor's decision.",route:"cascade-design:ux-flow-review",inputs:["design-evidence"],topic:"data-visualization",depth:"FOCUSED"},
  {id:"canvas",request:"Create the accepted graph workspace prototype with selection, zoom, undo and keyboard alternatives.",route:"cascade-design:create-design",inputs:["design-brief"],topic:"canvas-workspace",depth:"STRUCTURAL"},
  {id:"mobile",request:"Review the real mobile task, interruption, offline recovery and platform constraints.",route:"cascade-design:ux-flow-review",inputs:["product-contract"],topic:"domain-interface",depth:"FOCUSED"},
  {id:"operations",request:"Review this dense operational app workflow and meaningful domain actions rather than substituting generic CRUD.",route:"cascade-design:ux-flow-review",inputs:["product-contract"],topic:"domain-interface",depth:"STRUCTURAL"},
  {id:"ui-refactor",request:"Refactor the UI component while preserving visible behavior; check its changed keyboard/focus path.",route:"cascade-design:accessibility-review",inputs:["design-evidence"],topic:"responsive-input",depth:"FOCUSED"},
  {id:"approved-implementation",request:"Implement the already approved mockup and verify the affected rendered view; no new design proposal is needed.",route:"cascade-design:visual-qa",inputs:["visual-evidence"],topic:"visual-style",depth:"LIGHTWEIGHT"},
  {id:"backend",request:"Review a headless retry implementation with settled interfaces and no UI impact.",route:"cascade-engineering:review-change",inputs:["change-contract","change-diff"],topic:null,depth:"NONE"},
  {id:"proven-no-impact",request:"Review a frontend internal variable rename with supplied proof that rendering, interaction and UI contracts are unchanged.",route:"cascade-engineering:review-change",inputs:["change-contract","change-diff"],topic:null,depth:"NONE"},
  {id:"research-only",request:"Collect this bounded market evidence without product or UI design work.",route:"cascade-discovery:research-market",inputs:["market-research-brief","external-sources"],topic:null,depth:"NONE"},
  {id:"harness-audit",request:"Review this host routing implementation; no target UI is changing.",route:"cascade-engineering:review-change",inputs:["change-contract","change-diff"],topic:null,depth:"NONE"},
];
const catalog = await buildPluginCapabilityCatalog();
const design = catalog.plugins.find(plugin => plugin.name === "cascade-design")!;
async function envelope(request: string, extra = false) {
  const claims = [{kind:"OUTCOME",statement:request,confidence:0.99,policy_tags:["review"]}];
  if (extra) claims.push({kind:"OUTCOME",statement:"Review the second supplied UI outcome separately.",confidence:0.99,policy_tags:["review"]});
  return compileTaskEnvelope({request,task_id:"design-activation-structural",semantic_interpretation:{
    schema_version:1,artifact_type:"cascade-admission-interpretation",status:"RESOLVED",
    request_digest:semanticAdmissionRequest(request).request_digest,prior_envelope_id:null,
    model_id:"authored-plugin-activation-fixture-NOT_MODEL_INFERENCE",relation:"NEW",intent:"REVIEW",
    policy_tags:["review"],workload:{topology:"ATOMIC",effort:"SMALL",authority:"READ_ONLY",duration:"TURN"},
    local_write_scope:{mode:"TARGETS",targets:[]},claims,uncertainty:[],
  }});
}
function selection(env: any, row = cases[0]) {
  const plugin = catalog.plugins.find(plugin => plugin.skills.some((skill:any) => skill.route === row.route))!;
  const skill = plugin.skills.find((skill:any) => skill.route === row.route)!;
  const active = row.topic !== null;
  return {
    schema_version:1,artifact_type:"cascade-capability-selection",status:"CANDIDATE",
    task_envelope_id:env.envelope_id,request_digest:env.request_digest,capability_catalog_digest:catalog.catalog_digest,
    selection_digest:"0".repeat(64),selector:{route:"cascade-workflows:select-capabilities",model:"gpt-6-astra",reasoning_effort:"high",prompt_sha256:"0".repeat(64)},
    input_artifacts:["task-envelope","plugin-capability-catalog",...row.inputs],
    selected_candidates:[{route:skill.route,plugin_version:plugin.version,claim_ids:[env.claims[0].claim_id],
      trigger_evidence:[row.request],anti_trigger_disposition:"Authored expected work product fits this method, not execution by the design plugin.",
      required_dependencies:skill.required_dependencies,effect:skill.effect,authority:skill.authority,reason:"Consume only supplied actual input bindings in this structural fixture."}],
    plugin_activation:[{plugin_name:design.name,plugin_version:design.version,claim_ids:[env.claims[0].claim_id],
      disposition:active?"ACTIVE":"NOT_APPLICABLE",depth:row.depth,topics:active?[row.topic]:[],
      trigger_evidence:[row.request],anti_trigger_disposition:active?"The UI work product needs a proportional Design contribution.":"The authored scope and evidence establish no UI work product/impact.",
      reason:"This declared expectation exercises host validation and does not claim actual model selection."}],
    rejected_candidates:[],ambiguities:[],blockers:[],dispatch_authorized:false,
  } as any;
}
function seal(value: any) { value.selection_digest = capabilitySelectionDigest(value); return value; }
function resealCatalog(value: any) { const {catalog_digest:_digest,...payload}=value; value.catalog_digest=sha256Text(stableJson(payload)); return value; }
async function withBindings(row: typeof cases[number], action: (env: any, intake: any) => Promise<void>) {
  const directory = rootPath(`.artifacts/design-activation-test-${crypto.randomUUID()}`);
  // Every recursive cleanup target is this case's new absolute candidate-owned directory.
  if (relative(rootPath(".artifacts"), resolve(directory)).startsWith("..")) throw new Error("Unbounded test cleanup");
  await mkdir(directory,{recursive:true});
  try {
    const bindings = [];
    for (const type of row.inputs) {
      const path = `${relative(rootPath(),directory).replaceAll("\\","/")}/${type}.json`;
      const body=JSON.stringify({fixture_only:true,request:row.request,type});
      await writeFile(rootPath(path),body);
      bindings.push({artifact_type:type,artifact_id:`fixture-${type}`,version:"1",path,sha256:sha256Text(body)});
    }
    const env=await envelope(row.request);
    await action(env,await createCapabilityIntake(env,bindings,catalog));
  } finally { await rm(directory,{recursive:true,force:true}); }
}

describe("Cascade Design plugin activation contracts (offline structural qualification)",()=>{
  test("top-level activation reaches the real intake with all topics and depths",async()=>{
    expect(catalog.plugins.filter(plugin=>plugin.activation).map(plugin=>plugin.name)).toEqual(["cascade-design"]);
    await withBindings(cases[0],async(_env,intake)=>{
      expect(intake.prompt).toContain("Plugin activation contract");
      expect(intake.prompt).toContain("every UI change or UI refactor");
      for (const topic of design.activation.topics) expect(intake.prompt).toContain(topic.id);
      for (const depth of design.activation.depths) expect(intake.prompt).toContain(depth.id);
      expect(intake.prompt.length).toBeLessThanOrEqual(200000);
      expect(intake.dispatch_authorized).toBe(false);
    });
  });
  for (const row of cases) test(`authored ${row.id}: ${row.depth} ${row.route}`,async()=>{
    await withBindings(row,async(env,intake)=>{
      const raw=selection(env,row),before=stableJson(raw);
      const accepted=await acceptCapabilitySelection(intake,raw,catalog);
      expect(accepted.selected_candidates.map((item:any)=>item.route)).toEqual([row.route]);
      expect(accepted.plugin_activation).toEqual(raw.plugin_activation);
      expect(accepted.dispatch_authorized).toBe(false);
      expect(stableJson(raw)).toBe(before);
      expect(accepted.selector.prompt_sha256).toBe(intake.prompt_sha256);
    });
  });
  test("several UI topics can use one sufficient existing method",async()=>{
    const row={...cases[3],request:"Review the parameter editor's search and selection within the retained workspace layout."};
    await withBindings(row,async(env,intake)=>{
      const value=selection(env,row);
      value.plugin_activation[0].topics=["form-parameters","search-selection","navigation-layout"];
      const accepted=await acceptCapabilitySelection(intake,value,catalog);
      expect(accepted.selected_candidates).toHaveLength(1);
      expect(accepted.plugin_activation[0].topics).toEqual(value.plugin_activation[0].topics);
    });
  });
  test("focused UX and visual checks compose without loading every Design method",async()=>{
    const row={...cases[3],request:"Review the accepted parameter flow and compare its supplied rendered capture.",inputs:["product-contract","visual-evidence"]};
    await withBindings(row,async(env,intake)=>{
      const value=selection(env,row);
      value.plugin_activation[0].topics=["form-parameters","visual-style"];
      value.selected_candidates.push(selection(env,cases[0]).selected_candidates[0]);
      const accepted=await acceptCapabilitySelection(intake,value,catalog);
      expect(accepted.selected_candidates.map((candidate:any)=>candidate.route)).toEqual(["cascade-design:ux-flow-review","cascade-design:visual-qa"]);
      expect(accepted.selected_candidates).toHaveLength(2);
      expect(accepted.dispatch_authorized).toBe(false);
    });
  });
  const negatives: [string,(value:any)=>void,string][] = [
    ["missing activation",v=>delete v.plugin_activation,"disposition is missing"],
    ["duplicate activation",v=>v.plugin_activation.push({...v.plugin_activation[0],reason:"A second declaration must not overwrite the first."}),"duplicate plugin activation"],
    ["stale activation version",v=>v.plugin_activation[0].plugin_version="0.0.0","version is stale"],
    ["unknown claim",v=>v.plugin_activation[0].claim_ids=["CL-999"],"unknown claim"],
    ["unknown topic",v=>v.plugin_activation[0].topics=["invented-topic"],"unknown topic"],
    ["active NONE depth",v=>v.plugin_activation[0].depth="NONE","needs a depth and topic"],
    ["active missing topic",v=>v.plugin_activation[0].topics=[],"needs a depth and topic"],
    ["excluded selected method",v=>{v.plugin_activation[0].disposition="NOT_APPLICABLE";v.plugin_activation[0].depth="NONE";v.plugin_activation[0].topics=[];},"excluded plugin activation"],
    ["blocked in candidate",v=>v.plugin_activation[0].disposition="BLOCKED","requires a blocked selection"],
    ["undeclared plugin policy",v=>v.plugin_activation[0].plugin_name="cascade-discovery","not declared"],
    ["missing visual evidence",v=>v.input_artifacts=["task-envelope","plugin-capability-catalog"],"consumes unavailable artifact"],
  ];
  for(const [name,edit,error] of negatives) test(`rejects ${name}`,async()=>{
    const env=await envelope(cases[0].request),value=selection(env);edit(value);
    expect(()=>validateCapabilitySelection(seal(value),env,catalog)).toThrow(error);
  });
  test("ACTIVE cannot borrow a non-Design method or omit a declared UI claim",async()=>{
    const env=await envelope(cases[0].request,true),value=selection(env,cases[18]);
    value.plugin_activation[0]={...selection(env).plugin_activation[0]};
    expect(()=>validateCapabilitySelection(seal(value),env,catalog)).toThrow("has no selected method");
    const uncovered=selection(env);uncovered.plugin_activation[0].claim_ids=[env.claims[1].claim_id];
    expect(()=>validateCapabilitySelection(seal(uncovered),env,catalog)).toThrow("uncovered claim");
  });
  test("unknown UI impact and missing real evidence can remain blocked without dispatch",async()=>{
    const env=await envelope("The change's UI impact and inspectable surface are unknown."),value=selection(env);
    value.status="BLOCKED";value.selected_candidates=[];value.input_artifacts=["task-envelope","plugin-capability-catalog"];
    value.blockers=["Bind the affected surface and UI impact; collect the actual required evidence."];
    value.ambiguities=["Which observable UI surface and states does the refactor affect?"];
    value.plugin_activation[0].disposition="BLOCKED";value.plugin_activation[0].depth="NONE";value.plugin_activation[0].topics=[];
    expect(()=>validateCapabilitySelection(seal(value),env,catalog)).not.toThrow();
    value.plugin_activation[0]={...selection(env).plugin_activation[0]};
    expect(()=>validateCapabilitySelection(seal(value),env,catalog)).not.toThrow();
    expect(value.dispatch_authorized).toBe(false);
  });
  test("host cannot repair a missing semantic activation or elevate dispatch",async()=>{
    await withBindings(cases[0],async(env,intake)=>{
      const value=selection(env);delete value.plugin_activation;
      await expect(acceptCapabilitySelection(intake,value,catalog)).rejects.toThrow("disposition is missing");
      const elevated=selection(env);elevated.dispatch_authorized=true;
      await expect(acceptCapabilitySelection(intake,elevated,catalog)).rejects.toThrow();
    });
  });
  test("activation changes invalidate frozen intake and malformed policies fail closed",async()=>{
    await withBindings(cases[0],async(env,intake)=>{
      const changed=structuredClone(catalog);changed.plugins.find((p:any)=>p.name===design.name).activation.description+=" Revised scope.";resealCatalog(changed);
      await expect(acceptCapabilitySelection(intake,selection(env),changed)).rejects.toThrow("catalog is stale");
    });
    const duplicate=structuredClone(catalog);duplicate.plugins.find((p:any)=>p.name===design.name).activation.topics.push({...design.activation.topics[0],description:"A different body cannot disguise a duplicate topic identity."});
    expect(()=>validateCatalogDigest(resealCatalog(duplicate))).toThrow("duplicate topic");
    const foreign=structuredClone(catalog);foreign.plugins.find((p:any)=>p.name===design.name).activation.topics[0].routes.push("cascade-discovery:define-product");
    expect(()=>validateCatalogDigest(resealCatalog(foreign))).toThrow("foreign or absent method");
    const depths=structuredClone(catalog);depths.plugins.find((p:any)=>p.name===design.name).activation.depths[2].id="LIGHTWEIGHT";
    expect(()=>validateCatalogDigest(resealCatalog(depths))).toThrow("each proportional depth exactly once");
  });
  test("legacy catalogs without activation metadata remain structurally compatible",async()=>{
    const env=await envelope(cases[18].request),legacy=structuredClone(catalog);delete legacy.plugins.find((p:any)=>p.name===design.name).activation;resealCatalog(legacy);
    const value=selection(env,cases[18]);delete value.plugin_activation;value.capability_catalog_digest=legacy.catalog_digest;
    expect(()=>validateCapabilitySelection(seal(value),env,legacy)).not.toThrow();
  });
});
