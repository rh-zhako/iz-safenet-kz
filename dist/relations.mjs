// References supplied with the materials. No external account lookup or ownership inference.
export function normalizeAccount(value, url='', allowDemo=false) {
  if(value&&typeof value==='object') {
    const platform=String(value.platform||'').toLowerCase();
    const handle=String(value.handle||'').trim().replace(/^@/u,'').toLowerCase();
    if(['instagram','tiktok'].includes(platform)&&/^[a-z0-9._]{1,40}$/u.test(handle)) return {key:`${platform}:${handle}`,platform,handle,label:`${platform==='instagram'?'Instagram':'TikTok'} · @${handle}`};
    if(allowDemo&&platform==='demo'&&/^account-[a-z]$/u.test(handle)) return {key:`demo:${handle}`,platform,handle,label:`Аккаунт ${handle.slice(-1).toUpperCase()} · вымышленный`};
  }
  try {
    const u=new URL(url);if(!['https:','http:'].includes(u.protocol))return null;
    const host=u.hostname.toLowerCase().replace(/^(?:www\.|m\.)/u,'');
    const parts=u.pathname.split('/').filter(Boolean);
    if(host==='instagram.com'&&parts.length===1&&!['p','reel','reels','stories','explore','accounts','tv'].includes(parts[0].toLowerCase()))return normalizeAccount({platform:'instagram',handle:parts[0]});
    if(host==='tiktok.com'&&parts[0]?.startsWith('@'))return normalizeAccount({platform:'tiktok',handle:parts[0]});
  }catch{}
  return null;
}

export function accountsOf(campaign) {
  const accounts=new Map(),ref=String(campaign.campaignRef||campaign.id||'');
  for(const source of campaign.sources||[]) {
    if(source.campaignRef&&ref&&String(source.campaignRef)!==ref)continue;
    const account=normalizeAccount(source.account,source.url,campaign.synthetic===true);
    if(!account)continue;
    if(!accounts.has(account.key))accounts.set(account.key,{...account,sourceIds:[]});
    accounts.get(account.key).sourceIds.push(source.id);
  }
  return [...accounts.values()];
}
const activeSources=c=>(c.sources||[]).filter(s=>!s.campaignRef||String(s.campaignRef)===String(c.campaignRef||c.id||''));
const references=c=>[...new Set(activeSources(c).flatMap(s=>[
  ...(s.originalCampaignRef?[String(s.originalCampaignRef).replace(/^#/u,'').toLowerCase()]:[]),
  ...(String(s.text||'').match(/#(?:draw|raffle|ұтыс|розыгрыш)[_-][\p{L}\p{N}_-]{2,40}/giu)||[]).map(x=>x.replace(/^#/u,'').toLowerCase()),
]))].sort();
const bodyKey=c=>activeSources(c).map(s=>String(s.text||'').replace(/\s+/gu,' ').trim().toLowerCase()).sort().join('\n');

export function campaignRelations(campaign, campaigns=[]) {
  const accounts=accountsOf(campaign),keys=new Set(accounts.map(a=>a.key)),ownRefs=references(campaign),seen=new Set(),related=[];
  const ownBody=bodyKey(campaign);
  for(const other of campaigns) {
    if(other.id===campaign.id||bodyKey(other)===ownBody)continue;
    const shared=accountsOf(other).filter(a=>keys.has(a.key));if(!shared.length)continue;
    const refs=references(other);if(refs.some(r=>ownRefs.includes(r)))continue;
    const signature=refs.length?refs.join('|'):bodyKey(other);if(seen.has(signature))continue;seen.add(signature);
    related.push({id:other.id,title:other.title,accounts:shared.map(a=>a.label),series:!!(ownRefs.length&&refs.length),references:refs});
  }
  return {accounts,related,seriesCount:related.filter(r=>r.series).length,multipleAccounts:accounts.length>1,
    limitation:'Аккаунты указаны в загруженных материалах или введены пользователем. Совпадение аккаунта не доказывает общего владельца или нарушения. Разные розыгрыши сохраняются отдельно.'};
}
