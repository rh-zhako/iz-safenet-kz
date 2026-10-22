import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {originalReferenceConflict,splitOriginalReferences} from '../dist/campaign-integrity.mjs';
import {analyzeCampaign,ENGINE_VERSION} from '../dist/engine.mjs';

const checks=[],check=(name,run)=>{try{run();checks.push({name,passed:true});}catch(error){checks.push({name,passed:false,message:error.message});}};
const NOW='2026-10-20T18:00:00.000Z';
const source=(id,originalCampaignRef,extra={})=>({id,text:`Синтетический текст ${id}.`,type:'text',campaignRef:'legacy-parent',originalCampaignRef,synthetic:true,...extra});
const campaign=(sources,extra={})=>({id:'legacy-parent',title:'Старая объединённая проверка',organizer:'Вымышленный автор',platform:'Импорт',manualGrouping:false,synthetic:true,sources,...extra});
const split=c=>{let n=0;return splitOriginalReferences(c,{makeId:()=>String(++n),now:NOW});};
const grouping=children=>children.map(c=>c.sources.map(s=>s.originalId).sort().join(',')).sort();
const deepFreeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))deepFreeze(child);}return value;};

check('empty or one reference does not produce a conflict',()=>{
  assert.deepEqual(originalReferenceConflict(campaign([])),{conflict:false,references:[]});
  assert.deepEqual(originalReferenceConflict(campaign([source('a','DRAW_ALPHA'),source('b','DRAW_ALPHA')])),{conflict:false,references:['DRAW_ALPHA']});
});
check('two different nonempty references are reported without alteration',()=>{
  const c=campaign([source('a','DRAW_ALPHA'),source('b','DRAW_BETA')]),before=JSON.stringify(c);
  assert.deepEqual(originalReferenceConflict(c),{conflict:true,references:['DRAW_ALPHA','DRAW_BETA']});assert.equal(JSON.stringify(c),before);
});
check('reference whitespace normalizes while original metadata remains intact',()=>{
  const c=campaign([source('a',' DRAW_ALPHA '),source('b','DRAW_ALPHA'),source('c',' DRAW_BETA ')]),children=split(c);
  assert.deepEqual(originalReferenceConflict(c).references,['DRAW_ALPHA','DRAW_BETA']);assert.deepEqual(grouping(children),['a,b','c']);assert.equal(children[0].sources[0].originalCampaignRef,' DRAW_ALPHA ');
});
check('blank and absent references are ignored by conflict detection',()=>{
  assert.deepEqual(originalReferenceConflict(campaign([source('a',' '),source('b',undefined),source('c',null)])),{conflict:false,references:[]});
});
check('splitting a nonconflicting campaign is refused',()=>{
  assert.throws(()=>split(campaign([source('a','DRAW_ALPHA'),source('b','DRAW_ALPHA')])),/не найдены/);
  assert.throws(()=>split(campaign([source('a',''),source('b','DRAW_ALPHA')])),/не найдены/);
});
check('equal references are grouped and different references split',()=>{
  assert.deepEqual(grouping(split(campaign([source('a','DRAW_ALPHA'),source('b','DRAW_BETA'),source('c','DRAW_ALPHA')]))),['a,c','b']);
});
check('every source without a reference gets its own independent copy',()=>{
  const children=split(campaign([source('a','DRAW_ALPHA'),source('b','DRAW_BETA'),source('u',''),source('v',' '),source('w',undefined)]));
  assert.deepEqual(grouping(children),['a','b','u','v','w']);assert.equal(children.length,5);
});
check('unassigned-source-3 as an actual reference cannot collide with an unassigned source',()=>{
  const children=split(campaign([source('a','DRAW_ALPHA'),source('b','unassigned-source-3'),source('u',''),source('c','unassigned-source-3')]));
  assert.deepEqual(grouping(children),['a','b,c','u']);
});
check('ref and unassigned key namespaces remain separate for punctuation',()=>{
  const children=split(campaign([source('a','ref:DRAW_ALPHA'),source('b','unassigned:2'),source('u','')]));assert.deepEqual(grouping(children),['a','b','u']);
});
check('frozen parent and frozen nested source metadata are not mutated',()=>{
  const c=deepFreeze(campaign([source('a','DRAW_ALPHA',{account:{platform:'instagram',handle:'fictional'},extra:{note:'preserve'}}),source('b','DRAW_BETA')])),before=JSON.stringify(c),children=split(c);
  assert.equal(JSON.stringify(c),before);assert.equal(children.length,2);assert.notEqual(children[0],c);assert.notEqual(children[0].sources,c.sources);assert.notEqual(children[0].sources[0],c.sources[0]);
});
check('source text image OCR and original provenance survive without edits',()=>{
  const original=source('a','DRAW_ALPHA',{text:'  «ү»\nОбязательный билет — 3 000 ₸.  ',originalId:'original-post-a',originalReplyTo:'previous-post',url:'https://raffle.temir.test/post/a',timestamp:'2026-10-19T11:00:00Z',kind:'live',type:'image',image:'data:image/png;base64,aGVsbG8=',ocrConfidence:81.25,originalText:'До исправления ү',correctedAt:'2026-10-19T12:00:00Z',account:{platform:'tiktok',handle:'fictional'},extra:{fragmentStart:12}}),c=campaign([original,source('b','DRAW_BETA')]);
  const child=split(c).find(d=>d.sources[0].originalId==='original-post-a'),copy=child.sources[0];
  for(const [key,value]of Object.entries(original))if(!['id','campaignRef'].includes(key))assert.deepEqual(copy[key],value,key);
  assert.notEqual(copy.id,original.id);assert.equal(copy.campaignRef,child.id);
});
check('earliest original source ID is retained rather than replaced by local ID',()=>{
  const children=split(campaign([source('a','DRAW_ALPHA',{originalId:'source-from-import'}),source('b','DRAW_BETA')]));assert.deepEqual(children.map(c=>c.sources[0].originalId),['source-from-import','b']);
});
check('all child and source IDs are fresh and unique with injected factory',()=>{
  const c=campaign([source('a','DRAW_ALPHA'),source('b','DRAW_BETA'),source('c','DRAW_ALPHA')]),children=split(c),ids=children.flatMap(child=>[child.id,...child.sources.map(s=>s.id)]);
  assert.equal(new Set(ids).size,ids.length);assert.ok(ids.every(id=>id!==c.id&&!c.sources.some(s=>s.id===id)));assert.ok(children.every(child=>child.sources.every(s=>s.campaignRef===child.id)));
});
check('each source appears exactly once across the new copies',()=>{
  const c=campaign([source('a','DRAW_ALPHA'),source('b','DRAW_BETA'),source('u',''),source('c','DRAW_ALPHA')]),children=split(c);
  assert.deepEqual(children.flatMap(d=>d.sources.map(s=>s.originalId)).sort(),c.sources.map(s=>s.id).sort());
});
check('each copy records its parent and a new unreviewed status',()=>{
  const children=split(campaign([source('a','DRAW_ALPHA'),source('b','DRAW_BETA')],{status:'resolved'}));
  for(const child of children){assert.equal(child.parentCaseId,'legacy-parent');assert.equal(child.status,'new');assert.equal(child.manualGrouping,false);assert.equal(child.createdAt,NOW);assert.ok(child.groupingNotes.some(n=>n.includes('Исходное дело')));}
});
check('quick review structured review drafts and old analysis are never transferred',()=>{
  const c=campaign([source('a','DRAW_ALPHA'),source('b','DRAW_BETA')],{review:{decision:'confirmed'},reviews:{x:'old'},structuredReview:{humanRisk:'high'},structuredReviews:{x:'old'},structuredDraft:{note:'old'},structuredDrafts:{x:'old'},analysis:{risk:'high'},activeReviewMs:1234}),children=split(c);
  for(const child of children)for(const key of ['review','reviews','structuredReview','structuredReviews','structuredDraft','structuredDrafts','analysis','activeReviewMs'])assert.equal(Object.hasOwn(child,key),false,key);
  assert.equal(c.review.decision,'confirmed');assert.equal(c.structuredDraft.note,'old');
});
check('source-level edits on a copy do not alter original source fields',()=>{
  const c=campaign([source('a','DRAW_ALPHA'),source('b','DRAW_BETA')]),children=split(c),prior=JSON.stringify(c);children[0].sources[0].text='Edited copy';children[0].sources[0].originalCampaignRef='OTHER';children[0].title='Edited';assert.equal(JSON.stringify(c),prior);
});
check('pure synthetic provenance stays pure per resulting campaign',()=>{
  for(const child of split(campaign([source('a','DRAW_ALPHA'),source('b','DRAW_BETA')]))){assert.equal(child.synthetic,true);assert.equal(child.containsSyntheticSources,false);assert.ok(child.sources.every(s=>s.synthetic===true));}
});
check('mixed synthetic provenance is recalculated within each split',()=>{
  const children=split(campaign([source('a','DRAW_ALPHA',{synthetic:true}),source('b','DRAW_ALPHA',{synthetic:false}),source('c','DRAW_BETA',{synthetic:false})],{synthetic:false,containsSyntheticSources:true})),mixed=children.find(c=>c.sources.length===2),provided=children.find(c=>c.sources.length===1);
  assert.equal(mixed.synthetic,false);assert.equal(mixed.containsSyntheticSources,true);assert.deepEqual(mixed.sources.map(s=>s.synthetic),[true,false]);assert.equal(provided.synthetic,false);assert.equal(provided.containsSyntheticSources,false);
});
check('source flags override campaign demo fallback conservatively',()=>{
  const children=split(campaign([source('a','DRAW_ALPHA',{synthetic:undefined}),source('b','DRAW_BETA',{synthetic:false})],{synthetic:true}));assert.equal(children[0].synthetic,true);assert.equal(children[1].synthetic,false);assert.equal(children[1].sources[0].synthetic,false);
});
check('campaign metadata and long title remain bounded',()=>{
  const children=split(campaign([source('a','DRAW_ALPHA'),source('b','DRAW_BETA')],{title:'x'.repeat(200),organizer:'Supplied organizer',platform:'Provided platform'}));for(const child of children){assert.ok(child.title.length<=120);assert.equal(child.organizer,'Supplied organizer');assert.equal(child.platform,'Provided platform');}
});
const paid='Разыгрываем смартфон. Для участия обязательно оплатить билет за 3000 тенге.',random='Победителя определит рандомайзер среди участников.';
check('engine prevents composite high for conflicting originals even after manualGrouping true',()=>{
  for(const manualGrouping of [false,true,undefined]){
    const c=campaign([source('a','DRAW_ALPHA',{text:paid}),source('b','DRAW_BETA',{text:random})],{manualGrouping}),before=JSON.stringify(c),result=analyzeCampaign(c);
    assert.equal(result.analysis.risk,'medium');assert.equal(result.analysis.groupingIntegrity.state,'conflict');assert.ok(result.analysis.contradictions.some(t=>t.includes('campaignRef')));assert.equal(JSON.stringify(c),before);
  }
});
check('engine recomputes split parts separately instead of retaining composite high',()=>{
  const c=campaign([source('a','DRAW_ALPHA',{text:paid}),source('b','DRAW_BETA',{text:random})],{analysis:{risk:'high'}}),children=split(c);
  assert.deepEqual(children.map(d=>analyzeCampaign(d).analysis.risk),['medium','low']);assert.ok(children.every(d=>analyzeCampaign(d).analysis.groupingIntegrity.state!=='conflict'));
});
check('a valid same-ref paid campaign remains eligible for high',()=>{
  const c=campaign([source('a','DRAW_ALPHA',{text:paid}),source('b','DRAW_ALPHA',{text:random})]);assert.equal(analyzeCampaign(c).analysis.risk,'high');assert.equal(originalReferenceConflict(c).conflict,false);
});
check('engine identity conflict is based on included sources only',()=>{
  const c=campaign([source('a','DRAW_ALPHA',{text:paid+' '+random}),source('b','DRAW_BETA',{text:'Пост другого розыгрыша.',campaignRef:'another-case'})]);assert.equal(analyzeCampaign(c).analysis.risk,'high');assert.equal(analyzeCampaign(c).analysis.groupingIntegrity.state,'consistent');
});
const report={format:'iz-campaign-integrity-checks-v1',createdAt:new Date().toISOString(),engineVersion:ENGINE_VERSION,scope:'Deterministic synthetic contract checks for preserving legacy campaign sources and producing unreviewed separate copies; not an independent benchmark or human validation.',moduleSha256:createHash('sha256').update(readFileSync(new URL('../dist/campaign-integrity.mjs',import.meta.url))).digest('hex'),engineSha256:createHash('sha256').update(readFileSync(new URL('../dist/engine.mjs',import.meta.url))).digest('hex'),total:checks.length,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length,checks};
writeFileSync(new URL('../evaluation/campaign-integrity-checks.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({total:report.total,passed:report.passed,failed:report.failed}));
if(report.failed){for(const c of checks.filter(c=>!c.passed))console.error(c.name+': '+c.message);process.exitCode=1;}
