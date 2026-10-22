import assert from 'node:assert/strict';
import {File as NodeFile} from 'node:buffer';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inputDraftConflict,createInputDraftStore,normalizeInputDrafts,installInputDraftEvents,INPUT_DRAFT_LIMITS} from '../dist/input-drafts.mjs';
const checks=[],check=(name,run)=>{try{run();checks.push({name,passed:true});}catch(error){checks.push({name,passed:false,message:error.message});}};
const record=(text='')=>({schemaVersion:1,updatedAt:'2026-10-20T00:00:00.000Z',fields:{text}});
const form=values=>{
  const controls=Object.fromEntries(Object.entries(values).map(([name,value])=>[name,{name,value,type:name==='sourceKind'||name==='accountPlatform'?'select-one':name==='text'?'textarea':'text'}]));
  const f={id:'quick-form',dataset:{},controls,elements:{namedItem:name=>controls[name]||null}};
  Object.values(controls).forEach(c=>c.form=f);return f;
};
const sizedFile=(name,size)=>{const file=new NodeFile(['x'],name,{type:'image/png'});Object.defineProperty(file,'size',{value:size});return file;};
check('text whitespace and exact characters survive capture and restore',()=>{
  const store=createInputDraftStore(),a=form({text:'  «Обязательный взнос»\n\nү ұ і  '});store.capture(a,'quick:new');a.controls.text.value='';assert.equal(store.restore(a,'quick:new'),true);assert.equal(a.controls.text.value,'  «Обязательный взнос»\n\nү ұ і  ');
});
check('metadata fields survive a serializable snapshot roundtrip',()=>{
  const source=form({text:'Условия',title:'Проверка',organizer:'Указанный автор',url:'https://raffle.temir.test/a',accountPlatform:'tiktok',accountHandle:'fictional',sourceUrl:'https://raffle.temir.test/b',sourceKind:'live'}),store=createInputDraftStore();store.capture(source,'modal:new');
  const restored=createInputDraftStore(JSON.parse(JSON.stringify(store.snapshot()))),target=form(Object.fromEntries(Object.keys(source.controls).map(k=>[k,''])));restored.restore(target,'modal:new');assert.deepEqual(Object.fromEntries(Object.entries(target.controls).map(([k,c])=>[k,c.value])),Object.fromEntries(Object.entries(source.controls).map(([k,c])=>[k,c.value])));
});
check('quick and modal case keys do not overwrite each other',()=>{
  const store=createInputDraftStore();for(const key of ['quick:new','quick:case-one','modal:new','modal:case-one'])store.set(key,record(key));assert.deepEqual(Object.values(store.snapshot()).map(r=>r.fields.text),['quick:new','quick:case-one','modal:new','modal:case-one']);
});
check('capture whitelist excludes secrets files and hidden controls',()=>{
  const f=form({text:'public',title:'password',organizer:'hidden',unknown:'secret'});f.controls.title.type='password';f.controls.organizer.type='hidden';const store=createInputDraftStore();store.capture(f,'quick:new');assert.deepEqual(store.get('quick:new').fields,{text:'public'});
});
check('restore uses value assignment and never interprets user HTML',()=>{
  const payload='<img src=x onerror="alert(1)"><script>x</script>',store=createInputDraftStore({'quick:new':record(payload)}),f=form({text:''});let markupWrites=0;Object.defineProperty(f.controls.text,'innerHTML',{set(){markupWrites++;}});store.restore(f,'quick:new');assert.equal(f.controls.text.value,payload);assert.equal(markupWrites,0);
});
check('readonly campaign metadata is not replaced by an older form draft',()=>{
  const store=createInputDraftStore({'modal:case-a':{...record('text'),fields:{text:'draft',title:'Old'}}}),f=form({text:'',title:'Current'});f.controls.title.readOnly=true;store.restore(f,'modal:case-a');assert.equal(f.controls.title.value,'Current');assert.equal(f.controls.text.value,'draft');
});
check('unchanged input and change events do not emit duplicate records',()=>{
  const calls=[],store=createInputDraftStore({}, {onDraft:(key,value)=>calls.push({key,value})}),f=form({text:'same'});store.capture(f,'quick:new');store.capture(f,'quick:new');assert.equal(calls.length,1);
});
check('external mutation of a callback or snapshot cannot change store contents',()=>{
  const store=createInputDraftStore({}, {onDraft:(key,value)=>{if(value)value.fields.text='tampered';}});store.set('quick:new',record('original'));const snap=store.snapshot();snap['quick:new'].fields.text='changed';assert.equal(store.get('quick:new').fields.text,'original');
});
check('example replacement preserves the previous manually entered text',()=>{
  const store=createInputDraftStore(),f=form({text:'Мои условия'});store.useExample(f,'quick:new','Синтетический пример');assert.equal(f.controls.text.value,'Синтетический пример');assert.equal(store.hasPrevious('quick:new'),true);store.restorePrevious(f,'quick:new');assert.equal(f.controls.text.value,'Мои условия');assert.equal(store.hasPrevious('quick:new'),false);
});
check('switching two examples keeps the original manual text',()=>{
  const store=createInputDraftStore(),f=form({text:'Мои условия'});store.useExample(f,'quick:new','Пример 1');store.useExample(f,'quick:new','Пример 2');store.restorePrevious(f,'quick:new');assert.equal(f.controls.text.value,'Мои условия');
});
check('manual edits after an example become the next recoverable input',()=>{
  const store=createInputDraftStore(),f=form({text:'Первая запись'});store.useExample(f,'quick:new','Пример');f.controls.text.value='Новая ручная запись';store.capture(f,'quick:new');store.useExample(f,'quick:new','Другой пример');store.restorePrevious(f,'quick:new');assert.equal(f.controls.text.value,'Новая ручная запись');
});
check('previous input survives reload through text-only snapshot',()=>{
  const store=createInputDraftStore(),f=form({text:'До примера'});store.useExample(f,'quick:new','Пример');const next=createInputDraftStore(JSON.parse(JSON.stringify(store.snapshot()))),restored=form({text:''});next.restorePrevious(restored,'quick:new');assert.equal(restored.controls.text.value,'До примера');
});
check('clear success removes current text previous text and files for one key',()=>{
  const calls=[],store=createInputDraftStore({}, {onDraft:(key,value)=>calls.push({key,value})}),f=form({text:'Own'});store.useExample(f,'quick:new','Example');store.setFiles('quick:new',[sizedFile('one.png',10)]);store.set('modal:new',record('retain'));assert.equal(store.clear('quick:new'),true);assert.equal(store.get('quick:new'),null);assert.deepEqual(store.getFiles('quick:new'),[]);assert.equal(store.get('modal:new').fields.text,'retain');assert.deepEqual(calls.at(-1),{key:'quick:new',value:null});
});
check('file objects remain only in memory and disappear on serialized reload',()=>{
  const store=createInputDraftStore({'quick:new':record('text')}),file=sizedFile('private-file.png',10);store.setFiles('quick:new',[file]);const copied=store.getFiles('quick:new');assert.equal(copied[0],file);copied.pop();assert.equal(store.getFiles('quick:new').length,1);const json=JSON.stringify(store.snapshot());assert.ok(!json.includes('private-file'));assert.deepEqual(createInputDraftStore(JSON.parse(json)).getFiles('quick:new'),[]);assert.equal(store.hasFiles(),true);
});
check('file limits reject new selection without replacing earlier files',()=>{
  const store=createInputDraftStore(),one=sizedFile('one.png',1);store.setFiles('quick:new',[one]);assert.throws(()=>store.setFiles('quick:new',Array.from({length:4},()=>one)),/3/);assert.throws(()=>store.setFiles('quick:new',[sizedFile('large.png',16*1024*1024)]),/15/);assert.equal(store.getFiles('quick:new')[0],one);
});
check('aggregate file memory is bounded across draft keys',()=>{
  const store=createInputDraftStore();store.setFiles('quick:a',[sizedFile('a.png',15*1024*1024)]);store.setFiles('quick:b',[sizedFile('b.png',15*1024*1024)]);assert.throws(()=>store.setFiles('quick:c',[sizedFile('c.png',1)]),/30/);assert.deepEqual(store.getFiles('quick:c'),[]);
});
check('unknown keys and record schemas cannot enter the map',()=>{
  const store=createInputDraftStore();assert.throws(()=>store.set('__proto__',record('x')),/Неизвестная/);assert.throws(()=>store.set('quick:new',{fields:{text:'x'}}),/версии 1/);assert.throws(()=>normalizeInputDrafts({'quick:new':{fields:{text:'x'}}}),/Повреждён/);
});
check('text and metadata length bounds apply to untrusted records',()=>{
  const store=createInputDraftStore({'quick:new':{...record('x'.repeat(60001)),fields:{text:'x'.repeat(60001),title:'x'.repeat(121),accountHandle:'x'.repeat(41)},previousText:'y'.repeat(60001)}}),draft=store.get('quick:new');assert.equal(draft.fields.text.length,60000);assert.equal(draft.fields.title.length,120);assert.equal(draft.fields.accountHandle.length,40);assert.equal(draft.previousText.length,60000);
});
check('invalid select values are excluded instead of restored into controls',()=>{
  const store=createInputDraftStore({'quick:new':{...record('x'),fields:{text:'x',accountPlatform:'other',sourceKind:'evil'}}});assert.deepEqual(store.get('quick:new').fields,{text:'x'});
});
check('100-draft limit refuses a new key without silently evicting old input',()=>{
  const store=createInputDraftStore(Object.fromEntries(Array.from({length:100},(_,i)=>['quick:case-'+i,record('retained '+i)])));assert.throws(()=>store.set('quick:extra',record('new')),/100/);assert.equal(Object.keys(store.snapshot()).length,100);assert.equal(store.get('quick:case-0').fields.text,'retained 0');
});
check('file-only drafts also count toward the 100-key limit',()=>{
  const store=createInputDraftStore(Object.fromEntries(Array.from({length:100},(_,i)=>['quick:case-'+i,record('x')])));assert.throws(()=>store.setFiles('quick:extra',[sizedFile('x.png',1)]),/100/);assert.deepEqual(store.getFiles('quick:extra'),[]);
});
check('serialized text budget refuses addition without damaging prior records',()=>{
  const store=createInputDraftStore();let rejected=false;for(let i=0;i<30;i++){try{store.set('quick:case-'+i,record('x'.repeat(60000)));}catch(error){assert.match(error.message,/лимит/);rejected=true;break;}}assert.equal(rejected,true);assert.ok(JSON.stringify(store.snapshot()).length<=INPUT_DRAFT_LIMITS.serializedCharacters);assert.equal(store.get('quick:case-0').fields.text.length,60000);
});
check('installer captures input without rendering or stealing focus and detaches',()=>{
  const listeners=new Map(),root={addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name);}},calls=[],store=createInputDraftStore({}, {onDraft:(key,value)=>calls.push({key,value})}),f=form({text:'Draft'}),stop=installInputDraftEvents({root,store,getKey:()=> 'quick:new'});listeners.get('input')({target:f.controls.text});assert.equal(calls.length,1);assert.equal(store.get('quick:new').fields.text,'Draft');assert.equal(f.controls.text.value,'Draft');stop();assert.equal(listeners.size,0);
});
check('installer ignores unrelated and file inputs and reports bounded errors',()=>{
  const listeners=new Map(),root={addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:()=>{}},errors=[],store=createInputDraftStore();installInputDraftEvents({root,store,getKey:()=> 'invalid',onError:error=>errors.push(error.message)});const f=form({text:'x',unrelated:'y'});listeners.get('input')({target:f.controls.unrelated});f.controls.text.type='file';listeners.get('change')({target:f.controls.text});assert.equal(errors.length,0);f.controls.text.type='textarea';listeners.get('input')({target:f.controls.text});assert.equal(errors.length,1);assert.deepEqual(store.snapshot(),{});
});
const emptyDraft={schemaVersion:1,fields:{text:'',accountPlatform:'instagram',accountHandle:'',sourceUrl:'',sourceKind:'post'}},restoredDraft={schemaVersion:1,fields:{...emptyDraft.fields,text:'Сохранённый текст'}};
check('untouched default draft does not block restoration',()=>assert.equal(inputDraftConflict(emptyDraft,restoredDraft),false));
check('meaningful current text blocks conflicting restoration',()=>assert.equal(inputDraftConflict({...restoredDraft,fields:{...restoredDraft.fields,text:'Другой текст'}},restoredDraft),true));
check('current memory files prevent replacement of empty draft',()=>assert.equal(inputDraftConflict(emptyDraft,restoredDraft,{hasFiles:true}),true));
check('previous manual text is protected even if examples match',()=>assert.equal(inputDraftConflict({...restoredDraft,previousText:'Мой предыдущий текст'},restoredDraft),true));
check('matching content may be restored despite a different timestamp',()=>assert.equal(inputDraftConflict({...restoredDraft,updatedAt:'2026-10-20T01:00:00Z'},{...restoredDraft,updatedAt:'2026-10-20T02:00:00Z'}),false));
const report={format:'iz-input-drafts-checks-v1',createdAt:new Date().toISOString(),scope:'Deterministic local draft contract checks with form doubles; not a browser navigation test, human usability study, or detection benchmark.',moduleSha256:createHash('sha256').update(readFileSync(new URL('../dist/input-drafts.mjs',import.meta.url))).digest('hex'),limits:INPUT_DRAFT_LIMITS,total:checks.length,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length,checks};
writeFileSync(new URL('../evaluation/input-drafts-checks.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({total:report.total,passed:report.passed,failed:report.failed}));
if(report.failed){for(const c of checks.filter(c=>!c.passed))console.error(c.name+': '+c.message);process.exitCode=1;}
