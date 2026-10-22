import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {groupFeed,sampleFeed} from '../dist/grouping.mjs';
import {analyzeCampaign,ENGINE_VERSION} from '../dist/engine.mjs';

const checks=[];
const check=(name,run)=>{try{run();checks.push({name,passed:true});}catch(error){checks.push({name,passed:false,message:error.message});}};
const post=(id,extra={})=>({id,text:`Синтетический материал ${id}.`,synthetic:true,...extra});
const members=groups=>groups.map(c=>c.sources.map(s=>s.originalId).sort().join(',')).sort();
const refs=campaign=>[...new Set(campaign.sources.map(s=>s.originalCampaignRef.trim().replace(/^#/u,'').toLocaleLowerCase()).filter(Boolean))];
const noMixedRefs=groups=>groups.forEach(c=>assert.ok(refs(c).length<=1,`Merged incompatible refs: ${refs(c)}`));

check('existing complete paid/free/ordinary demo stays three campaigns',()=>{
  const groups=groupFeed(sampleFeed.posts);
  assert.deepEqual(groups.map(c=>c.sources.length),[3,2,1]);
  assert.deepEqual(groups.map(c=>analyzeCampaign(c).analysis.risk),['high','low','low']);
});
check('identical explicit refs merge',()=>assert.equal(groupFeed([post('a',{campaignRef:'DRAW_ALPHA'}),post('b',{campaignRef:'DRAW_ALPHA'})]).length,1));
check('case and optional hash normalize an otherwise exact reference',()=>assert.equal(groupFeed([post('a',{campaignRef:'#DRAW_ALPHA'}),post('b',{campaignRef:'draw_alpha'})]).length,1));
check('identical single text identifiers merge',()=>assert.equal(groupFeed([post('a',{text:'Первая часть #DRAW_ALPHA'}),post('b',{text:'Уточнение #DRAW_ALPHA'})]).length,1));
check('text identifier can match exact supplied ref without repeating tag',()=>assert.equal(groupFeed([post('a',{campaignRef:'DRAW_ALPHA'}),post('b',{text:'Уточнение #DRAW_ALPHA'})]).length,1));
check('unreferenced reply chain remains supported',()=>assert.deepEqual(members(groupFeed([post('a'),post('b',{replyTo:'a'}),post('c',{replyTo:'b'})])),['a,b,c']));
check('single known identity may anchor an unreferenced chain',()=>assert.deepEqual(members(groupFeed([post('a',{campaignRef:'DRAW_ALPHA'}),post('b',{replyTo:'a'}),post('c',{replyTo:'b'})])),['a,b,c']));
check('unique publication URL resolves a reply with tracking parameters',()=>assert.equal(groupFeed([post('a',{url:'https://raffle.temir.test/post/alpha'}),post('b',{replyTo:'https://raffle.temir.test/post/alpha?utm_source=fixture'})]).length,1));
check('shared author and common domain never merge sources',()=>assert.equal(groupFeed([post('a',{author:'Fictional account',url:'https://raffle.temir.test/a'}),post('b',{author:'Fictional account',url:'https://raffle.temir.test/b'})]).length,2));
check('different explicit refs veto a direct reply merge',()=>{
  const groups=groupFeed([post('a',{campaignRef:'DRAW_ALPHA'}),post('b',{campaignRef:'DRAW_BETA',replyTo:'a'})]);
  assert.equal(groups.length,2);noMixedRefs(groups);
  assert.ok(groups.every(c=>c.groupingNotes.some(n=>n.includes('разные ID'))));
});
check('different explicit refs with one shared text tag remain separate',()=>{
  const groups=groupFeed([post('a',{campaignRef:'DRAW_ALPHA',text:'Один пост #DRAW_SHARED'}),post('b',{campaignRef:'DRAW_BETA',text:'Другой пост #DRAW_SHARED'})]);
  assert.equal(groups.length,2);noMixedRefs(groups);
});
check('conditions from different campaigns cannot assemble a false high',()=>{
  const posts=[post('a',{campaignRef:'DRAW_ALPHA',text:'Разыгрываем смартфон. Для участия обязательно оплатить билет за 3000 тенге.'}),post('b',{campaignRef:'DRAW_BETA',replyTo:'a',text:'Победителя определит рандомайзер среди участников.'})];
  const groups=groupFeed(posts);
  assert.equal(groups.length,2);assert.ok(groups.every(c=>analyzeCampaign(c).analysis.risk!=='high'));noMixedRefs(groups);
});
const bridge=[post('a',{campaignRef:'DRAW_ALPHA',replyTo:'x'}),post('x'),post('b',{campaignRef:'DRAW_BETA',replyTo:'x'})];
check('unreferenced bridge touching two different refs is quarantined',()=>{
  const groups=groupFeed(bridge);assert.deepEqual(members(groups),['a','b','x']);noMixedRefs(groups);
  assert.ok(groups.every(c=>c.groupingNotes.some(n=>n.includes('разными розыгрышами'))));
});
check('bridge assignment does not depend on input order',()=>{
  for(const order of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]])assert.deepEqual(members(groupFeed(order.map(i=>bridge[i]))),['a','b','x']);
});
check('multi-node unknown bridge cannot transitively merge campaign refs',()=>{
  const groups=groupFeed([post('a',{campaignRef:'DRAW_ALPHA',replyTo:'x'}),post('x'),post('y',{replyTo:'x'}),post('b',{campaignRef:'DRAW_BETA',replyTo:'y'})]);
  assert.deepEqual(members(groups),['a','b','x','y']);noMixedRefs(groups);
});
check('single text IDs also protect against contradictory replies',()=>{
  const groups=groupFeed([post('a',{text:'Условия #DRAW_ALPHA'}),post('b',{text:'Условия #DRAW_BETA',replyTo:'a'})]);
  assert.equal(groups.length,2);
});
check('multiple text IDs without explicit ref cannot serve as a bridge',()=>{
  const groups=groupFeed([post('a',{campaignRef:'DRAW_ALPHA'}),post('x',{text:'Архив #DRAW_ALPHA и #DRAW_BETA',replyTo:'a'}),post('b',{campaignRef:'DRAW_BETA',replyTo:'x'})]);
  assert.deepEqual(members(groups),['a','b','x']);
  assert.ok(groups.find(c=>c.sources[0].originalId==='x').groupingConflicts.length>0);
});
check('explicit ref is preserved when caption mentions a different raffle',()=>{
  const groups=groupFeed([post('a',{campaignRef:'DRAW_ALPHA',text:'Этот пост про #DRAW_BETA'}),post('b',{campaignRef:'DRAW_ALPHA'}),post('c',{campaignRef:'DRAW_BETA'})]);
  assert.deepEqual(members(groups),['a,b','c']);noMixedRefs(groups);
  assert.ok(groups.find(c=>c.sources.length===2).groupingNotes.some(n=>n.includes('отличается')));
});
check('ambiguous reply URL does not choose the last matching post',()=>{
  const url='https://raffle.temir.test/profile';
  const groups=groupFeed([post('a',{url}),post('b',{url}),post('c',{replyTo:url})]);
  assert.equal(groups.length,3);
  assert.ok(groups.find(c=>c.sources[0].originalId==='c').groupingNotes.some(n=>n.includes('нескольким публикациям')));
});
check('original IDs refs and reply targets survive grouping',()=>{
  const groups=groupFeed([post('a',{campaignRef:'DRAW_ALPHA'}),post('b',{campaignRef:'DRAW_BETA',replyTo:'a'})]);
  const b=groups.find(c=>c.sources[0].originalId==='b');
  assert.equal(b.sources[0].originalCampaignRef,'DRAW_BETA');assert.equal(b.sources[0].originalReplyTo,'a');
  assert.deepEqual(b.groupingConflicts[0],{sourceId:'b',targetId:'a',sourceCampaignRef:'DRAW_BETA',targetCampaignRef:'DRAW_ALPHA',reason:b.groupingNotes[0]});
  groups.forEach(c=>assert.ok(c.sources.every(s=>s.campaignRef===c.id)));
});
check('synthetic and supplied provenance are not lost in a valid group',()=>{
  const c=groupFeed([post('a',{campaignRef:'DRAW_ALPHA'}),post('b',{campaignRef:'DRAW_ALPHA',synthetic:false})])[0];
  assert.equal(c.synthetic,false);assert.equal(c.containsSyntheticSources,true);assert.deepEqual(c.sources.map(s=>s.synthetic),[true,false]);
});
check('duplicate source IDs are still rejected',()=>assert.throws(()=>groupFeed([post('a'),post('a')]),/повторяется/));
check('import limit remains enforced',()=>assert.throws(()=>groupFeed(Array.from({length:301},(_,i)=>post('p'+i))),/300/));

const report={
  format:'iz-grouping-integrity-checks-v1',createdAt:new Date().toISOString(),engineVersion:ENGINE_VERSION,
  groupingSha256:createHash('sha256').update(readFileSync(new URL('../dist/grouping.mjs',import.meta.url))).digest('hex'),
  scope:'Deterministic synthetic functional assertions for campaign membership; not an independent detection benchmark, human study, or accuracy estimate.',
  total:checks.length,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length,checks,
};
writeFileSync(new URL('../evaluation/grouping-integrity-checks.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({total:report.total,passed:report.passed,failed:report.failed}));
if(report.failed){for(const c of checks.filter(c=>!c.passed))console.error(c.name+': '+c.message);process.exitCode=1;}
