// Text-only draft records are serializable. File objects have a separate,
// in-memory lifetime and are never read, serialized or sent by this module.
export const INPUT_DRAFT_LIMITS=Object.freeze({drafts:100,text:60000,serializedCharacters:1000000,filesPerDraft:3,fileBytes:15*1024*1024,totalFileBytes:30*1024*1024});
const fields=Object.freeze({text:60000,title:120,organizer:100,url:2048,accountPlatform:20,accountHandle:40,sourceUrl:2048,sourceKind:20});
const keyValid=key=>typeof key==='string'&&/^(?:quick|modal):(?:new|[A-Za-z0-9_.-]{1,200})$/u.test(key);
const own=(value,key)=>!!value&&Object.hasOwn(value,key);
const validDate=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const copy=value=>value?{...value,fields:{...value.fields}}:null;
function normalizeRecord(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||value.schemaVersion!==1||!value.fields||typeof value.fields!=='object')return null;
  const result={schemaVersion:1,updatedAt:validDate(value.updatedAt)?value.updatedAt:'',fields:{}};
  for(const [name,max]of Object.entries(fields))if(typeof value.fields[name]==='string'){
    const text=value.fields[name].slice(0,max);
    if(name==='accountPlatform'&&!['instagram','tiktok'].includes(text))continue;
    if(name==='sourceKind'&&!['post','live','message'].includes(text))continue;
    result.fields[name]=text;
  }
  if(typeof value.previousText==='string')result.previousText=value.previousText.slice(0,INPUT_DRAFT_LIMITS.text);
  if(typeof value.exampleText==='string')result.exampleText=value.exampleText.slice(0,INPUT_DRAFT_LIMITS.text);
  return result;
}
function assertBounds(value){
  if(Object.keys(value).length>INPUT_DRAFT_LIMITS.drafts)throw new Error('Сохранено 100 черновиков. Завершите или удалите один, прежде чем создавать новый.');
  if(JSON.stringify(value).length>INPUT_DRAFT_LIMITS.serializedCharacters)throw new Error('Черновики превысили локальный лимит. Скачайте нужные материалы и удалите завершённые черновики.');
}
export function normalizeInputDrafts(value){
  if(value===undefined||value===null)return {};
  if(typeof value!=='object'||Array.isArray(value))throw new Error('Неверный формат черновиков. Исходный снимок нужно сохранить до восстановления.');
  if(Object.keys(value).length>INPUT_DRAFT_LIMITS.drafts)throw new Error('В исходном снимке больше 100 черновиков. Сохраните его до восстановления.');
  const result={};
  for(const [key,record]of Object.entries(value)){
    if(!keyValid(key))throw new Error('В сохранённых черновиках есть неизвестный ключ. Сохраните исходный снимок до восстановления.');
    const clean=normalizeRecord(record);if(!clean)throw new Error('Повреждён текстовый черновик. Сохраните исходный снимок до восстановления.');
    result[key]=clean;
  }
  assertBounds(result);return result;
}
export function inputDraftConflict(current,incoming,{hasFiles=false}={}){
  if(!current)return false;
  const a=normalizeRecord(current),b=normalizeRecord(incoming);
  if(!a||!b)throw new Error('Неверный формат черновика при восстановлении.');
  const content=value=>({fields:value.fields,previousText:value.previousText||'',exampleText:value.exampleText||''});
  if(JSON.stringify(content(a))===JSON.stringify(content(b)))return false;
  const meaningful=Object.entries(a.fields).some(([key,value])=>value!==''&&!(key==='accountPlatform'&&value==='instagram')&&!(key==='sourceKind'&&value==='post'))||!!a.previousText||!!a.exampleText;
  return meaningful||hasFiles;
}
const control=(form,name)=>{
  if(!form||!own(fields,name))return null;
  try{return form.elements?.namedItem?.(name)||form.querySelector?.(`[name="${name}"]`)||null;}catch{return null;}
};
const usable=element=>element&&typeof element.value==='string'&&!['file','password','hidden','checkbox','radio','submit','button'].includes(element.type)&&!element.readOnly;

