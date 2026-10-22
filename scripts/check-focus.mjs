import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {focusMain,focusStructuredStep,focusSourceCard,restoreControlFocus} from '../dist/focus.mjs';

// Minimal deterministic DOM doubles. Browser keyboard behavior is checked
// separately; these assertions cover helper guards and declared color pairs.
const checks=[],check=(name,run)=>{try{run();checks.push({name,passed:true});}catch(error){checks.push({name,passed:false,message:error.message});}};
class Element {
  constructor(doc,tag='DIV',id=''){this.ownerDocument=doc;this.tagName=tag;this.id=id;this.isConnected=true;this.attrs=new Map();this.queries=new Map();this.children=new Set();this.visible=true;}
  querySelector(selector){if(selector==='[')throw new Error('invalid selector');return this.queries.get(selector)||null;}
  closest(){return this.blockedAncestor?{}:null;}
  contains(element){return this===element||this.children.has(element);}
  getClientRects(){return this.visible?[{}]:[];}
  getAttribute(key){return this.attrs.get(key)??null;}
  hasAttribute(key){return this.attrs.has(key);}
  setAttribute(key,value){this.attrs.set(key,String(value));}
  matches(selector){if(selector==='.source-card')return this.sourceCard===true;return ['BUTTON','INPUT','SELECT','TEXTAREA','SUMMARY','IFRAME'].includes(this.tagName)||this.tagName==='A'&&this.attrs.has('href');}
  focus(options){this.lastFocus=options;this.ownerDocument.activeElement=this;}
}
const fixture=()=>{
  const doc={nodeType:9,queries:new Map(),ids:new Map(),querySelector(selector){if(selector==='[')throw new Error('invalid selector');return this.queries.get(selector)||null;},getElementById(id){return this.ids.get(id)||null;}};
  const body=new Element(doc,'BODY'),html=new Element(doc,'HTML'),main=new Element(doc,'MAIN'),h1=new Element(doc,'H1'),panel=new Element(doc,'SECTION'),step=new Element(doc,'H3'),control=new Element(doc,'BUTTON'),source=new Element(doc,'ARTICLE','source-alpha');
  source.sourceCard=true;doc.body=body;doc.documentElement=html;doc.activeElement=body;
  doc.queries.set('main',main);main.queries.set('h1',h1);doc.queries.set('[data-structured-review]',panel);panel.queries.set('h3',step);doc.queries.set('[data-filter="high"]',control);doc.ids.set(source.id,source);
  return {doc,body,main,h1,panel,step,control,source};
};
check('main heading receives explicit focus and negative tabindex',()=>{const f=fixture();assert.equal(focusMain({root:f.doc}),true);assert.equal(f.doc.activeElement,f.h1);assert.equal(f.h1.getAttribute('tabindex'),'-1');assert.deepEqual(f.h1.lastFocus,{preventScroll:true});});
check('main is a fallback when no heading exists',()=>{const f=fixture();f.main.queries.clear();assert.equal(focusMain({root:f.doc}),true);assert.equal(f.doc.activeElement,f.main);});
check('structured step heading receives focus',()=>{const f=fixture();assert.equal(focusStructuredStep({root:f.doc}),true);assert.equal(f.doc.activeElement,f.step);assert.equal(f.step.getAttribute('tabindex'),'-1');});
check('structured title is a fallback before a step is available',()=>{const f=fixture(),h2=new Element(f.doc,'H2');f.panel.queries.clear();f.panel.queries.set('h2',h2);assert.equal(focusStructuredStep({root:f.doc}),true);assert.equal(f.doc.activeElement,h2);});
check('source card uses exact ID and adds negative tabindex',()=>{const f=fixture();assert.equal(focusSourceCard('alpha',{root:f.doc}),true);assert.equal(f.doc.activeElement,f.source);assert.equal(f.source.getAttribute('tabindex'),'-1');});
check('source ID is never interpreted as a CSS selector',()=>{const f=fixture(),id='alpha"] [data-test="other';f.doc.ids.set('source-'+id,f.source);assert.equal(focusSourceCard(id,{root:f.doc}),true);});
check('source helper refuses an unrelated element with a colliding ID',()=>{const f=fixture();f.source.sourceCard=false;assert.equal(focusSourceCard('alpha',{root:f.doc}),false);});
check('control selector restores focus without changing its tabindex',()=>{const f=fixture();f.control.setAttribute('tabindex','0');assert.equal(restoreControlFocus('[data-filter="high"]',{root:f.doc}),true);assert.equal(f.control.getAttribute('tabindex'),'0');});
check('existing heading tabindex is respected',()=>{const f=fixture();f.h1.setAttribute('tabindex','-1');assert.equal(focusMain({root:f.doc}),true);assert.equal(f.h1.getAttribute('tabindex'),'-1');});
check('new user focus is not stolen by a scheduled helper',()=>{const f=fixture(),input=new Element(f.doc,'TEXTAREA');f.doc.activeElement=input;assert.equal(focusMain({root:f.doc}),false);assert.equal(f.doc.activeElement,input);});
check('explicit force is available for a deliberate user navigation',()=>{const f=fixture();f.doc.activeElement=f.control;assert.equal(focusMain({root:f.doc,force:true}),true);assert.equal(f.doc.activeElement,f.h1);});
check('disconnected old focus does not block restored navigation focus',()=>{const f=fixture(),old=new Element(f.doc,'BUTTON');old.isConnected=false;f.doc.activeElement=old;assert.equal(focusMain({root:f.doc}),true);});
check('caller can allow scrolling when focus is the intended scroll target',()=>{const f=fixture();assert.equal(focusSourceCard('alpha',{root:f.doc,preventScroll:false}),true);assert.deepEqual(f.source.lastFocus,{preventScroll:false});});
check('hidden or detached targets are skipped',()=>{for(const flag of ['hidden','inert','disabled']){const f=fixture();f.h1[flag]=true;assert.equal(focusMain({root:f.doc}),false);}const f=fixture();f.h1.isConnected=false;assert.equal(focusMain({root:f.doc}),false);});
check('aria disabled targets and hidden ancestors are skipped',()=>{const f=fixture();f.h1.setAttribute('aria-disabled','true');assert.equal(focusMain({root:f.doc}),false);f.h1.attrs.clear();f.h1.blockedAncestor=true;assert.equal(focusMain({root:f.doc}),false);});
check('targets with no rendered rectangle are skipped',()=>{const f=fixture();f.source.visible=false;assert.equal(focusSourceCard('alpha',{root:f.doc}),false);});
check('source outside a supplied subtree cannot receive focus',()=>{const f=fixture(),subtree=new Element(f.doc);assert.equal(focusSourceCard('alpha',{root:subtree}),false);subtree.children.add(f.source);assert.equal(focusSourceCard('alpha',{root:subtree}),true);});
check('invalid and missing selectors fail safely',()=>{const f=fixture();assert.equal(restoreControlFocus('[',{root:f.doc}),false);assert.equal(restoreControlFocus('#missing',{root:f.doc}),false);assert.equal(focusSourceCard('',{root:f.doc}),false);});
check('helpers are safe without browser globals',()=>{assert.equal(focusMain(),false);assert.equal(focusStructuredStep(),false);assert.equal(focusSourceCard('missing'),false);assert.equal(restoreControlFocus('button'),false);});

