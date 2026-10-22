import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {analyzeCampaign,analyzeText,ENGINE_VERSION} from '../dist/engine.mjs';
const checks=[],fixtures=[],sha=b=>createHash('sha256').update(b).digest('hex');
function check(name,fn){try{fn();checks.push({name,passed:true});}catch(e){checks.push({name,passed:false,message:e.message});}}
function quoted(c){const r=analyzeCampaign(c);for(const a of [...Object.values(r.analysis.signals).flatMap(s=>s.evidence),...r.analysis.context.atoms]){assert.ok(Number.isInteger(a.start)&&a.end>a.start);assert.equal(c.sources.find(s=>s.id===a.sourceId).text.slice(a.start,a.end),a.quote);}return r;}
function sample(name,text,risk,states={}){const c={id:`structural-${fixtures.length+1}`,synthetic:true,expectedRisk:risk,sources:[{id:'s',text}]};fixtures.push(c);check(name,()=>{const original=JSON.stringify(c),r=quoted(c);assert.equal(r.analysis.risk,risk);assert.equal(JSON.stringify(c),original);for(const[k,v]of Object.entries(states))assert.equal(r.analysis.signals[k].state,v);});}
for(const [name,text,risk,states]of[
 ['RU payment stem alternation','Приз — кубок. Участник оплачивает заявку. Победителя случайно выберет бот.','high'],
 ['RU restrictive purchase after comma','Приз — кубок. Для допуска к розыгрышу, купите тканевую сумку. Победитель случайный.','high'],
 ['KK service before admission clause','Жүлде — кубок. Қызметке ақылы тапсырып, тек түбіртек иелері ұтысқа қатысады. Жеңімпаз кездейсоқ.','high'],
 ['KK transliteration entry fee','Kubok utusyna qatysu bileti 360 tenge. Finalda kezdeisoq bir nomerdi tandaidy.','high'],
 ['KK transliteration free entry','Kubok utusyna qatysu tegin. Finalda kezdeisoq bir nomerdi tandaidy.','low',{payment:'unknown'}],
 ['transliteration ticket price with drawn recipient','Kubok utusyna qatysu bileti 360 tenge. Finalda kezdeisoq bir nomer alynady.','high'],
 ['required-payment exclusion','Приз — кубок. Без оплаты участника не вносят в список. Финальный победитель случайный.','high',{free:'unknown'}],
 ['required-payment exclusion with number','Приз — кубок. Без оплаты номер участника не присваивается. Победитель случайный.','high',{free:'unknown'}],
 ['absence of charges remains free','Розыгрыш кубка. Участие бесплатное, взносов нет. Победитель случайный.','low',{payment:'unknown'}],
 ['free followed by no purchases','Розыгрыш кубка. Участие полностью бесплатное: покупать ничего не нужно и взносов нет. Победитель случайный.','low'],
 ['KK question is not a payment obligation','Жүлде — кубок. Соманы төлеу міндетті ме деп сұраған. Жауап белгісіз. Жеңімпаз кездейсоқ.','medium',{payment:'unknown'}],
 ['KK unknown admission','Жүлде — кубок. Төлем мен өтінімнің байланысы түсіндірілмеген. Жеңімпаз кездейсоқ.','medium',{payment:'unknown'}],
 ['draft is not an active obligation','Приз — кубок. Черновик предлагает платный вход. Победитель случайный.','medium',{payment:'unknown'}],
 ['random group order is not the final winner','Приз — кубок. Для участия оплатите билет. Компьютер случайно распределит работы по группам. Итогового победителя определяет жюри.','low',{random:'unknown'}],
 ['random venue allocation is not a winner','Приз — кубок. Для участия оплатите билет. Система случайно назначает участникам дорожки. Финального победителя определяет жюри.','low',{random:'unknown'}],
 ['paid entry and free delivery are distinct','Приз — кубок. Для участия оплатите билет. Доставка бесплатная. Победитель случайный.','high'],
 ['optional extra purchase does not promise free entry','Жүлде — кубок. Қатысу үшін билет сатып алу міндетті. Көп билет сатып алу міндетті емес. Жеңімпаз кездейсоқ.','high',{free:'unknown'}],
 ['warning quoted offer is not promotion','Дәрісте «жарна төле де, кездейсоқ кубок ұт» деген бөгде жарнаманы талдаймыз. Өзіміз ұтыс өткізбейміз.','low'],
 ['no lottery income from fee','Приз — кубок. Участие платное. Победитель случайный.','high',{income:'unknown'}],
 ['OCR split raffle feature','Заявка на кубок идёт в розы-грыш только после взноса 360 тг. Победитель случайный.','high'],
 ['compound object name is untouched','Велосипедный шлем — товар. Его цена 360 тенге. Генератор создаёт случайный пароль.','low'],
 ['retail alone is not paid admission','Продаём керамическую чашку за 360 тенге. Рядом магазин случайных сувениров.','low'],
 ['declared free with amount for prize','Наш приз стоит 360 тенге. Участие бесплатно. Победитель случайный.','low',{payment:'unknown'}],
 ['free coupon reward is not a priced entry','Қатысу тегін. Қатысушылардың біреуіне 360 теңгелік купон кездейсоқ беріледі.','low',{payment:'unknown'}]
])sample(name,text,risk,states);
// Metamorphic checks use new objects, sums, casing, Unicode and IDs. All are
// developer-authored and explicitly open. They are not a second blind corpus.
for(const object of ['керамическую вазу','карточку мастерской','абонемент на кружок'])for(const amount of [1,360,99999]){
 const text=`🎁 Приз — кубок. Чтобы попасть в розыгрыш, купите ${object} за ${amount} тенге. Бот случайно выберет победителя.`;
 for(const[variant,body]of[['plain',text],['upper',text.toUpperCase()],['zero width',text.replace('случайно','слу\u200bчайно')]])sample(`object/amount/case invariance: ${object}, ${amount}, ${variant}`,body,'high');
}
check('conflicting original identities never produce high',()=>{const c={id:'work',sources:[{id:'a',text:'Приз — кубок.',originalCampaignRef:'one'},{id:'b',text:'Для участия оплатите билет. Победитель случайный.',originalCampaignRef:'two'}]};assert.equal(quoted(c).analysis.risk,'medium');});
check('foreign working reference is excluded',()=>{const c={id:'one',sources:[{id:'a',text:'Приз — кубок.',campaignRef:'one'},{id:'b',text:'Для участия оплатите билет. Победитель случайный.',campaignRef:'two'}]};assert.equal(quoted(c).analysis.risk,'low');});
check('long text normalization preserves exact original UTF-16 evidence',()=>{const text='🧭 '.repeat(2000)+' Kubok utusyna qatysu bileti 360 tenge. Finalda kezdeisoq bir nomer alynady.';quoted({id:'long',sources:[{id:'s',text}]});});
check('old engine differs, stored review invalidation is automatic',()=>assert.notEqual(ENGINE_VERSION,'1.7.0-track1-evidence'));
const report={schemaVersion:1,status:'OPEN_DEVELOPMENT_NOT_INDEPENDENT',engineVersion:ENGINE_VERSION,engineSha256:sha(readFileSync(new URL('../dist/engine.mjs',import.meta.url))),at:new Date().toISOString(),provenance:'Root-authored development assertions and metamorphic variants. No real posts, human labels or independent test.',passed:checks.filter(c=>c.passed).length,total:checks.length,checks};
writeFileSync(new URL('../evaluation/engine-v18-checks.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
writeFileSync(new URL('../evaluation/structural-v18.json',import.meta.url),JSON.stringify({metadata:{status:report.status,provenance:report.provenance},cases:fixtures},null,2)+'\n');
console.log(JSON.stringify({engineVersion:ENGINE_VERSION,passed:report.passed,total:report.total,failed:checks.filter(c=>!c.passed)},null,2));if(report.passed!==report.total)process.exitCode=1;
