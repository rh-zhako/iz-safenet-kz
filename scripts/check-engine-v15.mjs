import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {analyzeCampaign,analyzeText,ENGINE_VERSION} from '../dist/engine.mjs';
import {analyzeCampaign as frozenV14} from '../evaluation/engine-v1.4-snapshot.mjs';
import {evaluationCampaigns,demoCampaigns} from '../dist/demo-data.mjs';

// v2 has been opened and used for development. This script explicitly does not
// read later independent corpora. Passing these checks is not a blind result.
const checks=[],familyCases=[];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const path=relative=>new URL(relative,import.meta.url);
const canonical=c=>{const refs=[...new Set(c.sources.map(s=>s.campaignRef).filter(Boolean))];return {...c,...(!c.campaignRef&&refs.length===1?{campaignRef:refs[0]}:{})};};
function verifyQuotes(c,result){for(const signal of Object.values(result.analysis.signals))for(const e of signal.evidence){const source=c.sources.find(s=>s.id===e.sourceId);assert.ok(source,'Evidence must point to an existing source');assert.ok(Number.isInteger(e.start)&&Number.isInteger(e.end)&&e.start>=0&&e.end>=e.start);assert.equal(source.text.slice(e.start,e.end),e.quote);}}
function check(name,fn){try{fn();checks.push({name,passed:true});}catch(error){checks.push({name,passed:false,message:error.message});console.error('FAIL',name,error.message);}}
function test(text,expectedRisk,tag){const c={id:`family-${familyCases.length+1}`,title:tag,expectedRisk,synthetic:true,sources:[{id:`family-source-${familyCases.length+1}`,text}]};familyCases.push(c);check(tag,()=>{const before=JSON.stringify(c),r=analyzeCampaign(c);assert.equal(r.analysis.risk,expectedRisk);verifyQuotes(c,r);assert.equal(JSON.stringify(c),before);if(r.analysis.risk==='high'){for(const signal of ['prize','payment','random'])assert.equal(r.analysis.signals[signal].state,'found');assert.equal(r.analysis.contradictions.length,0);}});}

const positives={
  ru:{prize:['Разыгрываем фотоаппарат.','Победитель получит велосипед.','Приз — сертификат.'],payment:['Для участия купите билет за 1700 тенге.','Чтобы подать заявку, обязательно приобретите купон за 880 ₸.','Для допуска к розыгрышу обязателен взнос 420 ₸.','Билет стоит 950 ₸, без оплаты в список не включим.','Для участия донат 630 ₸ обязателен.'],random:['Победителя выберем случайно.','Номер вытянем вслепую из мешка.','Победителя определит колесо фортуны.']},
  kk:{prize:['Жүлде — үстел шамы.','Жулде — құлаққап.','Кітап жинағын ойнатамыз.'],payment:['Қатысу үшін 1700 теңге төлеу міндетті.','Өтінімге міндетті жарна — 880 ₸.','Ұтысқа кіру үшін талонды сатып алу керек.'],random:['Жеңімпаз кездейсоқ таңдалады.','Нөмірді көз жұмып суыру арқылы таңдаймыз.']},
  translit:{prize:['Rozygryvaem monitor.','Zhulde — kitap.','Samokat oinatamyz.'],payment:['Dlya uchastiya oplatite bilet za 1700 tg.','Qatysu ushin nomirdi satyp alu mindetti.','Uchastnik dolzhen vnest orgsbor 880 tg.'],random:['Pobeditelya vyberem sluchaino.','Zhenimpaz kezdeisoq tandalady.']},
};
for(const [language,parts] of Object.entries(positives))for(const [p,prize] of parts.prize.entries())for(const [f,payment] of parts.payment.entries())for(const [r,random] of parts.random.entries())test(`${prize} ${payment} ${random}`,'high',`${language}: positive family ${p+1}/${f+1}/${r+1}`);

for(const [entry,tag]of[
  ['Для участия не обязательна покупка.','reverse optional purchase'],
  ['Для участия не нужна оплата.','reverse unnecessary fee'],
  ['Оплата и покупка не нужны.','plural no purchase'],
  ['Никаких платежей и покупок.','explicit no payments'],
  ['Для участия покупать ничего не требуется.','no-purchase reordered'],
  ['Участие бесплатно. Донат по желанию и не влияет на шанс.','optional donation'],
  ['Участие бесплатно. Покупка сувенира добровольная.','optional purchase'],
  ['Қатысу үшін сатып алуыңыз міндетті емес.','inflected KK no purchase'],
  ['Ештеңе сатып алудың қажеті жоқ. Қатысу тегін.','KK no requirement'],
  ['Қатысу тегін. Донат ерікті, қатысуға әсер етпейді.','KK optional donation'],
  ['Вход тегін. Донат өз еркіңізбен, без доната тоже участвуете.','mixed optional donation'],
  ['Za uchastie platit ne nado.','translit no payment'],
  ['Uchastie besplatno, pokupki ne nuzhny.','translit plural no purchase'],
  ['Билет участия — 0 тенге.','zero fee'],
  ['Слот для участия стоит 0,00 ₸.','decimal zero fee'],
])test(`Розыгрыш книги. ${entry} Победитель случайный.`,'low',tag);

