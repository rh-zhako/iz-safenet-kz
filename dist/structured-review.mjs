import {originalReferenceConflict} from './campaign-integrity.mjs?v=20261023-final-1';
import { ENGINE_VERSION } from './engine.mjs?v=20261023-final-1';
import { materialStamp } from './review.mjs?v=20261023-final-1';
import { normalizeAccount } from './relations.mjs?v=20261023-final-1';
import { sourceSynthetic } from './provenance.mjs?v=20261023-final-1';

// A local, editable analyst record. These references are not security signatures.
export const STRUCTURED_REVIEW_VERSION = 1;
export const structuredConditionKeys = Object.freeze(['prize', 'payment', 'random']);
export const structuredConditionLabels = Object.freeze({prize:'Приз', payment:'Обязательная оплата участия', random:'Случайный выбор победителя'});
export const structuredStatusLabels = Object.freeze({confirmed:'Подтверждено', notConfirmed:'Не подтверждено', unclear:'Неясно'});
export const structuredRiskLabels = Object.freeze({low:'Низкий', medium:'Средний', high:'Высокий'});
const own = (object,key) => object && Object.hasOwn(object,key);
const str = (value,max=2000) => typeof value === 'string' ? value.slice(0,max) : '';
const validDate = value => typeof value==='string' && Number.isFinite(Date.parse(value)) ? value : '';
const validStatus = value => own(structuredStatusLabels,value);
const validRisk = value => own(structuredRiskLabels,value);
const stamp = value => {
  const text=JSON.stringify(value); let hash=2166136261;
  for(let i=0;i<text.length;i++) hash=Math.imul(hash^text.charCodeAt(i),16777619);
  return `source-v1-${(hash>>>0).toString(16)}-${text.length}`;
};
const cleanTime = value => Number.isFinite(value)&&value>=0&&value<=86400000 ? Math.round(value) : null;
const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeJson = value => JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');

export function structuredSourceEligible(campaign,source) {
  const ref=String(campaign.campaignRef||campaign.id||'');
  return !!source && typeof source.text==='string' && (!source.campaignRef||!ref||String(source.campaignRef)===ref);
}

export const structuredOriginalConflict=campaign=>originalReferenceConflict({...campaign,sources:(campaign.sources||[]).filter(source=>structuredSourceEligible(campaign,source))}).conflict;

export function structuredSourceStamp(source,campaign={}) {
  const account=normalizeAccount(source?.account,source?.url,campaign.synthetic===true);
  return stamp([source?.text||'',source?.author||'',source?.url||'',source?.timestamp||'',source?.kind||'post',source?.type||'text',source?.image||'',source?.originalText||'',account?[account.platform,account.handle]:null,sourceSynthetic(source||{},campaign.synthetic)]);
}

function sourceMetadata(campaign,source,index) {
  const account=normalizeAccount(source.account,source.url,campaign.synthetic===true);
  return {index, author:str(source.author,200), url:str(source.url,2000), timestamp:str(source.timestamp,100), kind:['post','live','message'].includes(source.kind)?source.kind:'post', type:source.type==='image'?'image':'text', account:account?{platform:account.platform,handle:account.handle}:null, synthetic:sourceSynthetic(source,campaign.synthetic), originalSourceId:str(source.originalId||source.id,200), declaration:'provided-not-independently-verified'};
}

function cleanMetadata(value) {
  const v=value&&typeof value==='object'?value:{};
  const account=v.account&&typeof v.account==='object'?normalizeAccount(v.account,'',true):null;
  return {index:Number.isInteger(v.index)&&v.index>=0?v.index:null, author:str(v.author,200), url:str(v.url,2000), timestamp:str(v.timestamp,100), kind:['post','live','message'].includes(v.kind)?v.kind:'post', type:v.type==='image'?'image':'text', account:account?{platform:account.platform,handle:account.handle}:null, synthetic:v.synthetic===true, originalSourceId:str(v.originalSourceId,200), declaration:'provided-not-independently-verified'};
}

function cleanEvidence(value) {
  if(!value||typeof value!=='object'||typeof value.quote!=='string')return null;
  return {sourceId:str(value.sourceId,250),sourceIndex:Number.isInteger(value.sourceIndex)&&value.sourceIndex>=0?value.sourceIndex:null,sourceStamp:str(value.sourceStamp,160),quote:str(value.quote,5000),start:Number.isInteger(value.start)?value.start:null,end:Number.isInteger(value.end)?value.end:null,provenance:cleanMetadata(value.provenance)};
}

