// Explicit, post-render helpers. No listeners, timers or automatic focus changes.
// The caller schedules requestAnimationFrame after replacing the relevant DOM.
const docFor=root=>root?.nodeType===9?root:root?.ownerDocument||globalThis.document;
const rootFor=options=>options?.root||globalThis.document;
const query=(root,selector)=>{
  if(!root||typeof selector!=='string'||!selector||selector.length>1000)return null;
  try{return root.querySelector(selector);}catch{return null;}
};

function focusElement(element,root,options={}) {
  if(!element||typeof element.focus!=='function'||element.isConnected===false||element.hidden||element.inert||element.disabled||element.type==='hidden'||element.getAttribute?.('aria-disabled')==='true')return false;
  if(element.closest?.('[hidden], [inert], [aria-hidden="true"]'))return false;
  const doc=docFor(root);
  if(root!==doc&&typeof root?.contains==='function'&&!root.contains(element))return false;
  if(typeof element.getClientRects==='function'&&!element.getClientRects().length)return false;
  // A user can focus another field between render and the scheduled frame.
  // Leave that focus alone unless an explicit caller deliberately forces it.
  const active=doc?.activeElement;
  if(!options.force&&active&&active!==element&&active!==doc.body&&active!==doc.documentElement&&active.isConnected!==false)return false;
  const native=element.matches?.('a[href], area[href], button, input, select, textarea, summary, iframe, [contenteditable="true"], [contenteditable=""]');
  if(!element.hasAttribute?.('tabindex')&&!native)element.setAttribute?.('tabindex','-1');
  try{element.focus({preventScroll:options.preventScroll!==false});}catch{return false;}
  return doc&&'activeElement'in doc?doc.activeElement===element:true;
}

export function focusMain(options={}) {
  const root=rootFor(options),main=query(root,'main');
  return focusElement(query(main,'h1')||main,root,options);
}

export function focusStructuredStep(options={}) {
  const root=rootFor(options),panel=query(root,'[data-structured-review]');
  return focusElement(query(panel,'h3')||query(panel,'h2')||panel,root,options);
}

export function focusSourceCard(id,options={}) {
  if(typeof id!=='string'||!id||id.length>500)return false;
  const root=rootFor(options),doc=docFor(root),target=doc?.getElementById?.('source-'+id);
  // getElementById keeps imported IDs out of a CSS selector.
  if(!target?.matches?.('.source-card'))return false;
  return focusElement(target,root,options);
}

export function restoreControlFocus(selector,options={}) {
  const root=rootFor(options);
  return focusElement(query(root,selector),root,options);
}