const css=readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8');
const declarationsCss=css.replace(/\/\*[\s\S]*?\*\//g,'');
const declaration=(selector,property)=>{
  let value;
  for(const match of declarationsCss.matchAll(/([^{}]+)\{([^{}]*)\}/g))if(match[1].trim().split(',').map(v=>v.trim()).includes(selector)){
    // Walk declarations so a later rule may override only one property.
    for(const decl of match[2].split(';')){const colon=decl.indexOf(':');if(colon>=0&&decl.slice(0,colon).trim()===property)value=decl.slice(colon+1).trim();}
  }
  return value;
};
const hex=value=>{assert.match(value,/^#[\da-f]{3}(?:[\da-f]{3})?$/i);return value.length===4?'#'+value.slice(1).split('').map(c=>c+c).join(''):value;};
const luminance=value=>{
  const [r,g,b]=hex(value).slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return .2126*r+.7152*g+.0722*b;
};
const ratio=(a,b)=>{const aa=luminance(a),bb=luminance(b);return (Math.max(aa,bb)+.05)/(Math.min(aa,bb)+.05);};
const contrast=[];
const pair=(name,selector,background)=>{
  const foreground=declaration(selector,'color'),value=ratio(foreground,background);
  contrast.push({name,selector,foreground,background,ratio:Number(value.toFixed(3)),required:4.5});
  assert.ok(value>=4.5,`${name}: ${value.toFixed(2)} < 4.5`);
};
check('declared evidence quotes and unknown headings have at least 4.5 contrast',()=>{
  pair('quoted evidence','.plain-reason blockquote',declaration('.plain-reasons','background'));
  pair('unknown condition','.plain-reason.unknown h3',declaration('.plain-reasons','background'));
  pair('provided material text','.plain-material p',declaration('.plain-material','background'));
  pair('material OCR warning','.plain-material small',declaration('.plain-material','background'));
});
check('declared privacy scope and relationship limits have at least 4.5 contrast',()=>{
  const bg=declaration(':root','--bg');
  for(const selector of ['.consumer-limit','.quick-scope','.simple-footer','.simple-legal-links span'])pair(selector,selector,bg);
  for(const selector of ['.quick-private','.quick-data-note','.quick-upload-row>span'])pair(selector,selector,declaration('.quick-form','background'));
  pair('relationship limitation','.relations-limit',declaration('.account-relations','background'));
  pair('about limitations','.about-limits p',declaration('.about-limits','background'));
  pair('source notes','.origin-grid .field small',declaration('.quick-form','background'));
});
check('declared verdict body text and labels meet 4.5 on all four surfaces',()=>{
  for(const suffix of ['', '.danger','.calm','.neutral']){
    const selector='.verdict-hero'+suffix,bg=declaration(selector,'background');
    pair('verdict label '+(suffix||'caution'),selector,bg);
    pair('verdict explanation '+(suffix||'caution'),selector+'>p',bg);
  }
  assert.equal(declaration('.consumer-demo-tag','opacity'),'1');
});
check('structured notes and input placeholders meet 4.5 on their light surfaces',()=>{
  for(const background of ['#ffffff','#f1f6fd','#fff7e8'])pair('structured muted '+background,'.sr-panel .sr-muted',background);
  pair('input placeholder','.quick-form>textarea::placeholder',declaration('.quick-form>textarea','background'));
});
const report={format:'iz-focus-checks-v1',createdAt:new Date().toISOString(),scope:'Deterministic helper contract checks with DOM doubles and WCAG relative-luminance calculations for declared CSS color pairs. This is not a complete accessibility audit or browser keyboard test.',focusSha256:createHash('sha256').update(readFileSync(new URL('../dist/focus.mjs',import.meta.url))).digest('hex'),total:checks.length,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length,contrastPairs:contrast,checks};
writeFileSync(new URL('../evaluation/focus-checks.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({total:report.total,passed:report.passed,failed:report.failed,contrastPairs:contrast.length,minContrast:Math.min(...contrast.map(c=>c.ratio))}));
if(report.failed){for(const c of checks.filter(c=>!c.passed))console.error(c.name+': '+c.message);process.exitCode=1;}