function resolveSource(campaign,reference) {
  if(!reference?.sourceStamp)return null;
  const sources=campaign.sources||[];
  const matches=sources.map((source,index)=>({source,index})).filter(({source})=>structuredSourceEligible(campaign,source)&&structuredSourceStamp(source,campaign)===reference.sourceStamp);
  const byId=matches.find(({source})=>source.id===reference.sourceId);
  if(byId)return byId;
  const byIndex=matches.find(({index})=>index===reference.sourceIndex);
  if(byIndex)return byIndex;
  return matches.length===1?matches[0]:null;
}

export function validateStructuredEvidence(campaign,value) {
  const evidence=cleanEvidence(value);
  if(!evidence||!evidence.quote.trim())return {valid:false,error:'Выберите точную цитату из источника.'};
  const resolved=resolveSource(campaign,evidence);
  if(!resolved)return {valid:false,error:'Источник отсутствует, изменился или не относится к этому делу.',evidence};
  const {source,index}=resolved;
  if(evidence.start===null||evidence.end===null||evidence.start<0||evidence.end<=evidence.start||source.text.slice(evidence.start,evidence.end)!==evidence.quote||evidence.end-evidence.start!==evidence.quote.length)return {valid:false,error:'Позиции и цитата не совпадают с текущим текстом источника.',evidence};
  return {valid:true,evidence:{...evidence,sourceId:source.id,sourceIndex:index,provenance:sourceMetadata(campaign,source,index)}};
}

export function makeStructuredEvidence(campaign,sourceId,quote,options={}) {
  if(typeof quote!=='string'||!quote.trim()||quote.length>5000)throw new Error('Нужна точная непустая цитата длиной до 5 000 символов.');
  const index=(campaign.sources||[]).findIndex(source=>source.id===sourceId);
  const source=campaign.sources?.[index];
  if(!structuredSourceEligible(campaign,source))throw new Error('Выберите источник, относящийся к этому делу.');
  let start=options.start;
  if(!Number.isInteger(start)) {
    start=source.text.indexOf(quote);
    if(start<0)throw new Error('Цитата должна точно совпадать с фрагментом выбранного источника.');
    if(source.text.indexOf(quote,start+1)>=0)throw new Error('Этот текст повторяется. Выделите нужный фрагмент в тексте источника.');
  }
  if(start<0||source.text.slice(start,start+quote.length)!==quote)throw new Error('Позиция цитаты не совпадает с текстом источника.');
  return {sourceId:source.id,sourceIndex:index,sourceStamp:structuredSourceStamp(source,campaign),quote,start,end:start+quote.length,provenance:sourceMetadata(campaign,source,index)};
}

function blankEditor(campaign) {
  const index=(campaign.sources||[]).findIndex(source=>structuredSourceEligible(campaign,source));
  const source=campaign.sources?.[index];
  return {status:'unclear',sourceId:source?.id||'',sourceIndex:index<0?null:index,sourceStamp:source?structuredSourceStamp(source,campaign):'',quote:'',start:null};
}

function cleanEditor(campaign,value,fallback) {
  const v=value&&typeof value==='object'?value:fallback;
  const result={status:validStatus(v?.status)?v.status:'unclear',sourceId:str(v?.sourceId,250),sourceIndex:Number.isInteger(v?.sourceIndex)&&v.sourceIndex>=0?v.sourceIndex:null,sourceStamp:str(v?.sourceStamp,160),quote:str(v?.quote,5000),start:Number.isInteger(v?.start)&&v.start>=0?v.start:null};
  const resolved=resolveSource(campaign,result);
  if(resolved){result.sourceId=resolved.source.id;result.sourceIndex=resolved.index;}
  return result;
}

function cleanCondition(campaign,value) {
  const v=value&&typeof value==='object'?value:{};
  const evidence=cleanEvidence(v.evidence);
  const checked=evidence?validateStructuredEvidence(campaign,evidence):null;
  const editorFallback=evidence?{status:v.status,...evidence}:blankEditor(campaign);
  return {status:validStatus(v.status)?v.status:'unclear',reviewed:v.reviewed===true&&validStatus(v.status),evidence:checked?.valid?checked.evidence:evidence,editor:cleanEditor(campaign,v.editor,editorFallback)};
}

