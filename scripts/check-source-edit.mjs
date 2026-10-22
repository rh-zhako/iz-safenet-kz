import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,writeFileSync} from 'node:fs';
import {createBackup,readBackup} from '../dist/backup.mjs';
const app=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
const code=app.slice(app.indexOf('function submitSourceEdit(event){'),app.indexOf("document.addEventListener('submit',event=>"));
assert.ok(code.startsWith('function submitSourceEdit(event){'));
const initial=()=>({campaigns:[{id:'case1',title:'Synthetic source correction',sources:[{id:'s1',text:'Первый исходный текст.',campaignRef:'case1'},{id:'s2',text:'Другой источник.',campaignRef:'case1'}]},{id:'case2',title:'Other case',sources:[{id:'s3',text:'Чужое дело.',campaignRef:'case2'}]}],reviews:{case1:{note:'Keep review'}},structuredReviews:{},structuredDrafts:{},inputDrafts:{}});
function run(text,{write=true,persist=true,saved=initial(),state={selectedId:'case1',editSourceId:'s1'}}={}){
 const calls={persist:0,close:0,render:0,toasts:[],errors:[],focus:0,prevent:0};
 const context=vm.createContext({saved,state,campaignCache:['cached'],storageError:'Simulated storage failure',FormData:class{get(){return text;}},canWrite:()=>write,persist:()=>{calls.persist++;return persist;},closeModal:()=>calls.close++,render:()=>calls.render++,toast:s=>calls.toasts.push(s),showError:s=>calls.errors.push(s),$:()=>({focus:()=>calls.focus++})});
 vm.runInContext(code+';submitSourceEdit({target:{},preventDefault(){}});',context);
 return {saved:context.saved,calls};
}
const checks=[];function check(name,fn){try{fn();checks.push({name,passed:true});}catch(e){checks.push({name,passed:false,message:e.message});}}
check('whitespace cannot destroy source or backup',()=>{const original=initial(),x=run(' \n\t ',{saved:original});assert.equal(x.saved,original);assert.equal(x.saved.campaigns[0].sources[0].text,'Первый исходный текст.');assert.equal(x.calls.persist,0);assert.equal(x.calls.close,0);assert.equal(x.calls.errors.length,1);assert.equal(readBackup(createBackup(x.saved.campaigns)).campaigns.length,2);});
check('limit enforced beyond native textarea validation',()=>{const x=run('a'.repeat(60001));assert.equal(x.calls.persist,0);assert.equal(x.calls.errors.length,1);});
check('missing campaign rejects without mutation',()=>{const x=run('Новый текст',{state:{selectedId:'missing',editSourceId:'s1'}});assert.equal(x.calls.persist,0);assert.equal(x.calls.errors.length,1);});
check('missing source rejects without mutation',()=>{const x=run('Новый текст',{state:{selectedId:'case1',editSourceId:'missing'}});assert.equal(x.calls.persist,0);assert.equal(x.calls.errors.length,1);});
check('conflict cannot edit memory or claim success',()=>{const original=initial(),x=run('Новый текст',{saved:original,write:false});assert.equal(x.saved,original);assert.equal(x.calls.persist,0);assert.equal(x.calls.toasts.length,0);assert.equal(x.calls.close,0);});
check('write failure rolls back whole source state and keeps dialog',()=>{const original=initial(),x=run('Новый текст',{saved:original,persist:false});assert.equal(x.saved,original);assert.equal(x.calls.close,0);assert.equal(x.calls.render,0);assert.equal(x.calls.toasts.length,0);assert.equal(x.calls.errors.length,1);assert.equal(x.calls.focus,1);assert.equal(x.saved.campaigns[0].sources[0].originalText,undefined);});
check('successful correction preserves first original and backup',()=>{const x=run('  Исправленный текст.  '),s=x.saved.campaigns[0].sources[0];assert.equal(s.text,'Исправленный текст.');assert.equal(s.originalText,'Первый исходный текст.');assert.ok(!Number.isNaN(Date.parse(s.correctedAt)));assert.equal(x.calls.close,1);assert.equal(x.calls.toasts.length,1);assert.equal(readBackup(createBackup(x.saved.campaigns)).campaigns[0].sources[0].text,s.text);});
check('second correction retains the first original',()=>{const first=run('Исправление1').saved,x=run('Исправление2',{saved:first});assert.equal(x.saved.campaigns[0].sources[0].originalText,'Первый исходный текст.');});
check('other materials and review maps remain intact',()=>{const original=initial(),x=run('Новый текст',{saved:original});assert.equal(x.saved.campaigns[0].sources[1],original.campaigns[0].sources[1]);assert.equal(x.saved.campaigns[1],original.campaigns[1]);assert.equal(x.saved.reviews,original.reviews);assert.equal(original.campaigns[0].sources[0].text,'Первый исходный текст.');});
const report={scope:'Actual source-edit submit handler and backup compatibility; isolated DOM/storage collaborators; not a full browser or detector accuracy test.',passed:checks.filter(c=>c.passed).length,total:checks.length,checks};
writeFileSync(new URL('../evaluation/source-edit-checks.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(report.passed!==report.total)process.exitCode=1;
