import {normalizeAccount} from './relations.mjs?v=20261023-final-1';
// Exact references only. Similar names, shared domains, and wording never merge cases.
const string=(v,max=60000)=>String(v??'').slice(0,max);
const canonical=value=>{try{const u=new URL(value);if(!['https:','http:'].includes(u.protocol))return '';u.hash='';for(const key of [...u.searchParams.keys()])if(/^utm_/i.test(key))u.searchParams.delete(key);return u.href;}catch{return '';}};

export function groupFeed(records) {
  if(!Array.isArray(records)||!records.length||records.length>300)throw new Error('Поток должен содержать от 1 до 300 публикаций.');
  const sources=records.map((s,i)=>{
    if(!s||typeof s.text!=='string'||!s.text.trim()||s.text.length>60000)throw new Error(`Публикация ${i+1}: нужен текст до 60 000 символов.`);
    return {id:string(s.id||`post-${i+1}`,150),type:'text',text:s.text,author:string(s.author||'Не указан',100),url:canonical(s.url),timestamp:s.timestamp||new Date().toISOString(),originalRef:string(s.campaignRef,120),replyTo:string(s.replyTo,300),title:string(s.title,120),synthetic:s.synthetic===true,account:normalizeAccount(s.account,s.url,s.synthetic===true),kind:['post','live','message'].includes(s.kind)?s.kind:'post'};
  });
  // A supplied campaignRef is authoritative. Replies and quoted hashtags cannot
  // override two different references, including through an unreferenced bridge.
  const refKey=value=>String(value||'').trim().replace(/^#/u,'').toLocaleLowerCase();
  const identities=sources.map(s=>{
    const ref=refKey(s.originalRef),tags=[...new Set((s.text.match(/#(?:draw|raffle|ұтыс|розыгрыш)[_-][\p{L}\p{N}_-]{2,40}/giu)||[]).map(refKey))];
    return {ref,tags,key:ref||(tags.length===1?tags[0]:''),ambiguous:!ref&&tags.length>1};
  });
  const reasons=[],conflicts=[],edges=[],byRef=new Map(),byTag=new Map(),byId=new Map(),byUrl=new Map();
  const conflict=(a,b,reason)=>conflicts.push({a,b,reason});
  const propose=(a,b,reason)=>{if(a!==b)edges.push({a,b,reason});};
  sources.forEach((s,i)=>{
    if(byId.has(s.id))throw new Error(`ID публикации повторяется: ${s.id}`);
    byId.set(s.id,i);
    if(s.url){if(!byUrl.has(s.url))byUrl.set(s.url,[]);byUrl.get(s.url).push(i);}
    const identity=identities[i];
    if(identity.ref){
      if(byRef.has(identity.ref))propose(i,byRef.get(identity.ref),`Одинаковый ID розыгрыша: ${s.originalRef}`);
      else byRef.set(identity.ref,i);
      if(identity.tags.some(tag=>tag!==identity.ref))conflict(i,null,'ID в тексте отличается от заданного campaignRef. Для группировки используется campaignRef; остальные теги не связывают материалы.');
    }
    if(identity.ambiguous){conflict(i,null,'В тексте несколько разных ID розыгрышей и нет campaignRef. Материал оставлен отдельно до уточнения принадлежности.');return;}
    // A matching tag may connect an unreferenced post to an explicitly named
    // campaign. A different tag in that campaign is only a mention, not a key.
    for(const tag of identity.key?[identity.key]:[]){
      if(byTag.has(tag))propose(i,byTag.get(tag),`Точное совпадение ID в метаданных или тексте: ${tag}`);
      else byTag.set(tag,i);
    }
  });
  sources.forEach((s,i)=>{
    if(!s.replyTo)return;
    const direct=byId.get(s.replyTo),urlTargets=byUrl.get(canonical(s.replyTo));
    if(direct===undefined&&urlTargets?.length>1){conflict(i,null,'Ссылка ответа соответствует нескольким публикациям. Материал не объединён по неоднозначной ссылке.');return;}
    const target=direct??urlTargets?.[0];
    if(target!==undefined)propose(i,target,'Явная ссылка ответа на исходную публикацию');
  });

  // Unknown nodes reachable from two different identities are not assigned to
  // whichever campaign happens to occur first in the input. Keep them separate.
  const unknownParent=sources.map((_,i)=>i);
  const unknownFind=i=>unknownParent[i]===i?i:unknownParent[i]=unknownFind(unknownParent[i]);
  for(const {a,b}of edges)if(!identities[a].key&&!identities[b].key&&!identities[a].ambiguous&&!identities[b].ambiguous)unknownParent[unknownFind(b)]=unknownFind(a);
  const neighbors=new Map();
  for(const {a,b}of edges)for(const [unknown,known]of [[a,b],[b,a]])if(!identities[unknown].key&&!identities[unknown].ambiguous&&identities[known].key){
    const root=unknownFind(unknown);if(!neighbors.has(root))neighbors.set(root,new Set());neighbors.get(root).add(identities[known].key);
  }
  const ambiguousBridge=new Set(sources.map((_,i)=>i).filter(i=>!identities[i].key&&(neighbors.get(unknownFind(i))?.size||0)>1));
  const parent=sources.map((_,i)=>i),componentKeys=identities.map(identity=>new Set(identity.key?[identity.key]:[]));
  const find=i=>parent[i]===i?i:parent[i]=find(parent[i]);
  for(const {a,b,reason}of edges){
    if(identities[a].ambiguous||identities[b].ambiguous){conflict(a,b,'Несколько ID в одном материале: автоматическая связь не установлена.');continue;}
    if(ambiguousBridge.has(a)||ambiguousBridge.has(b)){conflict(a,b,'Материал без ID связан с разными розыгрышами. Автоматическое объединение остановлено; нужна проверка принадлежности.');continue;}
    const rootA=find(a),rootB=find(b),keys=new Set([...componentKeys[rootA],...componentKeys[rootB]]);
    if(keys.size>1){conflict(a,b,'У материалов разные ID розыгрышей. Ответ или общий тег не отменяет это противоречие; проверки сохранены отдельно.');continue;}
    parent[rootB]=rootA;componentKeys[rootA]=keys;reasons.push({a,b,reason});
  }
  const groups=new Map();sources.forEach((s,i)=>{const root=find(i);if(!groups.has(root))groups.set(root,[]);groups.get(root).push({s,i});});
  return [...groups.values()].map((group,index)=>{
    const ids=new Set(group.map(x=>x.i));const rejected=conflicts.filter(r=>ids.has(r.a)||ids.has(r.b));
    const notes=[...new Set([...reasons.filter(r=>ids.has(r.a)&&ids.has(r.b)).map(r=>r.reason),...rejected.map(r=>r.reason)])];
    const id=`feed-${crypto.randomUUID()}`;const first=group[0].s;const authors=[...new Set(group.map(x=>x.s.author))];
    return {id,title:first.title||`Розыгрыш ${first.originalRef||index+1}`,organizer:authors.length===1?authors[0]:`${authors.length} источника`,platform:'Поток публикаций',status:'new',synthetic:group.every(x=>x.s.synthetic),containsSyntheticSources:group.some(x=>x.s.synthetic)&&!group.every(x=>x.s.synthetic),manualGrouping:false,groupingNotes:notes.length?notes:['Надёжная связь с другими материалами не найдена. Публикация анализируется отдельно.'],groupingConflicts:rejected.map(r=>({sourceId:sources[r.a].id,targetId:r.b===null?null:sources[r.b].id,sourceCampaignRef:sources[r.a].originalRef,targetCampaignRef:r.b===null?'':sources[r.b].originalRef,reason:r.reason})),sources:group.map(({s},i)=>({id:`${id}-s${i+1}`,type:s.type,synthetic:s.synthetic,text:s.text,author:s.author,url:s.url,timestamp:s.timestamp,campaignRef:id,originalId:s.id,originalCampaignRef:s.originalRef,originalReplyTo:s.replyTo,account:s.account,kind:s.kind}))};
  });
}

export const sampleFeed={format:'iz-feed-v1',note:'Fictional synthetic examples. Exact campaignRef or replyTo establish association, not common domains.',posts:[
 {id:'p-1',campaignRef:'DRAW-017',title:'Ұтыс: условия в трёх постах',author:'Qadam · пример',synthetic:true,text:'Жаңа смартфон ойнатамыз! #DRAW_017',url:'https://example.com/channel/post-1'},
 {id:'p-2',campaignRef:'DRAW-017',author:'Qadam · пример',synthetic:true,text:'Для участия обязательно оплатить билет за 3 000 ₸. #DRAW_017',url:'https://example.com/channel/post-2'},
 {id:'p-3',replyTo:'p-1',author:'Qadam · пример',synthetic:true,text:'Победителя выберет рандомайзер среди участников.',url:'https://example.com/channel/post-3'},
 {id:'p-4',campaignRef:'FREE-028',title:'Бесплатный розыгрыш книги',author:'Kitap · пример',synthetic:true,text:'Разыгрываем книгу. Участие бесплатное, без покупки и без взносов.',url:'https://example.com/book/post-1'},
 {id:'p-5',campaignRef:'FREE-028',author:'Kitap · пример',synthetic:true,text:'Победителя определит генератор случайных чисел.',url:'https://example.com/book/post-2'},
 {id:'p-6',title:'Обычная продажа',author:'Dala · пример',synthetic:true,text:'Продаём наушники за 8 000 тенге. Каждый покупатель получает свой заказ.',url:'https://example.com/store/post-1'}
]};