export function createStructuredDraft(campaign,previous=null) {
  const old=previous&&typeof previous==='object'?previous:{};
  const conditions=Object.fromEntries(structuredConditionKeys.map(key=>{
    const condition=cleanCondition(campaign,old.conditions?.[key]);
    const valid=condition.evidence?validateStructuredEvidence(campaign,condition.evidence):null;
    const priorEditor=old.type==='structured-review-draft'?condition.editor:null;
    const editorSource=priorEditor?resolveSource(campaign,priorEditor):null;
    const editor=editorSource?{...priorEditor,sourceId:editorSource.source.id,sourceIndex:editorSource.index}:valid?.valid?{status:condition.status,...valid.evidence}:{...blankEditor(campaign),...(priorEditor?{quote:priorEditor.quote,start:null,status:priorEditor.status}:{})};
    return [key,{status:condition.status,reviewed:false,evidence:valid?.valid?valid.evidence:null,editor}];
  }));
  return {schemaVersion:1,type:'structured-review-draft',materialStamp:materialStamp(campaign),engineVersion:ENGINE_VERSION,conditions,humanRisk:validRisk(old.humanRisk)?old.humanRisk:'',note:str(old.note),step:0,updatedAt:new Date().toISOString()};
}

export function normalizeStructuredDraft(campaign,value) {
  if(!value||typeof value!=='object'||value.schemaVersion!==1||value.type!=='structured-review-draft')return null;
  return {schemaVersion:1,type:'structured-review-draft',materialStamp:str(value.materialStamp,160),engineVersion:str(value.engineVersion,80),conditions:Object.fromEntries(structuredConditionKeys.map(key=>[key,cleanCondition(campaign,value.conditions?.[key])])),humanRisk:validRisk(value.humanRisk)?value.humanRisk:'',note:str(value.note),step:Number.isInteger(value.step)?Math.max(0,Math.min(3,value.step)):0,updatedAt:validDate(value.updatedAt)};
}

export function structuredDraftCurrent(campaign,draft) {
  return !!draft && draft.materialStamp===materialStamp(campaign) && draft.engineVersion===ENGINE_VERSION;
}

export function updateStructuredDraft(campaign,previous,patch={}) {
  const draft=normalizeStructuredDraft(campaign,previous)||createStructuredDraft(campaign);
  if(own(patch,'step'))draft.step=Number.isInteger(patch.step)?Math.max(0,Math.min(3,patch.step)):draft.step;
  if(own(patch,'humanRisk'))draft.humanRisk=validRisk(patch.humanRisk)?patch.humanRisk:'';
  if(own(patch,'note'))draft.note=str(patch.note);
  const key=patch.key;
  if(structuredConditionKeys.includes(key)&&patch.editor&&typeof patch.editor==='object') {
    const condition=draft.conditions[key],editor={...condition.editor,...patch.editor};
    if(own(patch.editor,'sourceId')) {
      const index=(campaign.sources||[]).findIndex(source=>source.id===patch.editor.sourceId&&structuredSourceEligible(campaign,source));
      const source=campaign.sources?.[index];
      editor.sourceId=source?.id||'';editor.sourceIndex=index<0?null:index;editor.sourceStamp=source?structuredSourceStamp(source,campaign):'';
      if(editor.sourceId!==condition.editor.sourceId&&!own(patch.editor,'quote')){editor.quote='';editor.start=null;}
    }
    if(own(patch.editor,'quote')&&!own(patch.editor,'start'))editor.start=null;
    condition.editor=cleanEditor(campaign,editor,blankEditor(campaign));
    condition.reviewed=false;
  }
  draft.updatedAt=new Date().toISOString();
  return draft;
}

export function commitStructuredCondition(campaign,previous,key,values=null) {
  if(!structuredConditionKeys.includes(key))throw new Error('Неизвестный признак.');
  let draft=normalizeStructuredDraft(campaign,previous)||createStructuredDraft(campaign);
  if(!structuredDraftCurrent(campaign,draft))throw new Error('Материалы или правила изменились. Обновите черновик и проверьте три признака заново.');
  if(values)draft=updateStructuredDraft(campaign,draft,{key,editor:values});
  const editor=draft.conditions[key].editor;
  let evidence=null;
  if(editor.quote.trim())evidence=makeStructuredEvidence(campaign,editor.sourceId,editor.quote,{start:editor.start});
  if(editor.status==='confirmed'&&!evidence)throw new Error('Подтверждение требует точной цитаты из выбранного источника.');
  draft.conditions[key]={status:editor.status,reviewed:true,evidence,editor};
  draft.step=Math.min(3,structuredConditionKeys.indexOf(key)+1);
  draft.updatedAt=new Date().toISOString();
  return draft;
}

