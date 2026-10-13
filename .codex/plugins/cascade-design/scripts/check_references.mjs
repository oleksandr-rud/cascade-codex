#!/usr/bin/env node
/** Read-only local integrity/Markdown path closure. Never fetches or grades semantics. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {fileURLToPath} from "node:url";

const defaultRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const hash=file=>crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
export function checkReferences(root=defaultRoot){
  root=fs.realpathSync(root);
  const errors=[];
  const resolve=relative=>{
    if(typeof relative!=="string"||!relative||path.isAbsolute(relative))throw new Error("Reference path must be local/relative");
    const absolute=path.resolve(root,relative);
    if(!absolute.startsWith(root+path.sep))throw new Error("Reference path escapes package: "+relative);
    if(fs.existsSync(absolute)&&!fs.realpathSync(absolute).startsWith(root+path.sep))throw new Error("Reference symlink escapes package: "+relative);
    return absolute;
  };
  const manifest=JSON.parse(fs.readFileSync(resolve("references/source-manifest.json"),"utf8"));
  if(manifest.schema_version!==1||manifest.runtime_fetch!==false||manifest.source_execution!==false)errors.push("Invalid local source manifest boundary");
  const rows=[...manifest.files,...manifest.licenses,...manifest.authored_files];
  const identities=new Set();
  for(const row of rows){
    if(identities.has(row.local_path))errors.push("Duplicate local source path: "+row.local_path);
    identities.add(row.local_path);
    const file=resolve(row.local_path);
    if(!fs.existsSync(file)||!fs.statSync(file).isFile()){errors.push("Missing local reference: "+row.local_path);continue;}
    if(hash(file)!==row.local_sha256)errors.push("Stale local reference SHA256: "+row.local_path);
    if(row.copy_mode==="EXACT_LICENSE"&&row.local_sha256!==row.source_sha256)errors.push("Modified source license/notice: "+row.local_path);
    if(row.copy_mode==="ADAPTED_FULL_REFERENCE"&&(!Array.isArray(row.modifications)||!row.modifications.length))errors.push("Missing adaptation record: "+row.local_path);
  }
  const walk=(at,prefix="")=>fs.readdirSync(at,{withFileTypes:true}).flatMap(entry=>{const relative=prefix?prefix+"/"+entry.name:entry.name;return entry.isDirectory()?walk(path.join(at,entry.name),relative):entry.isFile()?[relative]:[];});
  const local=walk(root);
  for(const relative of local.filter(file=>file.startsWith("references/")&&file!=="references/source-manifest.json"))if(!identities.has(relative))errors.push("Unbound reference file: "+relative);
  const entrypoints=local.filter(file=>/^skills\/[^/]+\/SKILL\.md$/.test(file));
  if(entrypoints.length!==5||local.some(file=>file.startsWith("references/")&&path.basename(file)==="SKILL.md"))errors.push("Expected exactly five operative methods; references are not skill entrypoints");
  let markdownLinks=0,provenanceLinks=0;
  for(const relative of local.filter(file=>file.endsWith(".md"))){
    const text=fs.readFileSync(resolve(relative),"utf8");
    let fence=null;
    const plain=text.split(/\r?\n/).filter(line=>{
      const marker=line.match(/^\s{0,3}(`{3,}|~{3,})/);
      if(marker){const kind=marker[1][0];if(fence===null)fence=kind;else if(fence===kind)fence=null;return false;}
      return fence===null;
    }).join("\n");
    for(const match of plain.matchAll(/\[[^\]\n]*\]\((<[^>\n]+>|[^\s)]+)(?:\s+"[^"\n]*")?\)/g)){
      const target=match[1].replace(/^<|>$/g,"");
      if(/^(?:https?:|mailto:|data:)/i.test(target)){provenanceLinks++;continue;}
      if(target.startsWith("#"))continue;
      const clean=decodeURIComponent(target.split("#")[0].split("?")[0]);
      const resolved=path.resolve(path.dirname(resolve(relative)),clean);
      markdownLinks++;
      if(!resolved.startsWith(root+path.sep)){errors.push(`Markdown path escapes package: ${relative} -> ${target}`);continue;}
      if(!fs.existsSync(resolved))errors.push(`Missing Markdown target: ${relative} -> ${target}`);
    }
  }
  const digest=crypto.createHash("sha256").update([...rows].sort((a,b)=>a.local_path<b.local_path?-1:a.local_path>b.local_path?1:0).map(row=>row.local_path+"\0"+row.local_sha256+"\n").join("")).digest("hex");
  return {status:errors.length?"FAIL":"PASS",errors,source_files:manifest.files.length,license_notices:manifest.licenses.length,authored_references:manifest.authored_files.length,operative_methods:entrypoints.length,markdown_links:markdownLinks,provenance_links:provenanceLinks,local_reference_digest:digest,scope:"Exact local hashes, paths, licenses, entrypoint count and explicit Markdown path closure only; no semantic/model, standards, installed or target qualification"};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const result=checkReferences();console.log(JSON.stringify(result,null,2));if(result.status!=="PASS")process.exitCode=1;}catch(error){console.error(String(error));process.exitCode=1;}
}
