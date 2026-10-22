import {normalizeAccount} from './relations.mjs?v=20261023-final-1';

// Observed references in supplied materials. This module never fetches URLs,
// infers ownership, merges cases, or changes a campaign's risk assessment.
export const NETWORK_NOTICE='Совпадение аккаунта, ссылки или контакта — повод проверить материалы. Оно не доказывает общего владельца, доход или нарушение и не повышает уровень риска.';
const LIMITS={campaigns:500,sources:5000,relatedPairs:2000};
const text=v=>String(v??'');
const sorted=values=>[...values].sort((a,b)=>String(a).localeCompare(String(b),'en'));
const compact=v=>text(v).replace(/\s+/gu,' ').trim();
const emailPattern=/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+/giu;
const phonePattern=/(?:\+7|[78])(?:[\s().-]*\d){10}/gu;
const contactContext=/(?:для\s+связи|связаться|контакт|телефон|тел\.|запис|whatsapp|ватсап|почт|e-?mail|телеграм|telegram|байланыс|хабарлас|пошта)/iu;
const promoContext=/(?:услов|подробн|ссылк|регистрац|участ|заявк|запис|билет|слот|розыгрыш|байланыс|тіркел|қатысу|ереж|сілтем|жазыл|ұтыс)/iu;
const ignoredHosts=['example.com','example.org','example.net','instagram.com','tiktok.com','youtube.com','youtu.be','facebook.com','vk.com','google.com','google.kz','bing.com','yandex.ru','yandex.kz','wikipedia.org','wikipedia.com','kaspi.kz','t.me','telegram.me','wa.me','whatsapp.com'];
const shaConstants=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
function sha256(value){
  const bytes=new TextEncoder().encode(value),size=Math.ceil((bytes.length+9)/64)*64,data=new Uint8Array(size);data.set(bytes);data[bytes.length]=128;
  const view=new DataView(data.buffer);view.setUint32(size-8,Math.floor(bytes.length/0x20000000));view.setUint32(size-4,bytes.length*8);
  const state=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],w=new Uint32Array(64),ror=(n,b)=>(n>>>b)|(n<<(32-b));
  for(let p=0;p<size;p+=64){
    for(let i=0;i<16;i++)w[i]=view.getUint32(p+i*4);
    for(let i=16;i<64;i++){const x=w[i-15],y=w[i-2];w[i]=(w[i-16]+(ror(x,7)^ror(x,18)^(x>>>3))+w[i-7]+(ror(y,17)^ror(y,19)^(y>>>10)))>>>0;}
    let [a,b,c,d,e,f,g,h]=state;
    for(let i=0;i<64;i++){const first=(h+(ror(e,6)^ror(e,11)^ror(e,25))+((e&f)^(~e&g))+shaConstants[i]+w[i])>>>0,second=((ror(a,2)^ror(a,13)^ror(a,22))+((a&b)^(a&c)^(b&c)))>>>0;h=g;g=f;f=e;e=(d+first)>>>0;d=c;c=b;b=a;a=(first+second)>>>0;}
    for(const [i,n] of [a,b,c,d,e,f,g,h].entries())state[i]=(state[i]+n)>>>0;
  }
  return state.map(n=>n.toString(16).padStart(8,'0')).join('');
}
const key=(kind,value)=>`${kind}:${sha256(`${kind}\0${value}`)}`;
function cleanLabel(value,max=180,allowAccount=false){
  let result=compact(value).replace(emailPattern,'[email скрыт]').replace(/\+?\d[\d\s().-]{6,}\d/gu,raw=>raw.replace(/\d/gu,'•'));
  if(!allowAccount)result=result.replace(/@[a-z0-9_]{4,32}/giu,'@••••');
  return result.replace(/[<>"'`&\u0000-\u001f\u007f]/gu,'').slice(0,max);
}
const safeId=(value,fallback)=>/^[a-z0-9_.:-]{1,160}$/iu.test(text(value))&&!/\d{8}/u.test(text(value))?text(value):key('id',text(value)||fallback);
// Match local app IDs to pseudonymous graph provenance without returning raw identifiers.
export const networkMaterialKey=value=>safeId(value,'missing');
const sameHost=(host,base)=>host===base||host.endsWith(`.${base}`);
const decodePath=value=>{try{return decodeURIComponent(value);}catch{return value;}};
function canonicalUrl(raw){
  try{const u=new URL(raw);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.href.length>1000||!u.hostname.includes('.')||/^\d+(?:\.\d+){3}$/u.test(u.hostname))return null;return u;}catch{return null;}
}
const normalizedPhone=raw=>{const digits=raw.replace(/\D/gu,'');return digits.length===11&&/^[78]/u.test(digits)?`7${digits.slice(1)}`:'';};
const phoneLabel=value=>`Телефон · ••• ••• •${value.slice(-4)}`;
const evidenceSort=(a,b)=>`${a.campaignId}\0${a.sourceId}\0${a.start??-1}\0${a.label||a.quote||''}`.localeCompare(`${b.campaignId}\0${b.sourceId}\0${b.start??-1}\0${b.label||b.quote||''}`,'en');
const uniqueEvidence=items=>[...new Map(items.map(e=>[JSON.stringify(e),e])).values()].sort(evidenceSort);

function referencesIn(source,campaignId,sourceId){
  const body=text(source.text),items=[],urlRanges=[];
  const proof=(start,end,quote)=>({campaignId,sourceId,kind:'text',quote:cleanLabel(quote,220),start,end,redacted:cleanLabel(quote,220)!==quote});
  const add=(kind,value,label,contactType,start,end)=>{
    const evidence=proof(start,end,body.slice(start,end));
    if(kind==='url'){
      const u=canonicalUrl(value),masked=cleanLabel(u.origin+decodePath(u.pathname)+(u.search?'?[параметры скрыты]':'')+(u.hash?'#[фрагмент скрыт]':''),220);
      evidence.quote=masked;evidence.redacted=masked!==body.slice(start,end);
    }
    items.push({id:key(kind,value),kind,label,contactType,evidence});
  };
  for(const match of body.matchAll(/https?:\/\/[^\s<>"'\u0000-\u001f]+/giu)){
    const raw=match[0].replace(/[),.!;\]}]+$/gu,''),u=canonicalUrl(raw);urlRanges.push([match.index,match.index+raw.length]);if(!u)continue;
    const start=match.index,end=start+raw.length,context=body.slice(Math.max(0,start-90),Math.min(body.length,end+45)),host=u.hostname.toLowerCase().replace(/^www\./u,'');
    if(contactContext.test(context)&&['t.me','telegram.me'].includes(host)&&/^\/[a-z][a-z0-9_]{4,31}\/?$/iu.test(u.pathname)){
      add('contact',`telegram:${u.pathname.replace(/^\/|\/$/gu,'').toLowerCase()}`,'Telegram · @••••','telegram',start,end);continue;
    }
    if(contactContext.test(context)&&host==='wa.me'&&/^\/\d{11}\/?$/u.test(u.pathname)){
      const phone=normalizedPhone(u.pathname);if(phone)add('contact',`phone:${phone}`,phoneLabel(phone),'phone',start,end);continue;
    }
    if(ignoredHosts.some(base=>sameHost(host,base))||!promoContext.test(context)||u.pathname==='/'&&!u.search&&!u.hash)continue;
    add('url',u.href,`Ссылка · ${cleanLabel(host+decodePath(u.pathname),130)}${u.search?' · параметры скрыты':''}`,undefined,start,end);
  }
  for(const match of body.matchAll(emailPattern)){
    const start=match.index,end=start+match[0].length;if(urlRanges.some(([a,b])=>start>=a&&start<b)||!contactContext.test(body.slice(Math.max(0,start-70),Math.min(body.length,end+25))))continue;
    add('contact',`email:${match[0].toLowerCase()}`,'Email · ••••@••••','email',start,end);
  }
  for(const match of body.matchAll(phonePattern)){
    const start=match.index,end=start+match[0].length,before=body.slice(0,start),after=body.slice(end),phone=normalizedPhone(match[0]);
    if(!phone||urlRanges.some(([a,b])=>start>=a&&start<b)||/\d[\s().-]*$/u.test(before)||/^[\s().-]*\d/u.test(after)||/^\s*(?:₸|тенге|тг\b|руб|₽|\$)/iu.test(after)||!contactContext.test(body.slice(Math.max(0,start-70),start)))continue;
    add('contact',`phone:${phone}`,phoneLabel(phone),'phone',start,end);
  }
  for(const match of body.matchAll(/@[a-z][a-z0-9_]{4,31}/giu)){
    const start=match.index,end=start+match[0].length,before=body.slice(Math.max(0,start-60),start);
    if(urlRanges.some(([a,b])=>start>=a&&start<b)||!/(?:телеграм|telegram)/iu.test(before)||/[\w.]/u.test(body[start-1]||''))continue;
    add('contact',`telegram:${match[0].slice(1).toLowerCase()}`,'Telegram · @••••','telegram',start,end);
  }
  // Contacts are always redacted, including URLs that contain a contact handle.
  return items.map(item=>item.kind==='contact'?{...item,evidence:{...item.evidence,quote:item.label,redacted:true}}:item);
}

