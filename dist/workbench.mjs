import {isReviewCurrent} from './review.mjs?v=20261023-final-1';
import {isStructuredReviewCurrent} from './structured-review.mjs?v=20261023-final-1';
const rank={high:0,medium:1,low:2};
export function effectiveReview(c,reviews={},structuredReviews={}){
 const quick=reviews[c.id],manual=structuredReviews[c.id];
 const time=r=>Number.isFinite(Date.parse(r?.at))?Date.parse(r.at):-Infinity;
 if(manual&&(!quick||time(manual)>=time(quick)))return {entry:manual,kind:'structured',current:isStructuredReviewCurrent(c,manual),deferred:false};
 if(quick)return {entry:quick,kind:'quick',current:isReviewCurrent(c,quick),deferred:true};
 return null;
}
export const needsReview=(c,reviews={},structuredReviews={})=>{const r=effectiveReview(c,reviews,structuredReviews);return r?(!r.current||r.deferred):c.analysis.risk!=='low';};
export function queueCampaigns(campaigns,reviews={},options={}){
 const {filter='all',query='',scope='all',structuredReviews={}}=options,q=query.toLocaleLowerCase();
 const resolved=c=>{const r=effectiveReview(c,reviews,structuredReviews);return r?.current&&!r.deferred;};
 return campaigns.filter(c=>(scope!=='own'||!c.synthetic)&&(filter==='all'||(filter==='pending'?needsReview(c,reviews,structuredReviews):filter==='resolved'?resolved(c):c.analysis.risk===filter))&&`${c.title||''} ${c.organizer||''} ${c.platform||''}`.toLocaleLowerCase().includes(q)).sort((a,b)=>(Number(needsReview(b,reviews,structuredReviews))-Number(needsReview(a,reviews,structuredReviews)))||(rank[a.analysis.risk]-rank[b.analysis.risk])||String(a.createdAt||a.sources?.[0]?.timestamp||'').localeCompare(String(b.createdAt||b.sources?.[0]?.timestamp||''))||a.id.localeCompare(b.id));
}
export function reviewSummary(campaigns,reviews={},structuredReviews={}){
 const own=campaigns.filter(c=>!c.synthetic),current=own.filter(c=>{const r=effectiveReview(c,reviews,structuredReviews);return r?.current&&!r.deferred;});
 const times=current.map(c=>effectiveReview(c,reviews,structuredReviews).entry.activeReviewMs).filter(x=>Number.isFinite(x)&&x>0).sort((a,b)=>a-b);
 return {total:own.length,pending:own.filter(c=>needsReview(c,reviews,structuredReviews)).length,resolved:current.length,timed:times.length,medianSeconds:times.length?Math.round((times[Math.floor((times.length-1)/2)]+times[Math.ceil((times.length-1)/2)])/2000):null};
}
