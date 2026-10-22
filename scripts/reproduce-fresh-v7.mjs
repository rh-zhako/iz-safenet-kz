import {mkdtempSync,mkdirSync,readdirSync,copyFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const work=mkdtempSync(join(tmpdir(),'iz-frozen-v7-'));
try{
 for(const name of ['dist','scripts','evaluation'])mkdirSync(join(work,name));
 for(const name of readdirSync(join(root,'dist')).filter(n=>n.endsWith('.mjs')))copyFileSync(join(root,'dist',name),join(work,'dist',name));
 copyFileSync(join(root,'evaluation/engine-v1.9-snapshot.mjs'),join(work,'dist/engine.mjs'));
 for(const name of ['measure-fresh-ai-v7.mjs','measure-v17.mjs'])copyFileSync(join(root,'scripts',name),join(work,'scripts',name));
 for(const name of ['engine-v1.6-snapshot.mjs','fresh-ai-v7.json','fresh-ai-v7-freeze.json','fresh-ai-v7-report.json'])copyFileSync(join(root,'evaluation',name),join(work,'evaluation',name));
 const r=spawnSync(process.execPath,[join(work,'scripts/measure-fresh-ai-v7.mjs'),'--reproduce'],{encoding:'utf8',cwd:work});
 if(r.stdout)process.stdout.write(r.stdout);
 if(r.stderr)process.stderr.write(r.stderr);
 if(r.error)throw r.error;
 process.exitCode=r.status??1;
}finally{rmSync(work,{recursive:true,force:true});}
