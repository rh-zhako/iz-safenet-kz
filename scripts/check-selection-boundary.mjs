import assert from 'node:assert/strict';import {writeFileSync,readFileSync} from 'node:fs';import {analyzeText,ENGINE_VERSION} from '../dist/engine.mjs';
const checks=[];const base='Разыгрываем телефон. Для участия оплатите билет 3000 тенге. Победителя определит колесо фортуны. ';
function check(name,text,expected,judged){try{const a=analyzeText(text).analysis;assert.equal(a.risk,expected);assert.equal(a.context.atoms.some(v=>v.feature==='judged'&&v.accepted),judged);for(const s of Object.values(a.signals))for(const e of s.evidence)assert.equal(text.slice(e.start,e.end),e.quote);checks.push({name,passed:true});}catch(e){checks.push({name,passed:false,message:e.message});}}
check('actual OCR capture financial percentage is not a jury',readFileSync(new URL('../evaluation/fixtures/ru-actual.txt',import.meta.url),'utf8'),'high',false);
check('financial commission ten percent',base+'Комиссия организатора 10 процентов.','high',false);
check('financial commission another percentage',base+'Комиссия организатора — 7 процентов.','high',false);
check('commission assessment of works is still judged','Разыгрываем телефон. Для участия оплатите билет 3000 тенге. Комиссия оценивает работы и выбирает победителя.','low',true);
check('jury grading with percent stays judged','Разыгрываем телефон. Для участия оплатите билет 3000 тенге. Комиссия оценивает работы, итог выражается в процентах.','low',true);
check('random draw plus genuine jury is still a conflict',base+'Комиссия оценивает работы и выбирает победителя.','medium',true);
const report={engineVersion:ENGINE_VERSION,scope:'Word-boundary regression from a controlled OCR-flow example, not a fresh accuracy estimate.',passed:checks.filter(c=>c.passed).length,total:checks.length,checks};writeFileSync(new URL('../evaluation/selection-boundary-checks.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(report.passed!==report.total)process.exitCode=1;