export function createInputDraftStore(initial={},options={}){
  const records=new Map(Object.entries(normalizeInputDrafts(initial))),fileRecords=new Map();
  const notify=(key,value)=>options.onDraft?.(key,copy(value));
  const snapshot=()=>Object.fromEntries([...records].map(([key,value])=>[key,copy(value)]));
  const get=key=>copy(records.get(key));
  const set=(key,value)=>{
    if(!keyValid(key))throw new Error('Неизвестная форма черновика.');
    const clean=normalizeRecord(value);if(!clean)throw new Error('Нужен текстовый черновик версии 1.');
    if(new Set([...records.keys(),...fileRecords.keys(),key]).size>INPUT_DRAFT_LIMITS.drafts)throw new Error('Сохранено 100 черновиков. Завершите или удалите один, прежде чем создавать новый.');
    const previous=records.get(key),same=previous&&JSON.stringify({...previous,updatedAt:''})===JSON.stringify({...clean,updatedAt:''});
    if(same)return copy(previous);
    clean.updatedAt=new Date().toISOString();
    const next={...snapshot(),[key]:clean};assertBounds(next);
    records.set(key,clean);notify(key,clean);return copy(clean);
  };
  const readForm=(form,key)=>{
    if(!keyValid(key))throw new Error('Неизвестная форма черновика.');
    const draft=get(key)||{schemaVersion:1,updatedAt:'',fields:{}};
    for(const name of Object.keys(fields)){const element=control(form,name);if(usable(element))draft.fields[name]=element.value;}
    return draft;
  };
  const capture=(form,key)=>set(key,readForm(form,key));
  const restore=(form,key)=>{
    const draft=get(key);if(!draft)return false;
    for(const [name,value]of Object.entries(draft.fields)){const element=control(form,name);if(usable(element))element.value=value;}
    return true;
  };
  const clear=key=>{
    if(!keyValid(key))return false;
    const had=records.delete(key)||fileRecords.has(key);fileRecords.delete(key);if(had)notify(key,null);return had;
  };
  const getFiles=key=>[...(fileRecords.get(key)||[])];
  const setFiles=(key,value)=>{
    if(!keyValid(key))throw new Error('Неизвестная форма файлового черновика.');
    const list=Array.from(value||[]);
    if(list.length&&new Set([...records.keys(),...fileRecords.keys(),key]).size>INPUT_DRAFT_LIMITS.drafts)throw new Error('В памяти уже 100 черновиков. Завершите или удалите один.');
    if(list.length>INPUT_DRAFT_LIMITS.filesPerDraft)throw new Error('В черновике можно держать до 3 файлов.');
    for(const file of list){
      if(typeof File==='function'&&!(file instanceof File)||!file||typeof file!=='object'||typeof file.name!=='string'||!Number.isFinite(file.size)||file.size<0||file.size>INPUT_DRAFT_LIMITS.fileBytes)throw new Error('Нужны исходные File-объекты размером до 15 МБ; сериализованные файлы не восстанавливаются.');
    }
    const total=[...fileRecords].filter(([other])=>other!==key).reduce((sum,[,items])=>sum+items.reduce((n,file)=>n+file.size,0),0)+list.reduce((sum,file)=>sum+file.size,0);
    if(total>INPUT_DRAFT_LIMITS.totalFileBytes)throw new Error('В памяти уже 30 МБ файловых черновиков. Завершите другую проверку, прежде чем добавлять файлы.');
    if(list.length)fileRecords.set(key,list);else fileRecords.delete(key);return getFiles(key);
  };
  const useExample=(form,key,text)=>{
    if(typeof text!=='string'||text.length>INPUT_DRAFT_LIMITS.text)throw new Error('Пример должен быть текстом длиной до 60 000 символов.');
    const draft=readForm(form,key),current=draft.fields.text||'';
    if(current&&current!==text&&current!==draft.exampleText)draft.previousText=current;
    draft.fields.text=text;draft.exampleText=text;const result=set(key,draft);restore(form,key);return result;
  };
  const restorePrevious=(form,key)=>{
    const draft=get(key);if(!draft||typeof draft.previousText!=='string')return false;
    draft.fields.text=draft.previousText;delete draft.previousText;delete draft.exampleText;set(key,draft);restore(form,key);return true;
  };
  return {get,set,capture,restore,clear,snapshot,getFiles,setFiles,useExample,restorePrevious,hasPrevious:key=>typeof records.get(key)?.previousText==='string',hasFiles:()=>fileRecords.size>0};
}

export function installInputDraftEvents(options={}){
  const root=options.root||globalThis.document,store=options.store;
  if(!root?.addEventListener||typeof options.getKey!=='function'||typeof store?.capture!=='function')throw new Error('Нужны стабильный DOM root, store и getKey(form).');
  const listener=event=>{
    const target=event.target,form=target?.form||target?.closest?.('form');
    if(!form||!own(fields,target?.name)||!usable(target))return;
    try{const key=options.getKey(form);if(key)store.capture(form,key);}catch(error){options.onError?.(error);}
  };
  root.addEventListener('input',listener);root.addEventListener('change',listener);
  return ()=>{root.removeEventListener('input',listener);root.removeEventListener('change',listener);};
}
