import {patchEvaluation as patch} from './patch-evaluation.mjs?v=20261023-final-1';
import {annotationAgreement as v8Agreement} from './fresh-v8-agreement.mjs?v=20261023-final-1';
import {freshEvaluation} from './fresh-v8-evaluation.mjs?v=20261023-final-1';
import {freshEvaluation as firstV6Evaluation} from './fresh-evaluation.mjs?v=20261023-final-1';
import {freshEvaluation as firstV7Evaluation} from './fresh-v7-evaluation.mjs?v=20261023-final-1';
import {developmentEvaluation as development} from './development-evaluation.mjs?v=20261023-final-1';
import {semanticComparison} from './semantic-comparison.mjs?v=20261023-final-1';
import {releaseEvaluation as release} from './release-evaluation.mjs?v=20261023-final-1';
const pct=n=>n===null||n===undefined?'—':`${(Math.round(n*1000+1e-9)/10).toFixed(1).replace('.0','').replace('.',',')}%`;
const ci=r=>r?`${pct(r[0])}–${pct(r[1])}`:'недостаточно данных';
const names={high:'Высокий',medium:'Средний',low:'Низкий'},langs={ru:'Русский',kk:'Казахский',mixed:'Смешанный',translit:'Транслит'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sampleDatasetSha='839ffab18108e34df6b22940273978912a8ca36cc72c4891b6cbcb268c10b756';
const frozenErrorSamples = [
  {
    "id": "5c4b532533021e52",
    "language": "kk",
    "expected": "high",
    "predicted": "medium",
    "rationale": "Ақылы қызметке тапсырыс міндетті, соңғы жүлдегер кездейсоқ таңдалады.",
    "sources": [
      {
        "id": "68053ece892d0147",
        "text": "[Ойдан шығарылған науқан «Ақ терезе»] Кілем тазалау қызметін ақылы тапсырып, түбіртегін жібергендер ғана ауа тазартқыш ұтысына қатысады. Соңғы жеңімпаз түбіртектер арасынан кездейсоқ таңдалады."
      }
    ]
  },
  {
    "id": "16c72f420a370395",
    "language": "translit",
    "expected": "high",
    "predicted": "low",
    "rationale": "Ақылы билетсіз кіру жоқ және жүлде соңғы кездейсоқ таңдаумен беріледі.",
    "sources": [
      {
        "id": "e97a8e64dc205670",
        "text": "[Oidan shygarylgan nauqan «Jumsaq sham»] Sham utusyna qatysu bileti 500 tenge turady, biletsiz tizimge qospaymyz."
      },
      {
        "id": "ea9fd5aa325bf00d",
        "text": "[Oidan shygarylgan nauqan «Jumsaq sham»] Finalda barlyq satylgan bilet aralasady da, bireui kezdeisoq alynady; sol numnyn iesine sham beriledi."
      }
    ]
  },
  {
    "id": "8e05b516a23fee82",
    "language": "kk",
    "expected": "medium",
    "predicted": "high",
    "rationale": "Кездейсоқ жүлде анық, қолдау сомасының міндеттілігі ашылмаған.",
    "sources": [
      {
        "id": "f705a572b84d7f90",
        "text": "[Ойдан шығарылған науқан «Таңғы құс»] Жүлде — құсқа арналған кең тор. Соңында өтінімдердің бірі кездейсоқ таңдалады. Тіркеу парағында демеуге арналған сома көрсетілген. Ол соманы төлеу міндетті ме деп сұраған. Жауап әлі жарияланбаған. Сондықтан төлемсіз өтінімнің қабылданатыны белгісіз."
      }
    ]
  },
  {
    "id": "273b2c149090d1f1",
    "language": "translit",
    "expected": "medium",
    "predicted": "low",
    "rationale": "Случайный приз указан, обязательные условия допуска еще не опубликованы.",
    "sources": [
      {
        "id": "6ba2d947d9b58d63",
        "text": "[Oidan shygarylgan nauqan «Jaryq qap»] Baqsha shamyn random arqyly beremiz degen habar bar. Qatysu batyrmasy ashyq, biraq tolem kerek pe, satyp alu kerek pe degen sharttar ele jariyalanbagan."
      }
    ]
  },
  {
    "id": "a4f7bb7b1bba4839",
    "language": "kk",
    "expected": "low",
    "predicted": "high",
    "rationale": "Бөгде мысал оқу үшін келтірілген, өзінің белсенді ұтысы жоқ.",
    "sources": [
      {
        "id": "64d6055824a3f8d6",
        "text": "[Ойдан шығарылған науқан «Көрнекі сабақ»] Дәрісте «жарна төле де, кездейсоқ самокат ұт» деген ойдан шығарылған бөгде жарнаманы экранға шығардық."
      },
      {
        "id": "f13ef301d1d81cd2",
        "text": "[Ойдан шығарылған науқан «Көрнекі сабақ»] Осы дәріс мәтінінің өзі науқан ашпайды, жарна қабылдамайды және ешкімге ұтысқа орын ұсынбайды."
      }
    ]
  },
  {
    "id": "fecc459c0d3556bd",
    "language": "kk",
    "expected": "low",
    "predicted": "medium",
    "rationale": "Финал ақылы кіруге қарамастан қазылардың бағалауымен және кездейсоқтықсыз өтеді.",
    "sources": [
      {
        "id": "737b9188a120b3c0",
        "text": "[Ойдан шығарылған науқан «Жырлы кеш»] Өлең байқауының ақылы тіркеуі бар, жүлде — электронды кітап оқу құрылғысы."
      },
      {
        "id": "8c3e15f68c1d26e1",
        "text": "[Ойдан шығарылған науқан «Жырлы кеш»] Финалда қазылар тіл мен құрылымға балл қояды, тең баллды қайта талқылаумен шешеді, ешқандай жеребе қолданбайды."
      }
    ]
  },
  {
    "id": "8a787783a27dfa35",
    "language": "kk",
    "expected": "low",
    "predicted": "medium",
    "rationale": "Бөгде ұсыныс тек дәйексөзбен талданған, өзінің науқаны белсенді емес.",
    "sources": [
      {
        "id": "9cfdc7200bbcd627",
        "text": "[Ойдан шығарылған науқан «Сақтық дәптер»] Брошюрада «билет сатып алсаң, компьютер жеребесіне кіресің» деген бөгде хабарламаға талдау берілген."
      },
      {
        "id": "ab38cff6d9c443f1",
        "text": "[Ойдан шығарылған науқан «Сақтық дәптер»] Брошюра өз атынан билет ұсынбайды және компьютер ұтысына тіркемейді."
      }
    ]
  },
  {
    "id": "f74a6dcfe8cd475f",
    "language": "mixed",
    "expected": "high",
    "predicted": "medium",
    "rationale": "Регистрационная плата необходима для допуска к случайной жеребьевке.",
    "sources": [
      {
        "id": "e06b2ae125042f67",
        "text": "[Синтетикалық кампания «Дәм қасық»] Набор столовых приборов получит случайный участник финальной жеребьевки. Қатысу картасын тек тіркеу ақысын төлеген соң береміз, ақысын төлемей кіру жолы жоқ."
      }
    ]
  }
];
const checkLinks=[
 ['source-edit-checks.json','Сохранение исправлений источника',9],
 ['draft-backup-checks.json','Восстановление черновиков дополнений',6],
 ['selection-boundary-checks.json','Финансовая комиссия и выбор жюри',6],
 ['source-sensitivity-checks.json','Вклад каждого источника',26],
 ['structured-review-checks.json','Ручной разбор и точные цитаты',64],
 ['batch-checks.json','Фоновый импорт и резервный путь',24],
 ['data-recovery-checks.json','Восстановление данных',29],
 ['input-drafts-checks.json','Черновики ввода',29],
 ['focus-checks.json','Фокус и расчёт контраста',23],
 ['grouping-integrity-checks.json','Группировка потока',23],
 ['campaign-integrity-checks.json','Целостность старых дел',25],
 ['engine-v20-checks.json','Контекст и языковые правила v2.0',61],
 ['v17-compatibility-v20.json','Совместимость прежних сценариев',82],
];
function errorExamples(r){
 const rows=release.independentDatasetSha256===sampleDatasetSha?frozenErrorSamples:[];
 if(!rows.length)return '';
 return `<h3>Восемь исторических ошибок v1.7 с исходными текстами</h3><p>Фиксированный выбор из v5: первый случай из каждой ошибочной ячейки матрицы, затем первые оставшиеся ошибки до восьми. Ожидаемые метки и пояснения составил AI-автор. Это синтетические примеры; человек их не подтверждал.</p>${rows.map(c=>`<details class="method-card"><summary>${esc(c.id)} · ${esc(langs[c.language]||c.language)} · ожидалось ${esc(names[c.expected])}, получено ${esc(names[c.predicted])}</summary><p><strong>Пояснение ожидаемой AI-метки:</strong> ${esc(c.rationale)}</p>${c.sources.map((s,i)=>`<h4>Источник ${i+1} · ${esc(s.id)}</h4><blockquote style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(s.text)}</blockquote>`).join('')}</details>`).join('')}`;
}
function semanticSection(){const b=semanticComparison.baseline;return `<section class="method-card"><h3>Проверили альтернативу правилам</h3><p>Две локальные языковые модели и три конфигурации сравнили на уже открытом v5. Это исследование подхода, не новый слепой тест. Все 200 предсказаний каждого запуска сохранены; в опубликованный детектор модели не включены.</p><div class="table-wrap"><table class="matrix"><thead><tr><th>Вариант</th><th>Три уровня</th><th>Полнота high</th><th>Ложные high</th></tr></thead><tbody><tr><td>Правила v1.7 в исследовании</td><td>${b.correct}/${b.total} · ${pct(b.accuracy)}</td><td>${pct(b.recall)}</td><td>${pct(b.falsePositiveRate)}</td></tr>${semanticComparison.runs.map(run=>`<tr><td>${esc(run.name)}</td><td>${run.result.correct}/${run.result.total} · ${pct(run.result.accuracy)}</td><td>${pct(run.result.recall)}</td><td>${pct(run.result.falsePositiveRate)}</td></tr>`).join('')}</tbody></table></div><p>Исходные NLI-конфигурации выдали всем примерам низкий приоритет. После уточнения гипотез и стандартной нормализации гибрид исправил 3 случая, но ухудшил 7. Итог 56% против 58% правил, ложные высокие выросли до 7,5%. Проверенные варианты не прошли условие внедрения. Это не оценка всех языковых моделей и не вероятность мошенничества.</p><p><a href="./submission/SEMANTIC_EXPERIMENT.md">Метод и решение о внедрении</a> · <a href="./submission/semantic-comparison.json" download>Сводка JSON</a>${semanticComparison.runs.map((run,i)=>` · <a href="./submission/${esc(run.report)}" download>Все результаты запуска ${i+1}</a>`).join('')}</p></section>`;}
function developmentSection(){
 const r=development.sets['independent-v5'],b=development.comparison.baseline,v6=development.freshV6Development,v7=development.freshV7Development;
 const correct=r=>r.cases.filter(c=>c.match).length;
 return `<details class="quality-development"><summary>Доработка на открытых примерах — результаты и прежние ошибки</summary><section class="method-intro"><h2>Что изменилось в v2.0</h2><p>Уточнены роли обязательного платежа и обычной записи в список, отрицания бесплатного допуска, выдача награды и доставка после победы, предварительный отбор и финальный выбор. Явно отменённый фрагмент отделяется от действующих условий даже внутри одного предложения. Добавлены общие варианты русских и казахских формулировок и транслита.</p><p><strong>Наборы ниже уже использовались при настройке правил.</strong> Это результаты разработки, а не новая проверка обобщения.</p><div class="table-wrap"><table class="matrix"><thead><tr><th>Открытый набор</th><th>v1.9</th><th>v2.0</th></tr></thead><tbody><tr><td>Прежние 200 сценариев v5</td><td>${correct(b)}/${b.total}</td><td>${correct(r)}/${r.total}</td></tr><tr><td>80 изученных сценариев v6</td><td>${correct(v6.before)}/${v6.before.total}</td><td>${correct(v6.after)}/${v6.after.total}</td></tr><tr><td>100 сценариев v7, изученных после первого прогона</td><td>${correct(v7.before)}/${v7.before.total}</td><td>${correct(v7.after)}/${v7.after.total}</td></tr></tbody></table></div><p>Первый v1.9/v7 дал 56/100 ответов и нашёл 13/40 высоких приоритетов. После изучения ошибок v7 использован при настройке v2.0. Полученные на нём 99/100 не считаются слепой точностью; оставшийся спорный высокий ответ тоже сохранён.</p><p>Ещё раньше первый v1.8/v6 дал 35/80 ответов. Затем v6 был открыт и использован при доработке. Два отдельных AI-разметчика согласились в 80/80 меток v6; это не человеческая разметка.</p><p><a href="./submission/fresh-ai-v7-report.json" download>Первый v1.9/v7 со всеми ошибками</a> · <a href="./submission/fresh-ai-v6-report.json" download>Первый v1.8/v6</a> · <a href="./submission/development-v20-report.json" download>Все результаты открытой разработки v2.0</a></p><p><a href="./submission/ENGINE_V20.md" download>Изменения и воспроизведение</a> · <a href="./submission/loading-v20-report.json" download>Загрузка данных только при открытии отчёта</a></p><p>Нет проверки настоящего потока и измерения пользы с аналитиками. Новые формулировки, сложные альтернативные маршруты участия и контекст нескольких предложений остаются возможными источниками ошибок.</p></section></details>`;
}

function freshValidationSection(fresh){
 const r=fresh.result,correct=r.cases.filter(c=>c.match).length,errors=r.cases.filter(c=>!c.match),version='v'+fresh.engineVersion.split('.').slice(0,2).join('.');
 const metrics=[[pct(r.accuracy),'Совпадение трёх уровней',`${correct} из ${r.total} сценариев`],[pct(r.precision),'Точность высокого',`${r.tp} верных из ${r.tp+r.fp} высоких ответов`],[pct(r.recall),'Полнота высокого',`${r.tp} найдено из ${r.tp+r.fn} ожидаемых высоких`],[pct(r.falsePositiveRate),'Ложные высокие',`${r.fp} из ${r.fp+r.tn} остальных сценариев`]];
 return `<section class="fresh-validation" aria-labelledby="fresh-title"><p class="paper-eyebrow">История · зафиксированный движок v2.0</p><h2 id="fresh-title">Сохранённый первый тест ${esc(version)}: ${r.total} сценариев.</h2><p>Набор подготовил отдельный AI-автор без доступа к движку, прежним примерам и прогнозам. Версия v2.0 зафиксирована до создания набора; первый результат сохранён неизменным. Он не является новой оценкой текущего патча v2.0.1.</p><div class="fresh-metrics">${metrics.map(([v,label,n])=>`<div><strong>${v}</strong><h3>${label}</h3><p>${n}</p></div>`).join('')}</div><p class="fresh-limit"><strong>Это синтетический тест с AI-метками.</strong> Он не измеряет качество на настоящих публикациях, работу OCR или пользу для аналитиков. Размер набора и частоты классов заданы авторами. Ошибок цитат и исходных позиций: ${r.quoteErrors}.</p><p class="fresh-error-count">Несовпадений трёх уровней: <strong>${errors.length} из ${r.total}</strong>. Пропущено высоких: <strong>${r.fn} из ${r.tp+r.fn}</strong>.</p><details class="fresh-breakdown"><summary>По языкам, интервалы и ошибки</summary><div class="table-wrap"><table class="matrix"><thead><tr><th>Язык</th><th>N</th><th>Совпадение</th><th>Полнота высокого</th></tr></thead><tbody>${Object.entries(r.byLanguage).map(([k,v])=>`<tr><td>${esc(langs[k]||k)}</td><td>${v.n}</td><td>${pct(v.accuracy)}</td><td>${pct(v.recall)}</td></tr>`).join('')}</tbody></table></div><p>95% интервалы Уилсона: совпадение ${ci(r.confidence95.accuracy)}, точность высокого ${ci(r.confidence95.precision)}, полнота ${ci(r.confidence95.recall)}, ложные высокие ${ci(r.confidence95.falsePositiveRate)}. Интервалы не устраняют ограничения синтетического корпуса.</p>${errors.length?`<ul class="fresh-errors">${errors.map(c=>`<li><strong>${esc(c.title)}</strong><span>${esc(langs[c.language])} · AI-метка: ${esc(names[c.expected])}; движок: ${esc(names[c.predicted])}</span></li>`).join('')}</ul>`:'<p>В этом небольшом наборе несовпадений не найдено; это не гарантия отсутствия ошибок на других материалах.</p>'}</details><p>Второй AI-разметчик, получивший только тексты и инструкцию без первых меток, квот, кода и прогнозов, совпал в ${v8Agreement.agreed}/${v8Agreement.n} меток (κ=${v8Agreement.cohenKappa}). Оба разметчика — AI; человеческая экспертиза отсутствует.</p><div class="fresh-downloads"><a href="./submission/fresh-ai-v8-report.json" download>Первый результат и все прогнозы</a><a href="./submission/fresh-ai-v8.json" download>Все исходные сценарии и AI-метки</a><a href="./submission/fresh-ai-v8-predictions.csv" download>Таблица результатов</a><a href="./submission/fresh-ai-v8-agreement.json" download>Согласие AI-разметчиков и протокол</a><a href="./submission/fresh-ai-v8-second-labels.json" download>Все вторые AI-метки</a></div><p class="fresh-disclosure">После раскрытия этот набор считается открытым. Настройка правил по его ошибкам потребует следующего нового теста.</p></section>`;
}
function readinessSummary(){
 return `<section class="quality-readiness" aria-labelledby="readiness-title"><div class="quality-readiness-title"><p class="paper-eyebrow">SafeNet KZ · трек 1</p><h2 id="readiness-title">Главное перед проверкой.</h2></div><div class="quality-readiness-grid"><article><h3>Что умеет прототип</h3><ul><li>Разбирает текст и скриншоты на русском и казахском.</li><li>Показывает признаки вместе с исходными цитатами.</li><li>Собирает материалы одного розыгрыша и показывает наблюдаемые связи.</li></ul></article><article><h3>Что ещё нужно подтвердить</h3><p>Оценочные корпуса — синтетические. Проверка настоящих публикаций специалистами и экономия времени аналитиков пока не измерены.</p><p>Автоматический приоритет помогает выбрать, что проверить человеку.</p></article><article><h3>Материалы для защиты</h3><a href="./submission/IZ_SafeNet_Deck.pdf" target="_blank" rel="noopener noreferrer">Презентация MVP · тест v2.0</a><a href="./submission/METHODOLOGY.md" download>Методика и признаки</a><a href="./submission/PITCH.md" download>Сценарий на 5 минут</a><a href="./submission/pilot-quickstart.html" target="_blank" rel="noopener noreferrer">Как провести замер пользы</a></article></div></section>`;
}
export function qualityPage(){
 const r=release.independent||release.holdout,errors=r.cases.filter(c=>!c.match),q=r.triage,agreement=release.annotationAgreement;
 const comparison=release.comparison,delta=comparison?(r.accuracy-comparison.baseline.accuracy)*100:null;
 const signedDelta=delta===null?'':`${delta>=0?'+':''}${delta.toFixed(1).replace('.',',')} п. п.`;
 return `<section class="quality-page">
 <button class="back-button" data-action="quick-new">← К проверке</button>
 <div class="page-heading"><div><h1>Качество, которое можно проверить.</h1><p>Текущая версия ${esc(patch.engineVersion)} · исправления, сохранённый тест v2.0 и история проверок.</p></div><button class="button secondary" data-action="export-metrics">Полный отчёт JSON</button></div>
 <section class="method-card"><h2>Финальное исправление v2.0.1</h2><p>Устранены пустое исправление текста, ложное сообщение о записи и потеря родительского дела в копии черновика дополнений. Финансовая «комиссия в процентах» больше не принимается за судейскую оценку из-за совпадения части слова.</p><p>Детектор повторно проверен на восьми уже раскрытых наборах. На v8 все 160 прогнозов совпали с v2.0: 100/160 трёхуровневых совпадений. Это открытая регрессия, новой слепой оценки нет. Реальные публикации и польза с аналитиками не измерены.</p><p><a href="./submission/ENGINE_V201.md">Изменения и ограничения</a> · <a href="./submission/development-v201-report.json" download>Все прогнозы патча и сравнение</a> · <a href="./submission/FINAL_REVIEW.md">Финальная проверка</a></p></section>
 ${freshValidationSection(freshEvaluation)}
 ${readinessSummary()}
 ${developmentSection()}
 <details class="quality-history"><summary>История проверок v1.7, методика расчёта и все исходные отчёты</summary><div class="quality-history-body">
 <section class="method-card"><h2>Исторический слепой тест v1.7: пропущено ${r.fn} из ${r.tp+r.fn} высоких приоритетов</h2><p>Таков сохранённый результат v1.7 на скрытом тогда синтетическом наборе. Автоматическую проверку пока нельзя использовать для окончательного решения. Низкий приоритет не подтверждает безопасность предложения: движок может пропустить условия оплаты, приз или способ выбора.</p><p>Высокий приоритет требует одновременно приза, обязательной оплаты участия и случайного победителя. Сбор денег и заявленная комиссия показываются отдельно. В подробном разборе видны принятые и исключённые упоминания с ролью и точной цитатой.</p><p>Результат не определяет мошенничество, законность, подлинность аккаунта или реальный доход.</p></section>
 <section class="method-card"><h3>Вклад каждого источника</h3><p>В подробном разборе можно по очереди исключить один источник только из расчёта. Видно, какой материал поддерживает высокий приоритет и какие признаки перестают подтверждаться. Оригиналы и ручные решения сохраняются. Совпадение результатов не доказывает достоверность источников.</p></section>
 <h2>Слепой тест v1.7 на v5: ${r.total} сценариев</h2><p class="section-sub">Для оценки v1.7 корпус составил отдельный AI-автор без доступа к движку и прошлым примерам. Движок заморожен до открытия v5; снимок v1.7 после первого результата не менялся. Версии v1.8 и v1.9 разрабатывались уже на открытом v5. Материалы синтетические. Проверки на реальных публикациях и разметки специалистами пока нет.</p>
 <div class="stat-grid">${[[pct(r.precision),'Точность высокого',`${r.tp} верных из ${r.tp+r.fp} высоких`],[pct(r.recall),'Полнота высокого',`${r.tp} найдено из ${r.tp+r.fn} ожидаемых высоких`],[pct(r.falsePositiveRate),'Ложные высокие',`${r.fp} из ${r.fp+r.tn} остальных`],[`${r.cases.filter(c=>c.match).length}/${r.total}`,'Три уровня',`${pct(r.accuracy)} совпадений`]].map(([v,t,n])=>`<div class="stat-card"><div class="stat-copy"><strong>${v}</strong><p>${t}</p><small>${n}</small></div></div>`).join('')}</div>
 <p class="metrics-note">Положительный класс в строгом расчёте — только высокий приоритет. Средний и низкий считаются отрицательными. TP=${r.tp}, FP=${r.fp}, FN=${r.fn}, TN=${r.tn}. 95% интервалы Уилсона: точность ${ci(r.confidence95.precision)}, полнота ${ci(r.confidence95.recall)}, FPR ${ci(r.confidence95.falsePositiveRate)}. Частоты классов заданы авторами и не отражают их распространённость в соцсетях.</p>
 <section class="method-card"><h3>Нагрузка на очередь аналитика</h3><p>Отдельный расчёт: высокий + средний против низкого. TP=${q.tp}, FP=${q.fp}, FN=${q.fn}, TN=${q.tn}. Точность ${pct(q.precision)}, полнота ${pct(q.recall)}, FPR ${pct(q.falsePositiveRate)}: ${q.fp} из ${q.fp+q.tn} ожидаемых низких попали в очередь. Ещё ${q.fn} из ${q.tp+q.fn} ожидаемых средних и высоких в неё не попали.</p><p>95% интервалы Уилсона: точность ${ci(q.confidence95.precision)}, полнота ${ci(q.confidence95.recall)}, FPR ${ci(q.confidence95.falsePositiveRate)}.</p></section>
 <div class="method-grid"><section class="method-card"><h3>Ожидание AI / результат</h3><table class="matrix"><thead><tr><th>AI-метка</th><th>Высокий</th><th>Средний</th><th>Низкий</th></tr></thead><tbody>${['high','medium','low'].map(k=>`<tr><td>${esc(names[k])}</td>${['high','medium','low'].map(p=>`<td class="${p===k?'match':''}">${r.matrix[k][p]}</td>`).join('')}</tr>`).join('')}</tbody></table><p>Ошибок исходных цитат и их смещений: ${r.quoteErrors}.</p></section>
 <section class="method-card"><h3>Вторая скрытая AI-разметка</h3>${agreement?`<p>Совпадение меток ${agreement.agreed}/${agreement.n} (${pct(agreement.agreement)}), κ Коэна ${agreement.cohenKappa===null?'не определён':agreement.cohenKappa.toFixed(3)}. Второй AI-разметчик не видел первые метки, движок и его предсказания.</p><p>Оба разметчика — AI. Согласие по одной инструкции не заменяет разметку двух специалистов и разрешение спорных случаев человеком.</p>`:'<p>Отдельная аннотация не получена. Отсутствие результата не считается согласием.</p>'}</section></div>
 <section class="method-card"><h3>Разбивка по языку</h3><div class="table-wrap"><table class="matrix"><thead><tr><th>Язык</th><th>N</th><th>Точность</th><th>Полнота</th><th>FPR</th><th>Три уровня</th></tr></thead><tbody>${Object.entries(r.byLanguage).map(([l,v])=>`<tr><td>${esc(langs[l]||l)}</td><td>${v.n}</td><td>${pct(v.precision)}</td><td>${pct(v.recall)}</td><td>${pct(v.falsePositiveRate)}</td><td>${pct(v.accuracy)}</td></tr>`).join('')}</tbody></table></div><p>Языковые подгруппы малы. В частности, точность ${pct(r.byLanguage.translit?.precision)} в транслите основана лишь на ${(r.byLanguage.translit?.tp||0)+(r.byLanguage.translit?.fp||0)} высоких ответах; полнота — ${pct(r.byLanguage.translit?.recall)}. Эти показатели нельзя переносить на произвольные новые формулировки.</p><details><summary>95% интервалы по языкам</summary>${Object.entries(r.byLanguage).map(([l,v])=>`<p>${esc(langs[l]||l)}: точность ${ci(v.confidence95?.precision)}, полнота ${ci(v.confidence95?.recall)}, FPR ${ci(v.confidence95?.falsePositiveRate)}.</p>`).join('')}</details></section>
 <section class="method-card"><h3>Все ошибки остаются в отчёте</h3>${errors.length?`<p>Несовпадений: ${errors.length}. Данные и AI-метки после замера не менялись.</p><details><summary>Все ${errors.length} несовпадения</summary><div class="table-wrap"><table class="matrix"><thead><tr><th>ID</th><th>Язык</th><th>Ожидалось по AI</th><th>Получено</th></tr></thead><tbody>${errors.map(e=>`<tr><td>${esc(e.id)}</td><td>${esc(langs[e.language]||e.language)}</td><td>${esc(names[e.expected])}</td><td>${esc(names[e.predicted])}</td></tr>`).join('')}</tbody></table></div></details>`:'<p>На этом наборе несовпадений не обнаружено. Это не означает отсутствия ошибок на других материалах.</p>'}
 ${errorExamples(r)}
 <p><a href="./independent-v5.json" download>Все 200 сценариев и AI-метки v5</a> · <a href="./evaluation-report.json" download>Все предсказания JSON</a> · <a href="./submission/release-metrics.csv" download>Результаты CSV</a></p></section>
 ${semanticSection()}
 <section class="method-card"><h3>Сравнение на одном и том же v5</h3>${comparison?`<p>На ${r.total} одинаковых сценариях замороженная ${esc(comparison.baseline.engineVersion)} дала ${Math.round(comparison.baseline.accuracy*r.total)}/${r.total} совпадений; ${esc(release.engineVersion)} — ${Math.round(r.accuracy*r.total)}/${r.total}. Разница ${signedDelta}. Исправлено ${comparison.paired.corrected} ответов, ухудшено ${comparison.paired.worsened}; оба движка ответили верно в ${comparison.paired.bothCorrect} случаях и ошиблись в ${comparison.paired.bothWrong}.</p>`:''}<p>Все прежние наборы v1–v4 теперь открыты и использованы при разработке. Их высокие результаты являются регрессией, а не новой независимой проверкой. История прошлых замеров сохранена. Перенос на новые тексты остаётся главным ограничением.</p><p>Первый технический запуск старого v2 с неверным ID/campaignRef был недействителен. Исправление адаптера и первоначальный ошибочный отчёт сохранены в истории.</p></section>
 <section class="method-card"><h3>Функциональные проверки</h3><ul>${checkLinks.map(([file,label,count])=>`<li><a href="./submission/${file}" download>${label}</a>: ${count}/${count}.</li>`).join('')}</ul><p>Это проверки отдельных программных контрактов и регрессий; они не складываются в показатель точности детектора. Проверка фокуса использует программные модели элементов, а контраста — расчёт для заданных цветовых пар. Полная проверка доступности сайта и исследование удобства с людьми не проводились.</p></section>
 <section class="method-card"><h3>Изображения и производительность</h3><p>OCR русского и казахского работает в браузере. Есть две прежние чистые пробы и четыре контролируемые пробы: мелкий текст, тёмный фон с наклоном, смешанный текст с переносами и предупреждение. Ошибки символов и слов опубликованы отдельно. Это не корпус настоящих скриншотов.</p><p><a href="./submission/ocr-stress-report.json" download>Результаты OCR</a>. Речь из видео не распознаётся: расшифровку предоставляет пользователь.</p><p>Локальный микрозамер: ${release.performance.iterations.toLocaleString('ru-RU')} коротких вызовов правил на старых текстах, p95 ${release.performance.p95Ms.toFixed(3)} мс. OCR, сеть, интерфейс, хранение, Web Worker и серверная конкуренция в этот показатель не входят.</p></section>
 <section class="method-card"><h3>Воспроизводимость</h3><p>Сохранены движок, SHA-256, первая и вторая AI-разметки, скрипт расчёта, все предсказания и история. Манифест первого прогона фиксирует хеши движка, корпуса, базовой версии, скрипта и второй разметки. Повторный прогон проверяет воспроизводимость и не создаёт новый скрытый тест.</p><p><a href="./submission/engine-v1.7-freeze.json" download>Freeze движка</a> · <a href="./submission/independent-v5.sha256" download>SHA-256 v5</a> · <a href="./submission/independent-v5-first-run.json" download>Первый прогон</a> · <a href="./submission/independent-v5-second-labels.json" download>Вторая AI-разметка</a> · <a href="./submission/EVALUATION.md" download>Протокол и история</a></p><p>Ручной разбор сохраняет подтверждения трёх признаков с точными цитатами и отдельный приоритет специалиста. Он не исправляет автоматические ответы в этих метриках.</p><p>Презентация, методология и план пилота — в <a href="./submission/">пакете для защиты</a>.</p></section>
 <section class="about-limits"><h2>Что требуется для реального пилота</h2><p>Разрешённые обезличенные исходные публикации с полными условиями, два специалиста для разметки, отдельный свежий тест и измерение времени работы аналитиков. Нужны серверная очередь, роли и согласованные сроки хранения. Произвольного обхода Instagram/TikTok и общего доступа команды в MVP нет.</p><button class="button secondary" data-action="nav" data-route="sources">Посмотреть первичные справочные источники</button></section>
 </div></details>
 </section>`;
}

export function qualityMetricsReport(){return {currentEngineVersion:patch.engineVersion,currentOpenPatch:patch,historicalFirstV20V8:freshEvaluation,currentOpenDevelopment:development,currentAiAnnotationAgreement:v8Agreement,historicalFirstV19V7:firstV7Evaluation,historicalFirstV18V6:firstV6Evaluation,historicalFrozenV17:release,notice:'Current v2.0.1 is an open regression patch, not a new blind result. v2.0 was frozen before the new AI-authored v8 corpus. v1-v7 are open development data. The first v1.9/v7 and v1.8/v6 results remain preserved. All data and labels are synthetic; human and real-world validation are absent.'};}
