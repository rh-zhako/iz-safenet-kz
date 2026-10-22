// Run checks in an owned temporary copy: historical reports stay unchanged.
import {mkdtempSync,cpSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));const args=process.argv.slice(2);
if(args.length&&!(args.length===2&&args[0]==='--report'))throw new Error('Usage: node scripts/verify.mjs [--report path.json]');
const work=mkdtempSync(join(tmpdir(),'iz-verification-'));
const scripts=['check-release','check-engine-v20','check-engine-v17','check-structured-review','check-review-integration','check-workbench','check-campaign-integrity','check-grouping-integrity','check-network','check-batch','check-input-drafts','check-focus','check-data-recovery','check-source-sensitivity','check-source-edit','check-draft-backup','check-selection-boundary','reproduce-fresh-v8','reproduce-fresh-v7','reproduce-fresh-v6'];
const report={engineSha256:createHash('sha256').update(readFileSync(join(root,'dist/engine.mjs'))).digest('hex'),at:new Date().toISOString(),scope:'Program contracts and historical prediction reproduction in an isolated copy. No new blind, real-world, OCR quality or human usability study.',commands:[],passed:0,total:0,reproducedPredictions:0};
try{
 for(const dir of ['dist','scripts','evaluation'])cpSync(join(root,dir),join(work,dir),{recursive:true});
 for(const script of scripts){
  const r=spawnSync(process.execPath,[join(work,'scripts',script+'.mjs')],{cwd:work,encoding:'utf8',maxBuffer:12*1024*1024});
  let data;try{data=JSON.parse(r.stdout.trim());}catch{}
  const counts=data?.passed!==undefined?data:data?.checks?.passed!==undefined?data.checks:null;
  const network=r.stdout.match(/Network module: (\d+)\/(\d+) checks passed/);
  const passed=counts?.passed??(network?Number(network[1]):0),total=counts?.total??(network?Number(network[2]):0);
  const ok=r.status===0&&(!total||passed===total)&&(!script.startsWith('reproduce-')||data?.reproduced===true);
  report.commands.push({script,ok,passed,total,...(data?.reproduced?{reproduced:data.total}:{})});report.passed+=passed;report.total+=total;if(data?.reproduced)report.reproducedPredictions+=data.total;
  console.log(`${ok?'PASS':'FAIL'} ${script}${total?' '+passed+'/'+total:''}${data?.reproduced?' '+data.total+' predictions':''}`);
  if(!ok){console.error(r.stderr||r.stdout);process.exitCode=1;}
 }
 report.ok=report.commands.every(c=>c.ok);
 if(args.length)writeFileSync(resolve(root,args[1]),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({ok:report.ok,passed:report.passed,total:report.total,reproducedPredictions:report.reproducedPredictions}));
}finally{rmSync(work,{recursive:true,force:true});}