/**
 * Synchronous, deterministic, local-only graph of explicitly supplied references.
 * labels/quotes are plain text. Consumers must still use textContent or HTML escaping.
 * Text offsets refer to the original source; redacted quotes intentionally differ.
 * Contact IDs are unsalted SHA-256 pseudonyms, not legally anonymous data.
 */
export function buildNetwork(campaigns=[]){
  if(!Array.isArray(campaigns)||campaigns.length>LIMITS.campaigns)throw new Error(`Для графа нужен массив до ${LIMITS.campaigns} проверок.`);
  if(campaigns.reduce((sum,c)=>sum+(Array.isArray(c?.sources)?c.sources.length:0),0)>LIMITS.sources)throw new Error(`Граф поддерживает до ${LIMITS.sources} источников.`);
  const nodes=new Map(),edges=new Map(),accountCases=new Map(),artifactCases=new Map(),records=[],ignoredSources=[],seenCampaigns=new Set();let sourceCount=0;
  const addEdge=(type,from,to,evidence)=>{const id=key('edge',`${type}\0${from}\0${to}`);if(!edges.has(id))edges.set(id,{id,type,from,to,evidence:[],notice:NETWORK_NOTICE});edges.get(id).evidence.push(evidence);};
  campaigns.forEach((campaign,index)=>{
    if(!campaign||typeof campaign!=='object')throw new Error('Каждая проверка должна быть объектом.');
    const originalId=text(campaign.id)||`case-${index+1}`;if(seenCampaigns.has(originalId))throw new Error('ID проверок должны быть уникальными.');seenCampaigns.add(originalId);
    const campaignId=safeId(originalId,`case-${index+1}`),id=key('campaign',originalId),ownRef=text(campaign.campaignRef||campaign.id),record={id,campaignId,body:[],accountIds:new Set(),raffleRefs:new Map(),referenceConflict:false};
    nodes.set(id,{id,kind:'campaign',campaignId,label:cleanLabel(campaign.title||`Проверка ${index+1}`),synthetic:campaign.synthetic===true});
    for(const [sourceIndex,source] of (Array.isArray(campaign.sources)?campaign.sources:[]).entries()){
      if(!source||typeof source!=='object')continue;
      const sourceId=safeId(source.id,`${originalId}-source-${sourceIndex+1}`);
      if(source.campaignRef&&ownRef&&text(source.campaignRef)!==ownRef){ignoredSources.push({campaignId,sourceId,reason:'conflicting_campaign_ref'});continue;}
      const body=text(source.text);if(body.length>60000)throw new Error('Текст одного источника должен быть не длиннее 60 000 символов.');sourceCount++;
      // A repost with only its explicit raffle hashtag changed is still a copy
      // for the conservative series counter. This does not merge the cases.
      const duplicateBody=compact(body.replace(/#(?:draw|raffle|ұтыс|розыгрыш)[_-][\p{L}\p{N}_-]{2,40}/giu,'[ID розыгрыша]')).toLowerCase();
      if(duplicateBody)record.body.push(duplicateBody);
      const refs=[];
      if(source.originalCampaignRef){const value=compact(source.originalCampaignRef).replace(/^#/u,'').toLowerCase();if(value)refs.push({value,evidence:{campaignId,sourceId,kind:'metadata',label:`Явный ID розыгрыша: ${cleanLabel(value,120)}`,field:'originalCampaignRef'}});}
      for(const match of body.matchAll(/#(?:draw|raffle|ұтыс|розыгрыш)[_-][\p{L}\p{N}_-]{2,40}/giu))refs.push({value:match[0].slice(1).toLowerCase(),evidence:{campaignId,sourceId,kind:'text',quote:cleanLabel(match[0],120),start:match.index,end:match.index+match[0].length,redacted:cleanLabel(match[0],120)!==match[0]}});
      for(const ref of refs){if(!record.raffleRefs.has(ref.value))record.raffleRefs.set(ref.value,[]);record.raffleRefs.get(ref.value).push(ref.evidence);}
      const account=normalizeAccount(source.account,source.url,campaign.synthetic===true);let accountId;
      if(account){
        accountId=key('account',account.key);record.accountIds.add(accountId);
        nodes.set(accountId,{id:accountId,kind:'account',platform:account.platform,label:cleanLabel(account.label,140,true),synthetic:account.platform==='demo'});
        if(!accountCases.has(accountId))accountCases.set(accountId,new Set());accountCases.get(accountId).add(id);
        addEdge('account_campaign',accountId,id,{campaignId,sourceId,kind:'metadata',label:source.account?'Аккаунт указан в метаданных материала':'Аккаунт извлечён из URL источника',field:source.account?'account':'url'});
      }
      for(const artifact of referencesIn(source,campaignId,sourceId)){
        const {evidence,...node}=artifact;nodes.set(artifact.id,node);addEdge('campaign_reference',id,artifact.id,evidence);
        if(accountId)addEdge('account_reference',accountId,artifact.id,evidence);
        if(!artifactCases.has(artifact.id))artifactCases.set(artifact.id,{campaignIds:new Set(),accountIds:new Set(),evidence:[]});
        const observed=artifactCases.get(artifact.id);observed.campaignIds.add(id);if(accountId)observed.accountIds.add(accountId);observed.evidence.push({...evidence,...(accountId?{accountId}:{})});
      }
    }
    record.bodyHash=record.body.length?sha256(sorted(record.body).join('\n')):'';delete record.body;
    record.referenceConflict=record.raffleRefs.size>1;records.push(record);
    nodes.get(id).referenceConflict=record.referenceConflict;
  });
  const byId=new Map(records.map(r=>[r.id,r])),pairs=new Map(),series=[],candidates=[];
  const pair=(a,b,reason,referenceId)=>{if(a===b)return;const ids=sorted([a,b]),id=key('pair',ids.join('\0'));if(!pairs.has(id))pairs.set(id,{id,campaignIds:ids,reasons:[],referenceIds:[],accountIds:[],series:false,notice:NETWORK_NOTICE});const item=pairs.get(id);if(!item.reasons.includes(reason))item.reasons.push(reason);if(referenceId&&!item.referenceIds.includes(referenceId))item.referenceIds.push(referenceId);return item;};
  for(const [accountId,caseSet] of accountCases){
    const ids=sorted(caseSet);for(let a=0;a<ids.length;a++)for(let b=a+1;b<ids.length;b++){const item=pair(ids[a],ids[b],'same_supplied_account');item.accountIds.push(accountId);}
    const byBody=new Map();for(const id of ids){const record=byId.get(id);if(!record.bodyHash||record.referenceConflict||record.raffleRefs.size!==1)continue;if(!byBody.has(record.bodyHash))byBody.set(record.bodyHash,[]);byBody.get(record.bodyHash).push(record);}
    const distinctRefs=new Map();for(const group of byBody.values()){
      const refs=new Set(group.map(r=>[...r.raffleRefs.keys()][0]));if(refs.size!==1)continue;
      const selected=group.sort((a,b)=>a.id.localeCompare(b.id,'en'))[0],ref=[...refs][0];if(!distinctRefs.has(ref)||selected.id<distinctRefs.get(ref).id)distinctRefs.set(ref,selected);
    }
    if(distinctRefs.size>=2){
      const entries=[...distinctRefs].sort(([a],[b])=>a.localeCompare(b,'en')),campaignIds=entries.map(([,r])=>r.id);
      series.push({id:key('series',accountId),accountId,campaignIds,raffleIds:entries.map(([ref])=>cleanLabel(ref,120)),distinctCount:entries.length,evidence:uniqueEvidence(entries.flatMap(([ref,r])=>r.raffleRefs.get(ref))),notice:'Разные явные ID и разные тексты у указанного аккаунта. Это повторяемость публикаций, а не доказательство нарушения.'});
      for(let a=0;a<campaignIds.length;a++)for(let b=a+1;b<campaignIds.length;b++)pair(campaignIds[a],campaignIds[b],'different_explicit_raffle_ids').series=true;
    }
  }
  for(const [referenceId,observed] of artifactCases){
    if(observed.accountIds.size<2)continue;
    const reference=nodes.get(referenceId),campaignIds=sorted(observed.campaignIds),accountIds=sorted(observed.accountIds);
    candidates.push({id:key('candidate',referenceId),referenceId,kind:reference.kind,contactType:reference.contactType,label:reference.label,accountIds,campaignIds,evidence:uniqueEvidence(observed.evidence),basis:'exact_supplied_reference',notice:NETWORK_NOTICE});
    for(let a=0;a<campaignIds.length;a++)for(let b=a+1;b<campaignIds.length;b++)pair(campaignIds[a],campaignIds[b],'same_exact_reference',referenceId);
  }
  const bodyGroups=new Map();for(const r of records){if(!r.bodyHash)continue;if(!bodyGroups.has(r.bodyHash))bodyGroups.set(r.bodyHash,[]);bodyGroups.get(r.bodyHash).push(r.id);}
  const duplicates=[...bodyGroups.values()].filter(ids=>ids.length>1).map(ids=>({campaignIds:sorted(ids),reason:'identical_normalized_text_without_raffle_hashtags',notice:'Одинаковые тексты, включая копии с заменённым хештегом ID, не считаются новыми розыгрышами.'})).sort((a,b)=>a.campaignIds[0].localeCompare(b.campaignIds[0],'en'));
  const allPairs=[...pairs.values()].sort((a,b)=>a.id.localeCompare(b.id,'en')).map(p=>({...p,reasons:sorted(p.reasons),referenceIds:sorted(p.referenceIds),accountIds:sorted(new Set(p.accountIds))}));
  const result={version:'iz-network-v1',riskAffected:false,nodes:[...nodes.values()].sort((a,b)=>a.id.localeCompare(b.id,'en')),edges:[...edges.values()].sort((a,b)=>a.id.localeCompare(b.id,'en')).map(e=>({...e,evidence:uniqueEvidence(e.evidence)})),candidates:candidates.sort((a,b)=>a.id.localeCompare(b.id,'en')),relatedCampaigns:allPairs.slice(0,LIMITS.relatedPairs),series:series.sort((a,b)=>a.id.localeCompare(b.id,'en')),duplicates,ignoredSources:ignoredSources.sort((a,b)=>evidenceSort(a,b)),metrics:{campaigns:records.length,sources:sourceCount,ignoredSources:ignoredSources.length,accounts:accountCases.size,publicUrls:[...nodes.values()].filter(n=>n.kind==='url').length,maskedContacts:[...nodes.values()].filter(n=>n.kind==='contact').length,candidateConnections:candidates.length,relatedCampaignPairs:allPairs.length,repeatedAccounts:series.length,duplicateGroups:duplicates.length,conflictingRaffleIds:records.filter(r=>r.referenceConflict).length},truncated:{relatedPairs:Math.max(0,allPairs.length-LIMITS.relatedPairs)},limits:{...LIMITS},limitations:[NETWORK_NOTICE,'Граф основан только на загруженных материалах. Публичность, актуальность и принадлежность аккаунтов не проверяются. Ссылки не открываются.','Контакты показаны в маскированном виде; ключи — локальные SHA-256 псевдонимы. Это не юридическая анонимизация. Исходные материалы могут содержать персональные данные.','Одинаковый домен, похожее имя, общие слова и общий хештег не связывают аккаунты. Издатель материала не обязательно владелец упомянутого контакта.']};
  return result;
}