for(const [shipping,tag]of[
  ['Победитель может заказать доставку после выигрыша за 1500 ₸.','RU delivery after winning'],
  ['Ұтып алған адам жеткізуді қаласа, тасымал ақысын кейін өзі төлейді.','KK optional delivery'],
  ['Егер жеткізу керек болса, он оплатит перевозку после выигрыша.','mixed optional delivery'],
  ['Tolko posle vyigrysha mozhno zakazat dostavku za 1500 tg.','translit optional delivery'],
])test(`Розыгрыш книги. Қатысу тегін, участие бесплатное. ${shipping} Победителя выберем случайно.`,'low',tag);

for(const [method,tag]of[
  ['Победителя определит жюри по качеству. Ни жеребьёвки, ни случайного выбора не будет.','RU coordinated random negation'],
  ['Работы оценит жюри. Случайный выбор исключён.','RU random excluded'],
  ['Қазылар жұмысты бағалайды, кездейсоқ таңдау болмайды.','KK no random selection'],
  ['Qazylar bagalaidy. Kezdeisoq tandau da, zherebe de zhoq.','translit coordinated random negation'],
])test(`Приз — книга. Для участия оплатите взнос 1500 ₸. ${method}`,'low',tag);

for(const [conditions,tag]of[
  ['Условия оплаты ещё не объявлены. Победитель случайный.','unknown fee'],
  ['Қатысуға төлем керек пе деген ақпаратты кейін жариялаймыз. Жеңімпаз кездейсоқ.','KK fee question'],
  ['Платно ма, тегін бе — пока не указано. Победитель случайный.','mixed fee uncertainty'],
  ['Для участия оплатите билет. Способ выбора пока не объявлен.','unknown winner mechanism'],
  ['Участие бесплатно. Но обязательный билет стоит 2000 тенге. Победитель случайный.','contradictory free and fee'],
  ['Жюри оценит работу. Но победителя определим случайно. Для участия оплатите билет.','contradictory jury/random'],
])test(`Приз — книга. ${conditions}`,'medium',tag);

for(const [body,tag]of[
  ['Учебный разбор: «Для участия купи билет, приз — книга, победитель случайный». Мы деньги не принимаем.','RU educational quotation'],
  ['Абай болыңыз: «Қатысу үшін ақша төле, жүлде — кітап, жеңімпаз кездейсоқ». Бұл дәйексөз, біз ұтыс өткізбейміз.','KK educational quotation'],
  ["Eskertu: 'nomirge aqsha tole, random telefon beredi'. Bul tek mysal, biz utys otkizbeimiz.",'translit educational quotation'],
  ['Нұсқаулықтағы мысал: «Обязательный билет за 1700 ₸, приз — кітап, рандом». Это учебная цитата, не активная акция.','mixed educational quotation'],
])test(body,'low',tag);

test('Осторожно, не переводите по чужим сообщениям. А у нас розыгрыш книги: для участия оплатите билет за 1500 тенге. Победителя выберем случайно.','high','warning followed by explicit own offer');
test('Бөтен жарнамаға сенбеңіз. Біздің кітап ұтысымыз: қатысу үшін 1500 теңге төлеу міндетті. Жеңімпаз кездейсоқ таңдалады.','high','KK warning followed by explicit own offer');
test('Розыгрыш книги. Для участия обязательно купите билет за 1500 тенге. Донат добровольный. Победителя выберем случайно.','high','optional extra donation does not negate required ticket');
test('Розыгрыш книги. Покупать товар не нужно, но билет за 1500 тенге обязателен. Победитель случайный.','medium','no purchase plus required ticket stays conservative');
test('Приз — книга. Для участия нужен билет за 1500 тенге; доставка бесплатная. Победителя выберем случайно.','high','free delivery is not free participation');
test('Приз — книга. Билет стоит 1500 тенге, доставка 0 тенге. Победителя выберем случайно.','high','zero delivery price never becomes zero entry fee');
test('Приз — книга. Для участия купите билет за 1500 тенге. Нет бесплатных билетов. Победителя выберем случайно.','high','absence of free tickets before adjective');
test('Жүлде — кітап. Нөмір 1500 теңге. Тегін нөмір болмайды. Жеңімпаз кездейсоқ таңдалады.','high','absence of free numbers in KK');
test('Приз — книга. Для участия оплатите билет. Курьер случайно сломал коробку.','medium','incidental random event is not winner selection');
test('Приз — книга. Для участия оплатите билет. Жюри оценит работу; случайный выбор мы не проводим.','low','random selection denied after subject');
test('Жүлде — кітап. Қатысу үшін билет сатып алу міндетті. Билеттердің бірін кездейсоқ суырып аламыз.','high','KK drawing a ticket is a selection role');
test('Жүлде — кітап. Қатысу үшін билет сатып алу міндетті. Билеттердің ішінен біреуін кездейсоқ аламыз.','high','KK taking one ticket from the pool is a selection role');
test('Кітап ұтысы. Толық шарттарды кейін жариялаймыз.','medium','KK incomplete teaser');

