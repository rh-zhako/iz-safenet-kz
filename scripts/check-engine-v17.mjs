import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {analyzeCampaign,analyzeText,ENGINE_VERSION} from '../dist/engine.mjs';
import {analyzeCampaign as frozenV16} from '../evaluation/engine-v1.6-snapshot.mjs';
import {evaluationCampaigns} from '../dist/demo-data.mjs';
import {appendCampaignSources} from '../dist/provenance.mjs';

// These are newly authored structural development checks, not an independent
// corpus. v1-v4 are OPEN development; this script never reads any later corpus.
const checks=[],families=[],path=p=>new URL(p,import.meta.url);
const sha=x=>createHash('sha256').update(x).digest('hex');
const canonical=c=>{const refs=[...new Set(c.sources.map(s=>s.campaignRef).filter(Boolean))];return {...c,...(!c.campaignRef&&refs.length===1?{campaignRef:refs[0]}:{})};};
function quotes(c,r){for(const signal of [...Object.values(r.analysis.signals),{evidence:r.analysis.context?.atoms||[]}])for(const e of signal.evidence){const s=c.sources.find(s=>s.id===e.sourceId);assert.ok(s);assert.equal(s.text.slice(e.start,e.end),e.quote);}}
function check(name,fn){try{fn();checks.push({name,passed:true});}catch(e){checks.push({name,passed:false,message:e.message});console.error('FAIL',name,e.message);}}
function family(text,risk,name,expected={}){const c={id:`v17-family-${families.length}`,expectedRisk:risk,synthetic:true,sources:[{id:'s',text}]};families.push(c);check(name,()=>{const original=JSON.stringify(c),r=analyzeCampaign(c);assert.equal(r.analysis.risk,risk);quotes(c,r);assert.equal(JSON.stringify(c),original);for(const[k,v]of Object.entries(expected))assert.equal(r.analysis.signals[k].state,v);});}