function conditionErrors(campaign,conditions) {
  const errors=[];
  for(const key of structuredConditionKeys) {
    const condition=conditions?.[key];
    if(!condition?.reviewed)errors.push(`${structuredConditionLabels[key]}: сохраните ручную проверку.`);
    if(!validStatus(condition?.status))errors.push(`${structuredConditionLabels[key]}: выберите статус.`);
    if(condition?.status==='confirmed'&&!condition.evidence)errors.push(`${structuredConditionLabels[key]}: нужна точная цитата.`);
    if(condition?.evidence&&!validateStructuredEvidence(campaign,condition.evidence).valid)errors.push(`${structuredConditionLabels[key]}: цитата или её источник изменились.`);
  }
  return errors;
}

export function validateStructuredDraft(campaign,value) {
  const draft=normalizeStructuredDraft(campaign,value);
  if(!draft)return {valid:false,errors:['Черновик ручной проверки отсутствует.']};
  const errors=conditionErrors(campaign,draft.conditions);
  if(!structuredDraftCurrent(campaign,draft))errors.unshift('Материалы или правила изменились. Обновите черновик и проверьте три признака заново.');
  if(!validRisk(draft.humanRisk))errors.push('Выберите ручной приоритет проверки.');
  if(draft.note.trim().length<4)errors.push('Добавьте комментарий с основанием своего вывода (не менее 4 символов).');
  if(draft.humanRisk==='high'&&structuredOriginalConflict(campaign))errors.push('Разные исходные ID розыгрышей нельзя суммировать для высокого ручного приоритета. Создайте раздельные копии и проверьте каждую.');
  if(draft.humanRisk==='high'&&!structuredConditionKeys.every(key=>draft.conditions[key].status==='confirmed'))errors.push('Для высокого ручного приоритета подтвердите приз, обязательную оплату участия и случайный выбор точными цитатами.');
  return {valid:errors.length===0,errors,draft};
}

function cleanReviewEntry(campaign,value) {
  if(!value||typeof value!=='object'||value.schemaVersion!==1||value.type!=='structured-review'||!validRisk(value.humanRisk))return null;
  return {schemaVersion:1,type:'structured-review',at:validDate(value.at),materialStamp:str(value.materialStamp,160),engineVersion:str(value.engineVersion,80),automaticRisk:validRisk(value.automaticRisk)?value.automaticRisk:'',humanRisk:value.humanRisk,note:str(value.note),conditions:Object.fromEntries(structuredConditionKeys.map(key=>{const condition=cleanCondition(campaign,value.conditions?.[key]);return [key,{status:condition.status,reviewed:condition.reviewed,evidence:condition.evidence}];})),sourceCount:Number.isInteger(value.sourceCount)&&value.sourceCount>=0?value.sourceCount:null,activeReviewMs:cleanTime(value.activeReviewMs),provenance:'local-user-review-not-independently-validated'};
}

export function normalizeStructuredReview(campaign,value) {
  const review=cleanReviewEntry(campaign,value);
  return review?{...review,history:Array.isArray(value.history)?value.history.slice(-100).map(entry=>cleanReviewEntry(campaign,entry)).filter(Boolean):[]}:null;
}

export function isStructuredReviewCurrent(campaign,value) {
  const review=normalizeStructuredReview(campaign,value);
  if(!review||!review.at||review.materialStamp!==materialStamp(campaign)||review.engineVersion!==ENGINE_VERSION||review.sourceCount!==campaign.sources?.length||review.note.trim().length<4)return false;
  if(conditionErrors(campaign,review.conditions).length)return false;
  return review.humanRisk!=='high'||(!structuredOriginalConflict(campaign)&&structuredConditionKeys.every(key=>review.conditions[key].status==='confirmed'));
}

export function recordStructuredReview(campaign,previous,value,options={}) {
  const checked=validateStructuredDraft(campaign,value);
  if(!checked.valid)throw new Error(checked.errors.join('\n'));
  const old=normalizeStructuredReview(campaign,previous),draft=checked.draft;
  return {schemaVersion:1,type:'structured-review',at:new Date().toISOString(),materialStamp:materialStamp(campaign),engineVersion:ENGINE_VERSION,automaticRisk:validRisk(campaign.analysis?.risk)?campaign.analysis.risk:'',humanRisk:draft.humanRisk,note:draft.note.trim(),conditions:Object.fromEntries(structuredConditionKeys.map(key=>{const condition=draft.conditions[key];return [key,{status:condition.status,reviewed:true,evidence:condition.evidence?validateStructuredEvidence(campaign,condition.evidence).evidence:null}];})),sourceCount:campaign.sources.length,activeReviewMs:cleanTime(options.activeReviewMs),provenance:'local-user-review-not-independently-validated',history:old?[...old.history,cleanReviewEntry(campaign,old)].slice(-100):[]};
}