for(const [body,tag]of[
  ['🎁 РОЗЫГРЫШ книги. Для участия\nобязательно оплатите\nбилет за １２００ тенге. Рандом выберет победителя.','NFKC fullwidth digits and emoji offsets'],
  ['Розы\u200bгрыш книги. Для участия опла\u200bтите билет за 1200 тенге. Победитель случайный.','zero width OCR noise offsets'],
  ['Розыгрыш книги. Для участия оплатите билет за 1200 тенге. Победителя определит рандoмайзер.','mixed glyph inside Cyrillic'],
  ['Rozygrysh knigi. Qаtysu ushin nomirdi satyp alu mindetti. Random vyberet pobeditelya.','mixed glyph inside Latin'],
  ['Жулде — смартфон. Для участия\nобязательный взнос 3000 тенге.\nЖеңімпаз кездейсоқ таңдалады.\nПолные условия в следующем\nсообщении.','OCR wrap and KK diacritic loss'],
])test(body,'high',tag);

check('foreign campaign remains excluded despite whitespace normalization',()=>{const c={id:'own',sources:[{id:'one',text:'Розыгрыш книги.',campaignRef:'own'},{id:'other',text:'Для участия\nоплатите билет. Победитель случайный.',campaignRef:'other'}]},r=analyzeCampaign(c);assert.equal(r.analysis.risk,'low');assert.equal(r.analysis.signals.payment.state,'unknown');verifyQuotes(c,r);});
check('income is not inferred from a fee',()=>assert.equal(analyzeText('Приз — книга. Для участия оплатите билет. Победитель случайный.').analysis.signals.income.state,'unknown'));
check('empty text has no positive evidence',()=>{const r=analyzeText('');assert.equal(r.analysis.risk,'low');for(const signal of Object.values(r.analysis.signals))assert.equal(signal.state,'unknown');});
check('zero commission is not claimed as income',()=>assert.equal(analyzeText('Приз — книга. Участие бесплатно. Победитель случайный. Комиссия организатора 0%.').analysis.signals.income.state,'unknown'));

function evaluateCases(cases,analyzer){
  const matrix=Object.fromEntries(['high','medium','low'].map(c=>[c,{high:0,medium:0,low:0}]));let tp=0,fp=0,tn=0,fn=0,queueTP=0,queueFP=0,queueTN=0,queueFN=0,quoteErrors=0;
  const results=cases.map(original=>{const c=canonical(original),r=analyzer(c),predicted=r.analysis.risk,expected=c.expectedRisk;matrix[expected][predicted]++;if(expected==='high'&&predicted==='high')tp++;else if(expected!=='high'&&predicted==='high')fp++;else if(expected==='high')fn++;else tn++;if(expected!=='low'&&predicted!=='low')queueTP++;else if(expected==='low'&&predicted!=='low')queueFP++;else if(expected!=='low')queueFN++;else queueTN++;try{verifyQuotes(c,r);}catch{quoteErrors++;}return{id:c.id,expected,predicted,match:expected===predicted,language:c.language||'family',tag:c.tag||c.title||'',score:r.analysis.score};});
  const div=(a,b)=>b?a/b:0;return {total:cases.length,accuracy:div(results.filter(c=>c.match).length,cases.length),precision:div(tp,tp+fp),recall:div(tp,tp+fn),falsePositiveRate:div(fp,fp+tn),tp,fp,tn,fn,matrix,quoteErrors,triage:{tp:queueTP,fp:queueFP,tn:queueTN,fn:queueFN,precision:div(queueTP,queueTP+queueFP),recall:div(queueTP,queueTP+queueFN),falsePositiveRate:div(queueFP,queueFP+queueTN)},cases:results};
}