for(const [text,risk,name,expected] of [
 ['Жүлде — жиналмалы үстел. Қатысу үшін 470 теңге төлеу міндетті. Түбіртегінің нөмірін кездейсоқ таңдаймыз.','high','free lexeme does not occur inside receipt inflection',{free:'unknown'}],
 ['Приз — подушка. Для участия купите номер за 470 ₸. Один номер случайно вытянет механический барабан.','high','denial noun does not occur inside selection verb'],
 ['Приз — подушка. Участие бесплатное. Барабан случайно вытянет один номер.','low','real free condition survives bounded denial'],
 ['Жүлде — үстел. Қатысу тегін. Түбіртегінің нөмірі қажет емес. Жеңімпаз кездейсоқ.','low','explicit free entry remains recognized'],
 ['Приз — плед. Именная табличка нужна для входа в жеребьёвку и стоит 470 тенге. Получателя выберет рандом.','high','priced arbitrary object is required for admission'],
 ['Жүлде — шәлі. Үміткер болу үшін ақылы шағын бұйымды алу міндетті. Жеңімпазды кездейсоқ таңдаймыз.','high','KK generic acquisition obligation'],
 ['Приз — браслет. Чтобы попасть в розыгрыш, берите набор наклеек за 470 тенге. Случайно выберем покупателя.','high','purpose clause links following acquisition'],
 ['Жүлде — кесе. Кіру үшін 470 теңгелік күнделік алу шарт. Бір адамды кездейсоқ таңдаймыз.','high','KK priced acquisition as admission'],
 ['Приз — кресло. Запись в жеребьёвку только после покупки тканевого мешочка. Победитель случайный.','high','entry registration is a role rather than a fixed ticket noun'],
 ['Приз — подушка. Заплатить за участие нужно 470 тенге. Получателя выберем случайно.','high','prefixed payment verb'],
 ['Приз — подушка. Для участия заполните бесплатную форму. Купить тканевый мешочек можно отдельно. Победителя выберем случайно.','low','unrelated optional merchandise is not entry'],
 ['Приз — купон. Участие бесплатное. Случайный победитель сможет применить уже выигранный купон только после покупки товаров.','low','redemption condition after winning is not admission'],
 ['Приз — купон. Заявку любой человек может бесплатно оставить в форме. Для применения купона после победы нужен заказ от 470 тенге. Победителя выберем случайно.','low','free application and later redemption remain separate'],
 ['Жүлде — купон. Қатысу тегін. Купонды ұтқаннан кейін сатып алу кезінде қолданасыз. Жеңімпазды кездейсоқ таңдаймыз.','low','KK coupon redemption role'],
 ['Приз — плед. Для участия купите билет за 470 ₸. Донат на работу кружка можно оставить по желанию. Победителя выберем случайно.','high','optional operating donation does not cancel required ticket'],
 ['Сумку отдадим одному участнику. Вход стоит 470 тенге. Получателя выберем случайно.','high','allocation to one entrant declares a reward'],
 ['Один случайный участник получит дорожную сумку. Для участия обязательно оплатить билет за 470 тенге.','high','random recipient and transfer declare reward and selection'],
 ['Бір адам асүй таймерін алып кетеді. Қатысу үшін ақылы талон алу керек. Бір талонды кездейсоқ таңдаймыз.','high','KK transfer to one recipient'],
 ['Дорожная сумка будет подарком одному участнику. Входной билет стоит 470 тенге. Победителя выберем случайно.','high','gift predicate is reward declaration'],
 ['Одному участнику обещан набор кухонных принадлежностей. Участие стоит 470 тенге. Победителя выберем случайно.','high','promised allocation declares reward'],
 ['Один участник получит регистрационный код. Номер заявки стоит 470 тенге. Код случайно выберет программа. Приз пока не объявлен.','medium','entry credential does not become a reward'],
 ['Купите подарочный набор за 470 тенге. Магазин выдаёт случайный пароль для личного кабинета.','low','retail gift adjective and technical randomness do not create a raffle'],
 ['Приз — плед. Для участия обязательный билет за 470 тенге. Перемешаем номера, случайно выбранному отдадим плед.','high','selected participle is a selection predicate'],
 ['Приз — плед. Для участия билет за 470 тенге. Программа случайно укажет одну запись, её автор получит плед.','high','indication of one entry is selection'],
 ['Жүлде — көрпе. Қатысу үшін билет сатып алу міндетті. Билеттер арасынан біреуін кездейсоқ алып, көрпені береміз.','high','KK take one from population'],
 ['Жүлде — көрпе. Қатысу үшін билет сатып алу міндетті. Бағдарлама бір өтінімді кездейсоқ белгілейді.','high','KK mark one entrant'],
 ['Priz — pled. Dlya uchastiya obyazatelno oplatite bilet. Bot randomom tyanet odnogo uchastnika.','high','transliterated selection verb'],
 ['Julde — korpe. Qatysu ushin aqyly talon satyp alu mindetti. Talondardan bireuin kezdeisoq alamyz.','high','transliterated KK take one'],
 ['Julde — korpe. Qatysu ushin aqyly talon satyp alu mindetti. Bir talon kezdeisoq shygady.','high','transliterated KK one selected output'],
 ['Приз — плед. Для участия билет за 470 тенге. Случайно выберем только порядок выступлений. Победителя определит жюри.','low','selection stage is order rather than prize'],
 ['Приз — плед. Для участия билет за 470 тенге. Случайный выбор победителя не применяется. Победителя определит жюри.','low','postposed denial of selection predicate'],
 ['Приз — плед. Для участия билет за 470 тенге. Мы не выбираем случайно. Победителя определит жюри.','low','preposed predicate denial'],
 ['Priz — pled. Dlya uchastiya obyazatelno oplatite bilet. Jury sravnit tochnost rabot; sluchaino pobeditelya ne vybiraem.','low','transliterated skill and denied random selection'],
 ['Кто быстрее сложит конструкцию, получит приз. Участие стоит 470 тенге. Случайный выбор победителя исключён.','low','measured performance determines winner'],
 ['Приз — плед. Для участия билет за 470 тенге. Победителя выбирают мастера по качеству работы. Также победителя случайно выберет программа.','medium','positive final skill and random criteria conflict'],
 ['Приз — плед. Для участия билет за 470 тенге. Мастера не выбирают победителя по качеству работы. Победителя выберем случайно.','high','denied expert criterion does not create conflict'],
 ['Жүлде — көрпе. Қатысу үшін билет алу міндетті. Нөмірлерді кездейсоқ араластырып, біреуін аламыз.','high','coordinated predicate after random shuffle'],
 ['Жүлде — көрпе. Қатысу үшін жарна төлеу міндетті. Жеңімпазды кездейсоқ генератор анықтайды, жарнасыз тіркелу жоқ.','high','entry denial after comma does not deny random selection'],
 ['Жүлде — көрпе. Қатысу үшін билет алу міндетті. Бөлме заттарын кездейсоқ араластырып қоямыз. Жеңімпазды қазылар алқасы таңдайды.','low','shuffling unrelated objects is not winner selection'],
 ['Приз — купон на 470 тенге. Участие бесплатно. Победителя выберем случайно.','low','coupon face value is not the entry price'],
 ['Приз — плед. Для участия купите купон за 470 тенге. Победителя выберем случайно.','high','purchased coupon can still be an entry credential'],
 ['Приз — плед. Для участия заполните бесплатную форму. Покупать что-либо не надо. Победителя выберем случайно.','low','infix infinitive purchase prohibition'],
 ['Приз — плед. Комментарий — бесплатная заявка. Получателя выберем случайно.','low','paid-adjective fee candidate is not a substring of free adjective'],
 ['Жүлде — көрпе. Қатысу тегін. Өтінім үшін төлем сұралмайды. Жеңімпаз кездейсоқ.','low','KK payment not requested'],
 ['Приз — плед. Для участия заполните бесплатную форму. Отказ от доната не меняет участие. Победителя выберем случайно.','low','refusing donation has no entry consequence'],
 ['Приз — плед. Для участия билет за 470 тенге. Бесплатных заявок на этот приз нет. Победителя выберем случайно.','high','absence of free applications is not free entry',{free:'unknown'}],
 ['Жүлде — көрпе. Қатысу үшін төлем міндетті. Тегін код таратылмайды. Жеңімпаз кездейсоқ.','high','negated free code distribution',{free:'unknown'}],
 ['Жүлде — көрпе. Тегін өтінім қабылданбайды: қатысу үшін ақылы билет алу керек. Жеңімпаз кездейсоқ.','high','negated free application acceptance',{free:'unknown'}],
 ['Жүлде — көрпе. Қатысу тегін. Өтінім үшін зат сатып алу, жарна немесе донат қажет емес. Жеңімпаз кездейсоқ.','low','coordinated KK denial spans comma'],
 ['Жүлде — көрпе. Қатысу тегін. Қатысуға ақша төлеу де, дүкеннен зат алу да қажет емес. Жеңімпаз кездейсоқ.','low','coordinated acquisition denial'],
 ['Приз — плед. Оплата участия нулевая. Ничего покупать не требуется. Победителя выберем случайно.','low','zero described in words'],
 ['Приз — плед. Заявку можно бесплатно оставить в форме. Платежей ради участия нет. Победителя выберем случайно.','low','absence of entry payments in inverted order'],
 ['На семинаре цитируем чужое объявление: «Обязательный взнос, случайный победитель, плед в подарок». Здесь никакого розыгрыша не организуем.','low','reported quote in seminar is not an own offer'],
 ['В памятке разбираем выдуманный рекламный текст: «Купи номер за 470 тенге, случайный участник получит плед». Это пример чужого приглашения.','low','reported hypothetical advertisement'],
 ['Слайдта сыртқы жарнаманы мысалға келтіреміз: «Билет сатып ал, жүлде кездейсоқ». Өзіміз ұтыс өткізбейміз.','low','KK reported teaching specimen'],
 ['Осторожно с чужими объявлениями. Наша акция: приз — плед, для участия купите билет за 470 тенге. Победителя выберем случайно.','high','active own offer remains separate from warning'],
 ['В учебной памятке цитируем рекламное объявление. Но условия нашего розыгрыша такие: приз — плед. Для участия купите билет за 470 тенге. Победителя выберем случайно.','high','declined possessive in own active offer'],
 ['Для обсуждения цитируем чужое объявление: «Правила нашего розыгрыша: приз — плед, для участия билет за 470 тенге, победитель случайный». Свой розыгрыш не проводим.','low','first person inside an alien quote is not current author'],
 ['Приз — плед. Для участия билет за 470 тенге. Возможно, программа случайно выберет победителя.','medium','epistemic possibility is not observed mechanism'],
 ['Приз — плед. Участие бесплатно. Донат добровольный и не влияет на участие. Получателя выберем случайно.','low','optional support does not establish paid entry'],
])family(text,risk,name,expected);