export function structuredReviewReport(campaign,value,options={}) {
  const review=normalizeStructuredReview(campaign,value);
  if(!review)return '<section class="structured-review-report"><h2>Ручная проверка трёх признаков</h2><p>Структурированный ручной вывод ещё не сохранён.</p></section>';
  const current=isStructuredReviewCurrent(campaign,review);
  const entry=(record,history=false)=>`<article><h3>${history?'Предыдущая ручная оценка':'Ручной приоритет'}: ${esc(structuredRiskLabels[record.humanRisk])}</h3><p>${esc(record.at)} · Правила ${esc(record.engineVersion)} · Материалов ${esc(record.sourceCount??'не зафиксировано')}</p><p>Автоматический приоритет при сохранении: ${esc(structuredRiskLabels[record.automaticRisk]||'не зафиксирован')}. Ручная оценка хранится отдельно.</p><p class="pre">${esc(record.note)}</p>${structuredConditionKeys.map(key=>{const condition=record.conditions[key],evidence=condition.evidence,valid=evidence?validateStructuredEvidence(campaign,evidence).valid:false;return `<section><h4>${esc(structuredConditionLabels[key])} · ${esc(structuredStatusLabels[condition.status])}${condition.reviewed?'':' · не просмотрено'}</h4>${evidence?`<blockquote>${esc(evidence.quote)}</blockquote><p class="muted">Источник ${evidence.sourceIndex===null?'не указан':evidence.sourceIndex+1} · Позиции ${esc(evidence.start)}–${esc(evidence.end)} (индексы UTF-16) · ${valid?'точный фрагмент текущего текста':'историческая цитата, не подтверждена текущими материалами'}</p><p class="muted">${esc(evidence.provenance.author||'Автор не указан')} · ${evidence.provenance.synthetic?'синтетический источник':'источник предоставлен пользователем'}${evidence.provenance.url?' · '+esc(evidence.provenance.url):''}</p>`:'<p>Цитата не приложена. «Не подтверждено» означает отсутствие подтверждения в рассмотренных материалах.</p>'}</section>`;}).join('')}${record.activeReviewMs!==null?`<p class="muted">Видимая сессия: ${Math.round(record.activeReviewMs/1000)} с. Это не измерение выигрыша времени.</p>`:''}</article>`;
  return `<section class="structured-review-report"><h2>Ручная проверка трёх признаков</h2><p class="notice">${current?'Относится к текущим материалам и версии правил.':'Нужна повторная проверка: материалы, версия правил или точность ссылок изменились.'} Это локальная оценка признаков человеком, не правовая квалификация и не результат оценки качества автоматического детектора.</p>${entry(review)}${review.history.length?`<details><summary>История ручных оценок · ${review.history.length}</summary>${review.history.slice().reverse().map(item=>entry(item,true)).join('')}</details>`:''}<p class="muted">Принадлежность, подлинность и полнота источников отдельно не подтверждены. Запись и история редактируемы локально и не подписаны.</p>${options.includeData===false?'':`<script id="iz-structured-review" type="application/json">${safeJson({format:'iz-structured-review',schemaVersion:1,review})}</script>`}</section>`;
}

export function parseStructuredReviewReport(html,campaign) {
  if(typeof html!=='string'||html.length>30*1024*1024)throw new Error('Ожидается локальный HTML-отчёт ІЗ размером до 30 МБ.');
  const matches=[...html.matchAll(/<script\b[^>]*\bid=["']iz-structured-review["'][^>]*>([\s\S]*?)<\/script\s*>/gi)];
  if(matches.length!==1)throw new Error('В отчёте нужна одна запись ручной проверки ІЗ.');
  let data;try{data=JSON.parse(matches[0][1]);}catch{throw new Error('Повреждены данные ручной проверки в HTML-отчёте.');}
  if(data?.format!=='iz-structured-review'||data.schemaVersion!==1)throw new Error('Неизвестный формат ручной проверки.');
  const review=normalizeStructuredReview(campaign,data.review);
  if(!review)throw new Error('В HTML-отчёте нет корректной ручной оценки.');
  return review;
}