const v2Bytes=readFileSync(path('../evaluation/independent-v2.json')),v2=JSON.parse(v2Bytes).cases,oldCases=JSON.parse(readFileSync(path('../evaluation/challenge-v1.json'),'utf8')).cases;
const report={schemaVersion:1,engineVersion:ENGINE_VERSION,engineSha256:sha(readFileSync(path('../dist/engine.mjs'))),datasetSha256:sha(v2Bytes),status:'OPEN_DEVELOPMENT_NOT_INDEPENDENT',freezePolicy:'Write once after development; never replace the original frozen v1.4 independent-v2 measurement.',provenance:'v2 was authored by a separate engine-blinded AI, then opened and explicitly used to develop v1.5. These scores are now development/regression results. No later independent corpus is read.',changes:['Mapped NFKC, OCR whitespace and mixed glyph normalization with exact original-source offsets.','Role-aware entry payment synonyms across RU, KK and transliteration.','Scope-sensitive absence, optional donation, delivery, zero fees and contradictory conditions.','Educational quotation masking while preserving separately advertised own offers.','Random-draw synonyms and coordinated negations; no risk from unknown terms.'],frozenV14:evaluateCases(v2,frozenV14),developmentV2:evaluateCases(v2,analyzeCampaign),historicalDevelopment:evaluateCases(oldCases.filter(c=>c.split==='development'),analyzeCampaign),historicalV1:evaluateCases(oldCases.filter(c=>c.split!=='development'),analyzeCampaign),historicalRegression:evaluateCases(evaluationCampaigns,analyzeCampaign),demo:evaluateCases(demoCampaigns,analyzeCampaign),familyTemplates:evaluateCases(familyCases,analyzeCampaign),ocrDevelopment:[],checks};
for(const [file,expectedRisk]of[['kk-dark-actual.txt','low'],['mixed-wrap-actual.txt','high'],['ru-small-actual.txt','high'],['ru-warning-actual.txt','low']]){const url=path(`../evaluation/fixtures/stress/${file}`);if(!existsSync(url))continue;const c={id:`ocr-${file}`,expectedRisk,synthetic:true,sources:[{id:'ocr-source',text:readFileSync(url,'utf8')}]},r=analyzeCampaign(c);check(`disclosed OCR development: ${file}`,()=>{assert.equal(r.analysis.risk,expectedRisk);verifyQuotes(c,r);});report.ocrDevelopment.push({file,expected:expectedRisk,predicted:r.analysis.risk,match:r.analysis.risk===expectedRisk});}
check('historical development unchanged: 32 cases',()=>{assert.equal(report.historicalDevelopment.total,32);assert.equal(report.historicalDevelopment.accuracy,1);assert.equal(report.historicalDevelopment.quoteErrors,0);});
check('historical v1 regression has no loss against v1.4',()=>{const before=evaluateCases(oldCases.filter(c=>c.split!=='development'),frozenV14);assert.ok(report.historicalV1.accuracy>=before.accuracy);assert.equal(report.historicalV1.quoteErrors,0);});
check('28 original regression scenarios remain correct',()=>{assert.equal(report.historicalRegression.total,28);assert.equal(report.historicalRegression.accuracy,1);assert.equal(report.historicalRegression.quoteErrors,0);});
check('v2 source dataset is not modified by evaluation',()=>assert.equal(sha(readFileSync(path('../evaluation/independent-v2.json'))),report.datasetSha256));
check('v2 development has zero evidence offset errors',()=>assert.equal(report.developmentV2.quoteErrors,0));
report.checkSummary={passed:checks.filter(c=>c.passed).length,total:checks.length};
console.log(JSON.stringify({engineVersion:ENGINE_VERSION,engineSha256:report.engineSha256,checks:report.checkSummary,v2Development:{accuracy:report.developmentV2.accuracy,precision:report.developmentV2.precision,recall:report.developmentV2.recall,queueFPR:report.developmentV2.triage.falsePositiveRate,quoteErrors:report.developmentV2.quoteErrors},historical:{development:report.historicalDevelopment.accuracy,v1:report.historicalV1.accuracy,regression:report.historicalRegression.accuracy},familyAccuracy:report.familyTemplates.accuracy},null,2));
if(report.checkSummary.passed!==checks.length)process.exitCode=1;
else if(process.argv.includes('--freeze-report')){writeFileSync(path('../evaluation/development-v2-notes.json'),JSON.stringify({...report,frozen:true},null,2)+'\n',{flag:'wx'});console.log('Frozen development report written once.');}