for(const [text,risk,name]of [
 ['Приз — чемодан. Для участия обязательно оплатить билет за 815 тенге. Победителя случайно выберем.','high','RU allocation'],
 ['Жүлде — термос. Қатысу үшін 815 теңге төлеу міндетті. Жеңімпазды кездейсоқ таңдаймыз.','high','KK allocation'],
 ['Priz — termos. Dlya uchastiya obyazatelno oplatite bilet. Pobeditelya vyberem sluchaino.','high','translit allocation'],
])for(const [label,change]of [
 ['line wraps',x=>x.replaceAll(' ','\n')],
 ['NFKC full width digits',x=>x.replace(/[0-9]/gu,ch=>String.fromCodePoint(ch.charCodeAt(0)+0xfee0))],
 ['zero width noise',x=>x.replace(/([\p{L}])([\p{L}])/gu,'$1\u200b$2')],
 ['sentence ordering',x=>x.split('.').filter(s=>s.trim()).reverse().join('.')+'.'],
])family(change(text),risk,`${name}: ${label}`);

check('foreign sources remain excluded',()=>{const c={id:'own',sources:[{id:'a',text:'Приз — плед.',campaignRef:'own'},{id:'b',text:'Для участия купите билет. Победитель случайный.',campaignRef:'foreign'}]},r=analyzeCampaign(c);assert.equal(r.analysis.risk,'low');assert.ok(r.analysis.context.atoms.every(a=>a.sourceId!=='b'));});
const groupedSources=[
 {id:'one',campaignRef:'legacy',originalCampaignRef:'original-alpha',text:'Приз — плед.'},
 {id:'two',campaignRef:'legacy',originalCampaignRef:'original-beta',text:'Для участия купите билет за 470 тенге.'},
 {id:'three',campaignRef:'legacy',originalCampaignRef:'original-alpha',text:'Победителя выберем случайно.'},
];
check('legacy automatic interleaved original campaign identities cannot aggregate to high',()=>{const c={id:'legacy',manualGrouping:false,sources:groupedSources},before=JSON.stringify(c),r=analyzeCampaign(c);assert.equal(r.analysis.risk,'medium');assert.equal(r.analysis.groupingIntegrity.state,'conflict');assert.deepEqual(r.analysis.groupingIntegrity.originalCampaignRefs,['original-alpha','original-beta']);assert.ok(r.analysis.contradictions.some(s=>s.includes('принадлеж')));assert.equal(JSON.stringify(c),before);quotes(c,r);});
check('one known original identity plus unknown does not invent a contradictory identity',()=>{const c={id:'legacy',manualGrouping:false,sources:groupedSources.map((s,i)=>({...s,originalCampaignRef:i===1?'':s.originalCampaignRef}))},r=analyzeCampaign(c);assert.equal(r.analysis.risk,'high');assert.equal(r.analysis.groupingIntegrity.state,'unverified');assert.equal(r.analysis.contradictions.length,0);quotes(c,r);});
check('legacy manualGrouping flag does not confirm conflicting original identities',()=>{const c={id:'legacy',manualGrouping:true,sources:groupedSources},r=analyzeCampaign(c);assert.equal(r.analysis.risk,'medium');assert.equal(r.analysis.groupingIntegrity.state,'conflict');quotes(c,r);});
check('ordinary manually grouped case without original identity metadata remains usable',()=>{const c={id:'legacy',manualGrouping:true,sources:groupedSources.map(({originalCampaignRef,...s})=>s)},r=analyzeCampaign(c);assert.equal(r.analysis.risk,'high');assert.equal(r.analysis.groupingIntegrity.state,'manual');quotes(c,r);});
check('appending one source cannot clear a legacy conflicting identity guard',()=>{const c={id:'legacy',manualGrouping:false,sources:structuredClone(groupedSources)};appendCampaignSources(c,[{id:'appended',campaignRef:'legacy',text:'Дополнительный материал.'}]);assert.equal(c.manualGrouping,true);const r=analyzeCampaign(c);assert.equal(r.analysis.risk,'medium');assert.equal(r.analysis.groupingIntegrity.state,'conflict');assert.equal(r.sources.length,4);quotes(c,r);});
check('NFKC and zero-width mapping preserve quotes',()=>{const text='🎁 Розы\u200bгрыш пледа. Для участия опла\u200bтите билет ４７０ ₸. Победителя выберет рандoмайзер.',r=analyzeText(text);assert.equal(r.analysis.risk,'high');quotes(r,r);});
function evaluate(cases,analyze=analyzeCampaign){const matrix=Object.fromEntries(['high','medium','low'].map(k=>[k,{high:0,medium:0,low:0}]));let tp=0,fp=0,tn=0,fn=0,quoteErrors=0;const results=cases.map(raw=>{const c=canonical(raw),r=analyze(c),expected=c.expectedRisk,predicted=r.analysis.risk;matrix[expected][predicted]++;if(expected==='high'&&predicted==='high')tp++;else if(predicted==='high')fp++;else if(expected==='high')fn++;else tn++;try{quotes(c,r);}catch{quoteErrors++;}return{id:c.id,expected,predicted,match:expected===predicted,language:c.language||'family',missing:['prize','payment','random'].filter(k=>r.analysis.signals[k].state==='unknown'),contradictions:r.analysis.contradictions};});const ratio=(a,b)=>b?a/b:null;return{total:cases.length,accuracy:ratio(results.filter(r=>r.match).length,cases.length),tp,fp,tn,fn,precision:ratio(tp,tp+fp),recall:ratio(tp,tp+fn),falsePositiveRate:ratio(fp,fp+tn),matrix,quoteErrors,cases:results};}
const corpora={};for(const name of ['challenge-v1','independent-v2','independent-v3','independent-v4']){const bytes=readFileSync(path(`../evaluation/${name}.json`));corpora[name]={sha256:sha(bytes),...evaluate(JSON.parse(bytes).cases)};}
const historical=evaluate(evaluationCampaigns),familyResults=evaluate(families),v4=JSON.parse(readFileSync(path('../evaluation/independent-v4.json'))).cases,previousV4=evaluate(v4,frozenV16);
const baselineMissedHigh=v4.filter(c=>c.expectedRisk==='high').map(c=>({c,a:frozenV16(canonical(c)).analysis})).filter(({a})=>a.risk!=='high');
const baselineErrorAudit={missedHigh:baselineMissedHigh.length,missingSignals:{prize:0,payment:0,random:0},noCandidate:{prize:0,payment:0,random:0},excludedRandom:{},contradictionOnly:0,missingCombinations:{},byLanguage:{}};
for(const {c,a}of baselineMissedHigh){const missing=['prize','payment','random'].filter(k=>a.signals[k].state==='unknown');if(!missing.length)baselineErrorAudit.contradictionOnly++;for(const key of missing){baselineErrorAudit.missingSignals[key]++;const atoms=a.context.atoms.filter(x=>x.feature===key);if(!atoms.length)baselineErrorAudit.noCandidate[key]++;if(key==='random')for(const atom of atoms){const reason=`${atom.role}/${atom.polarity}`;baselineErrorAudit.excludedRandom[reason]=(baselineErrorAudit.excludedRandom[reason]||0)+1;}}const signature=missing.join('+')||'contradiction-only';baselineErrorAudit.missingCombinations[signature]=(baselineErrorAudit.missingCombinations[signature]||0)+1;baselineErrorAudit.byLanguage[c.language]=(baselineErrorAudit.byLanguage[c.language]||0)+1;}
check('all original quotes and context atoms remain exact',()=>assert.equal([...Object.values(corpora),historical,familyResults].reduce((n,r)=>n+r.quoteErrors,0),0));
check('high priority always requires all three exact evidence signals without contradictions',()=>{for(const list of [...Object.keys(corpora).map(n=>JSON.parse(readFileSync(path(`../evaluation/${n}.json`))).cases),families,evaluationCampaigns])for(const raw of list){const r=analyzeCampaign(canonical(raw));if(r.analysis.risk==='high'){assert.equal(r.analysis.contradictions.length,0);for(const k of ['prize','payment','random'])assert.equal(r.analysis.signals[k].state,'found');}}});
check('income is never inferred merely from entry payment',()=>assert.equal(analyzeText('Приз — плед. Для участия билет за 470 тенге. Победитель случайный.').analysis.signals.income.state,'unknown'));
const report={schemaVersion:1,status:'OPEN_DEVELOPMENT_NOT_INDEPENDENT',engineVersion:ENGINE_VERSION,engineSha256:sha(readFileSync(path('../dist/engine.mjs'))),createdAt:new Date().toISOString(),architecture:'Unicode-bounded lexical candidates → clause attribution and linked entry/reward predicates → scoped modality/polarity/stage → original evidence atoms → conservative contradictions → priority',provenance:'v4 was held blind for v1.6 and is now explicitly OPEN development for v1.7. All family assertions are development checks. No future corpus is read.',baselineErrorAudit,changes:[
 'Unicode lexical boundaries prevent free or paid words from matching inside unrelated longer words.',
 'Literal denial words have Unicode boundaries; a selection verb cannot contain a denial by substring.',
 'Payment and acquisition predicates are extracted before checking their role as an entry condition.',
 'Mandatory acquisition concerns arbitrary objects through admission and obligation rather than a product-name list.',
 'Reward allocation to an entrant or promised gift can establish a prize without the literal prize noun; registration credentials remain excluded.',
 'Winner selection supports inflected verbs, recipient constructions, KK and transliterated predicates.',
 'A comma can link a purpose or selection continuation, while a sentence boundary stops that inheritance and keeps negation scoped.',
 'Post-win coupon redemption, prize price, voluntary support and negated free paths have distinct roles.',
 'Reported educational advertisements and first-person statements inside alien quotes are separated from an active own offer.',
 'Skill and expert criteria, denied selection predicates and stages support conservative unresolved-selection conflicts.',
 'Legacy originalCampaignRef conflicts block a combined high even after source append changes manualGrouping; no saved source is removed.',
 ],corpora,previousV4,historical,familyResults,checks,checkSummary:{passed:checks.filter(c=>c.passed).length,total:checks.length},limitations:['All reported corpora are synthetic open development or historical regression. These scores do not estimate generalization.','No trained language model or external LLM is used. Context and morphology remain heuristic.','Unknown paraphrases, ellipsis, implicit references, multiple concurrent offers and attribution across documents remain unproven.','No fraud, illegality, actual revenue or ownership verdict is produced.']};
console.log(JSON.stringify({engineVersion:ENGINE_VERSION,engineSha256:report.engineSha256,checks:report.checkSummary,development:Object.fromEntries(Object.entries(corpora).map(([n,r])=>[n,{accuracy:r.accuracy,precision:r.precision,recall:r.recall,fpr:r.falsePositiveRate,quoteErrors:r.quoteErrors}])),historical:historical.accuracy,families:familyResults.accuracy,remainingV4Errors:corpora['independent-v4'].cases.filter(c=>!c.match)},null,2));
if(report.checkSummary.passed!==checks.length)process.exitCode=1;
else if(process.argv.includes('--write-development'))writeFileSync(path(ENGINE_VERSION.startsWith('1.7.')?'../evaluation/development-v4-notes.json':'../evaluation/v17-compatibility-v18.json'),JSON.stringify(report,null,2)+'\n');
