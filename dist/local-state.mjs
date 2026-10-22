import {normalizeInputDrafts} from './input-drafts.mjs?v=20261023-final-1';
export const emptyLocalState=()=>({campaigns:[],reviews:{},structuredReviews:{},structuredDrafts:{},inputDrafts:{}});
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export function decodeLocalState(raw){
 if(raw===null)return emptyLocalState();
 const value=JSON.parse(raw);
 if(!record(value)||!Array.isArray(value.campaigns))throw new Error('Неизвестный формат локальных данных.');
 const ids=new Set();
 for(const c of value.campaigns){
  if(!record(c)||typeof c.id!=='string'||!c.id||ids.has(c.id)||typeof c.title!=='string'||!Array.isArray(c.sources)||!c.sources.length)throw new Error('Повреждена структура сохранённых дел.');
  ids.add(c.id);const sourceIds=new Set();
  for(const s of c.sources){if(!record(s)||typeof s.id!=='string'||!s.id||sourceIds.has(s.id)||typeof s.text!=='string')throw new Error('Повреждён сохранённый материал.');sourceIds.add(s.id);}
 }
 const result={campaigns:value.campaigns};
 for(const key of ['reviews','structuredReviews','structuredDrafts']){
  if(value[key]!==undefined&&!record(value[key]))throw new Error('Повреждён словарь решений или черновиков.');
  result[key]=value[key]||{};
 }
 result.inputDrafts=normalizeInputDrafts(value.inputDrafts);
 return result;
}
