/**
 * ІЗ · Track 1: paid raffle evidence baseline.
 * Local deterministic rules; priority points are not a calibrated probability.
 * Evidence always refers to a verbatim substring of source.text.
 */
export const ENGINE_VERSION = '1.4.0-track1-rules';

const RX = {
  prize: /(?:приз(?:[а-яё]*)|розыгрыш(?:[а-яё]*)|разыгр(?:[а-яё]*)|выигра(?:[а-яё]*)|дарим|подарим|(?:победител[а-яё]*|лучш[а-яё]*\s+работ[а-яё]*)[^\n.!?]{0,35}(?:получит|достанется)|шанс\s+на\s+[^\n.!?]{1,40}|ұтыс(?:[а-яёәіңғүұқөһ]*)|утыс(?:[а-яё]*)|жүлде(?:[а-яёәіңғүұқөһ]*)|ойнат[а-яёәіңғүұқөһ]*|сыйлық|сыйла[а-яёәіңғүұқөһ]*|zhulde\w*|j[uü]lde\w*|utys\w*|o[iy]nat\w*|rozygrysh\w*|razygr\w*|priz\w*|vyigra\w*|darim|podarim|giveaway|prize\w*|win\s+(?:a|an|the)\s+\w+)/giu,
  random: /(?:рандом(?:[а-яё]*)|random(?:i[sz]er)?|случайн(?:[а-яё]*)|slucha[iy]n\w*|жереб(?:[а-яё]*)|zhereb\w*|лототрон(?:[а-яё]*)|кездейсоқ(?:[а-яёәіңғүұқөһ]*)|кездейсок(?:[а-яё]*)|кездесоқ(?:[а-яёәіңғүұқөһ]*)|kezdei?s[oqk][qo]?[a-z]*|kezdeisoq\w*|kездейсоқ|random\s*таңдау|колес[оа]\s+(?:фортуны|удачи|рандома)|(?:крутим|вращаем|запускаем)[^\n.!?]{0,25}колес[оа]|wheel\s+of\s+(?:names|fortune)|сәттілік\s+дөңгелегі)/giu,
  warning: /(?:не\s+(?:переводите|платите|оплачивайте|отправляйте\s+деньги|участвуйте)|не\s+ведитесь|осторожно[^\n.!?]{0,35}(?:мошен|схем|обман)|предупреждени[ея]|(?:это|похоже\s+на)\s+мошенничество|мошенники\s+(?:пишут|обещают|предлагают|просят)|(?:учебн[а-яё]*\s+)?разбор\s+(?:мошенническ[а-яё]*|схем[а-яё]*)|учебн[а-яё]*\s+пример|математическ[а-яё]*\s+задач[а-яё]*|цитата\s+(?:мошенник[а-яё]*|из\s+подозрительн[а-яё]*)|ақша\s+(?:аудармаңыз|жібермеңіз)|ақша\s+аударма|төлемеңіз|сақ\s+бол(?:ыңыз)?|алаяқтар\s+(?:ұсынады|жазады|сұрайды)|алаяқтық\s+туралы\s+ескерту|aqsha\s+audarmanyz|saq\s+bol|do\s+not\s+(?:pay|send\s+money)|scam\s+(?:warning|alert))/giu,
  free: /(?:бесплатн(?:[а-яё]*)|besplatn\w*|bez\s+(?:oplat\w*|pokup\w*|vznos\w*)|без\s+(?:оплаты|платеж(?:а|ей)|взнос(?:а|ов)|покуп(?:ки|ок)|денежн[а-яё]*\s+взнос[а-яё]*)|оплата\s+не\s+(?:нужна|требуется|обязательна)|платить\s+не\s+нужно|покупка\s+не\s+обязательна|тегін(?:[а-яёәіңғүұқөһ]*)|тегин(?:[а-яё]*)|tegin\w*|ақысыз|төлем\s+(?:қажет\s+емес|талап\s+етілмейді)|сатып\s+алу\s+(?:қажет\s+емес|міндетті\s+емес)|free\s+(?:entry|participation)|no\s+purchase\s+necessary|no\s+(?:fee|payment)\s+(?:required|needed))/giu,
  income: /(?:комисси[а-яё]*\s+(?:организатор[а-яё]*|ұйымдастырушы[а-яёәіңғүұқөһ]*)|(?:организатор[а-яё]*|ұйымдастырушы[а-яёәіңғүұқөһ]*)[^\n.!?]{0,55}(?:комисси[а-яё]*|доход[а-яё]*|прибыл[а-яё]*|заработ[а-яё]*|выручк[а-яё]*|табыс[а-яёәіңғүұқөһ]*)|(?:доход[а-яё]*|прибыл[а-яё]*|выручк[а-яё]*)\s+организатор[а-яё]*|(?:комисси[а-яё]*|табыс[а-яёәіңғүұқөһ]*)\s+ұйымдастырушы[а-яёәіңғүұқөһ]*|organizer.{0,35}(?:commission|income|profit)|commission.{0,20}organizer)/giu,
  collection: /(?:(?:собираем|сбор)[^\n.!?]{0,35}(?:деньг[а-яё]*|оплат[а-яё]*|взнос[а-яё]*|\d[\d\s.,]*\s*(?:₸|тг|тенге))|(?:продаж[а-яё]*|прода[её]м)[^\n.!?]{0,30}(?:слот[а-яё]*|билет[а-яё]*|номер[а-яё]*)|(?:слот|билет|номер|нөмір|slot|ticket)[^\n.!?]{0,20}\d[\d\s.,]*\s*(?:₸|тг|тенге)|ақша\s+жина[а-яёәіңғүұқөһ]*|selling\s+(?:slots|tickets))/giu,
  judged: /(?:победител[а-яё]*[^\n.!?]{0,45}(?:жюри|по\s+оценк[а-яё]*|по\s+балл[а-яё]*)|(?:выбирает|определяет|решает)\s+жюри|(?:оценк[а-яё]*|решени[а-яё]*)\s+жюри|қазылар\s+алқасы|қазылар[^\n.!?]{0,35}(?:анықтайды|таңдайды)|jury\s+(?:chooses|selects)|winner[^\n.!?]{0,35}(?:skill|jury))/iu,
  sale: /(?:прода[мёею][а-яё]*|продажа|купить|магазин|товар|сатамын|сатылым|сатып\s+алыңыз|for\s+sale|sell\w*|price)/iu,
};

const participation = '(?:участи[а-яё]*|участв[а-яё]*|uchast[a-z]*|қатыс[а-яёәіңғүұқөһ]*|qatys[a-z]*|participat[a-z]*|entry|enter)';
const pay = '(?<![a-zа-яёәіңғүұқөһ])(?:оплат[а-яё]*|oplat[a-z]*|платёж[а-яё]*|платеж[а-яё]*|платн[а-яё]*|перевод[а-яё]*|перевед[а-яё]*|pereved[a-z]*|взнос[а-яё]*|vznos[a-z]*|внес[а-яё]*|пожертвован[а-яё]*|куп[иі][а-яё]*|kupi[a-z]*|покуп[а-яё]*|pokup[a-z]*|донат[а-яё]*|төле[а-яёәіңғүұқөһ]*|төлем[а-яёәіңғүұқөһ]*|ақылы|акы[лд][а-яё]*|сатып\\s+ал[а-яёәіңғүұқөһ]*|tole[a-z]*|aqyly|paid|pay(?:ment)?|buy|purchas[a-z]*|donat[a-z]*)';
const span = '[^\\n.!?]{0,90}';
const feePatterns = [
  new RegExp(`${participation}${span}${pay}`, 'giu'),
  new RegExp(`${pay}${span}${participation}`, 'giu'),
  /(?:участие\s+не\s+бесплатно|қатысу\s+тегін\s+емес|qatysu\s+tegin\s+emes|participation\s+is\s+not\s+free)/giu,
  /(?:вступительн[а-яё]*\s+взнос|взнос\s+за\s+(?:билет|номер|слот)|обязательн[а-яё]*\s+(?:донат|покупк[а-яё]*|оплат[а-яё]*)|міндетті\s+(?:төлем|сатып\s+алу|донат)|mandatory\s+(?:purchase|donation|payment))/giu,
  /(?:номер|нөмір|номір|nomer|билет|слот|slot|ticket|bilet|n[oö]mir)[^\n.!?]{0,25}(?:\d[\d\s.,]{0,14}\s*(?:₸|тг|теңге|тенге|kzt|руб|₽|\$)|(?:стоит|цена|құны|бағасы|costs?|price)[^\n.!?]{0,16}\d)/giu,
  /(?:\d[\d\s.,]{0,14}\s*(?:₸|тг|теңге|тенге|kzt|руб|₽|\$))\s*(?:за|үшін|for)\s+(?:номер|нөмір|билет|слот|ticket)/giu,
  /(?:куп[иі][а-яё]*|покуп[а-яё]*|сатып\s+ал[а-яёәіңғүұқөһ]*|buy|purchase)[^\n.!?]{0,35}(?:номер|нөмір|билет|слот|ticket|bilet)/giu,
  /(?:обязательно\s+)?(?:перевед[а-яё]*|внес[а-яё]*)[^\n.!?]{0,45}(?:пожертвован[а-яё]*|донат[а-яё]*|взнос[а-яё]*)/giu,
  /регистрационн[а-яё]*\s+взнос/giu,
  /(?:продаж[а-яё]*|прода[её]м)[^\n.!?]{0,30}(?:слот[а-яё]*|билет[а-яё]*|номер[а-яё]*)/giu,
  /за\s+(?:билет|номер|слот|участие)[^\n.!?]{0,55}(?:перевод|на\s+карту)/giu,
  /қатысу\s+(?:құны|бағасы)[^\n.!?]{0,15}\d[\d\s.,]*\s*(?:₸|тг|теңге|тенге|kzt)/giu,
  /(?:слот|билет|номер|нөмір)\s+(?:за\s+)?\d+(?:[.,]\d+)?\s*к\s*(?:₸|тг|теңге|тенге)/giu,
];

const labels = {
  prize: 'В источнике заявлен приз или розыгрыш.',
  payment: 'В источнике указано платное условие участия.',
  random: 'В источнике заявлен случайный выбор победителя.',
  income: 'В источнике явно заявлена комиссия или доход организатора; это заявление источника.',
  collection: 'В тексте указан сбор денег или продажа мест. Фактические поступления и прибыль не проверены.',
  free: 'В источнике заявлено бесплатное участие или отсутствие обязательной покупки.',
  warning: 'Источник содержит предупреждение или учебный разбор; цитируемое предложение не приписывается автору.',
};

function matches(text, regex) {
  const copy = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
  return [...text.matchAll(copy)];
}

function negativeBefore(text, start, key) {
  const before = text.slice(Math.max(0, start - 32), start);
  if (key === 'free') return /(?:не|емес|not|ne)\s*$/iu.test(before);
  if (key === 'random') return /(?:не|без|no|not)\s*(?:будет\s+|используем\s+)?$/iu.test(before);
  return false;
}

// Explicit absence of a required purchase is evidence about entry, not the prize price.
const noPurchase = /(?:(?:платить|покупать|оплачивать|приобретать|переводить\s+деньги)\s+(?:ничего\s+)?не\s+(?:нужно|требуется|обязательно)|ничего\s+(?:покупать|оплачивать)\s+не\s+(?:нужно|требуется)|(?:покупки|взносы|платежи)\s+не\s+(?:нужны|требуются)|(?:сатып\s+алу|төлеу|ақша\s+төлеу)\s+(?:керек\s+емес|қажет\s+емес|міндетті\s+емес)|(?:kupovat|pokupat|platit)\s+ne\s+(?:nuzhno|nado)|no\s+entry\s+fee)/giu;

function sentenceAt(text, match) {
  const at = match.index ?? 0;
  const end = at + match[0].length;
  const separators = ['\n', '.', '!', '?', ';'];
  let start = 0;
  let finish = text.length;
  for (const separator of separators) {
    start = Math.max(start, text.lastIndexOf(separator, at - 1) + 1);
    const candidate = text.indexOf(separator, end);
    if (candidate >= 0) finish = Math.min(finish, candidate + (separator === '\n' ? 0 : 1));
  }
  return { start, end: finish, text: text.slice(start, finish) };
}

function unavailable(text, match, key) {
  const context = sentenceAt(text, match);
  const sentence = context.text;
  if (key === 'prize' || key === 'random') {
    const relative = (match.index ?? 0) - context.start;
    const before = sentence.slice(0, relative);
    const after = sentence.slice(relative + match[0].length);
    if (/нет\s*(?:никак[а-яё]*\s*)?$/iu.test(before)) return true;
    if (key === 'random' && /^[\s,]*(?:(?:таңдау|таңдай|анықтау|анықтай)[а-яёәіңғүұқөһ]*\s+)?(?:емес|таңдамаймыз|таңдалмайды|анықталмайды|қолданбаймыз)/iu.test(after)) return true;
    if (/^[\s,]*(?:(?:и|или|выбор[а-яё]*|жереб[а-яё]*|приз[а-яё]*|розыгрыш[а-яё]*|случайн[а-яё]*)[\s,]*){0,8}(?:нет|не\s+будет|не\s+проводим|не\s+проводит|не\s+предусмотрен|не\s+(?:использу[а-яё]*|применя[а-яё]*)|жоқ|қолданылмайды)/iu.test(after)) return true;
    if (/(?:ещё|еще|пока|не)[^.!?]{0,25}(?:не\s+указан|не\s+объявлен|не\s+сообщаем|не\s+известен|обсуждаем)/iu.test(sentence)) return true;
  }
  if (key === 'prize' && /(?:описание\s+приза\s+появится|приз[^.!?]{0,50}(?:ещё|еще|пока)[^.!?]{0,15}не\s+объявлен)/iu.test(sentence)) return true;
  return false;
}

function quoteFor(source, match, reason) {
  const text = String(source.text ?? '');
  const at = match.index ?? 0;
  const endOfMatch = at + match[0].length;
  let { start, end } = sentenceAt(text, match);
  if (end - start > 240) {
    start = Math.max(start, at - 55);
    end = Math.min(end, Math.max(endOfMatch, at + 180));
  }
  while (start < at && /\s/u.test(text[start])) start += 1;
  while (end > endOfMatch && /\s/u.test(text[end - 1])) end -= 1;
  return { sourceId: source.id, quote: text.slice(start, end), start, end, reason };
}

function addEvidence(signal, source, match, reason) {
  const evidence = quoteFor(source, match, reason);
  if (!signal.evidence.some(item => item.sourceId === evidence.sourceId && item.start === evidence.start && item.end === evidence.end)) {
    signal.evidence.push(evidence);
  }
}

function freeContext(text, match) {
  const at = match.index ?? 0;
  const sentenceStart = Math.max(text.lastIndexOf('\n', at - 1), text.lastIndexOf('.', at - 1), text.lastIndexOf('!', at - 1), text.lastIndexOf('?', at - 1)) + 1;
  const next = text.slice(at).search(/[\n.!?]/u);
  const sentenceEnd = next < 0 ? text.length : at + next;
  const sentence = text.slice(sentenceStart, sentenceEnd);
  const found = match[0];
  if (/^(?:бесплатн[а-яё]*|тегін|тегин|tegin|ақысыз)\s+(?:доставк|жеткізу|shipping|delivery)/iu.test(text.slice(at))) return false;
  if (/(?:бесплатн[а-яё]*[^\n.!?]{0,45}нет|без\s+покупки[^\n.!?]{0,35}(?:не\s+выда|нельзя|не\s+допуска|не\s+участв)|без\s+оплаты[^\n.!?]{0,35}(?:нельзя|не\s+выда|не\s+участв))/iu.test(sentence)) return false;
  // A free delivery, gift, referral or service is not evidence of free entry.
  if (/бесплатн|тегін|тегин|tegin|ақысыз/iu.test(found)
    && /(?:доставк|жеткізу|shipping|delivery|бонус|консультаци|сервис)/iu.test(sentence)
    && !new RegExp(participation, 'iu').test(sentence)) return false;
  if (/(?:тегін|тегин|tegin)[^\n.!?]{0,12}емес/iu.test(text.slice(at, at + found.length + 16))) return false;
  return true;
}

function feeIsNegated(text, match) {
  const raw = sentenceAt(text, match).text;
  // Keep opposite clauses separate; an optional purchase does not negate a required ticket.
  const clauses = raw.split(/[,;]|\s+(?:но|однако|бірақ)\s+/iu);
  const matchPayment = matches(match[0], new RegExp(pay, 'giu')).map(m => m[0]);
  const fragment = clauses.find(c => matchPayment.some(p => c.includes(p))) || raw;
  const before = text.slice(Math.max(0, (match.index ?? 0) - 28), match.index ?? 0);
  if (matches(fragment, noPurchase).length) return true;
  if (/(?:bez\s+(?:oplat[a-z]*|pokup[a-z]*|vznos[a-z]*)|(?:төлем|донат|сатып\s+алу)\s+(?:қажет\s+емес|міндетті\s+емес))/iu.test(fragment)) return true;
  if (/(?:не|без|no|not)\s*$/iu.test(before) && !/не\s+бесплатно/iu.test(fragment)) return true;
  if (/(?:без\s+оплаты|без\s+покупки|не\s+нужно\s+(?:платить|покупать)|(?:оплата|покупка|платёж|платеж)\s+не\s+(?:нужна|требуется|обязательна|является)|(?:платить|покупать|оплачивать|переводить\s+деньги)[^\n.!?]{0,35}не\s+(?:нужно|обязательно)|никаких\s+(?:взнос[а-яё]*|платеж[а-яё]*)|покупать\s+не\s+обязательно|(?:необязательн[а-яё]*|добровольн[а-яё]*)\s+(?:донат|пожертвован[а-яё]*)|(?:донат|пожертвован[а-яё]*)\s+(?:не\s+обязателен|по\s+желанию|добровольн[а-яё]*)|(?:төлем|сатып\s+алу)\s+(?:қажет\s+емес|міндетті\s+емес)|no\s+purchase|optional\s+donation|взнос\s+не\s+даёт\s+участия|участие\s+и\s+оплату\s+мы\s+не\s+принимаем|пока\s+не\s+сообщаем|нужна\s+ли\s+(?:покупка|оплата))/iu.test(fragment)) return true;
  // Price of a prize and payment for delivery after winning have another role.
  if (/(?:доставк|жеткізу|delivery|shipping)/iu.test(fragment)
    && /(?:победител|после\s+выигрыш|после\s+победы|ұтқан|жеңімпаз|winner|after\s+winning)/iu.test(fragment)
    && !/(?:для\s+участия|чтобы\s+участвовать|қатысу\s+үшін|обязательн[а-яё]*\s+оплат)/iu.test(fragment)) return true;
  if (/(?:стоимост[а-яё]*\s+приз|цен[а-яё]*\s+приз|приз[^\n.!?]{0,15}стоит|жүлденің\s+бағасы)/iu.test(fragment)
    && !/(?:для\s+участия|чтобы\s+участвовать|қатысу\s+үшін|участие\s+после)/iu.test(fragment)) return true;
  return false;
}

function emptySignals() {
  return Object.fromEntries(Object.keys(labels).map(key => [key, { state: 'unknown', evidence: [] }]));
}

/** Analyze a campaign whose sources have already been explicitly grouped by the analyst. */
export function analyzeCampaign(input = {}) {
  const campaign = { ...input, sources: Array.isArray(input.sources) ? input.sources.map((source, index) => ({ ...source, id: source.id ?? `source-${index + 1}`, text: String(source.text ?? '') })) : [] };
  const signals = emptySignals();
  const reasons = [];
  const contradictions = [];
  const missing = [];
  const linkBasis = [];
  const expectedRef = String(campaign.campaignRef ?? campaign.id ?? '');
  const active = campaign.sources.filter(source => !source.campaignRef || !expectedRef || String(source.campaignRef) === expectedRef);
  const excluded = campaign.sources.filter(source => !active.includes(source));
  if (active.length > 1) {
    const linked = active.filter(source => source.campaignRef && String(source.campaignRef) === expectedRef);
    if (linked.length > 1) linkBasis.push(`Источники ${linked.map(source => source.id).join(', ')} явно отнесены к кампании «${expectedRef}» через campaignRef.`);
    if (linked.length < active.length) linkBasis.push('Часть источников сгруппирована вручную; их принадлежность кампании требует проверки аналитиком.');
  } else if (active.length === 1) {
    linkBasis.push(active[0].campaignRef ? `Источник явно отнесён к кампании «${String(active[0].campaignRef)}» через campaignRef.` : 'Анализируется один загруженный источник.');
  }
  if (excluded.length) linkBasis.push(`Источники ${excluded.map(source => source.id).join(', ')} имеют другой campaignRef и не участвуют в оценке этой кампании.`);
  const promotional = [];
  for (const source of active) {
    const warningMatches = matches(source.text, RX.warning);
    for (const match of warningMatches) addEvidence(signals.warning, source, match, labels.warning);
    let text = source.text;
    if (warningMatches.length) {
      const ranges = [];
      const ownOffer = /(?:наш(?:а|и)?\s+(?:розыгрыш|акци[яи])|а\s+у\s+нас)/iu.exec(text);
      const educational = /(?:учебн[а-яё]*\s+(?:пример|разбор)|математическ[а-яё]*\s+задач|мошенники\s+(?:пишут|обещают|предлагают|просят)|алаяқтар\s+(?:ұсынады|жазады|сұрайды))/iu.test(text);
      if (educational) ranges.push([0, ownOffer ? ownOffer.index : text.length]);
      for (const m of matches(text, /«[^»]*»|“[^”]*”|"[^"\n]*"/gu)) ranges.push([m.index, m.index + m[0].length]);
      for (const m of warningMatches) {
        const sentence = sentenceAt(text, m);
        ranges.push([sentence.start, ownOffer && ownOffer.index > m.index && ownOffer.index < sentence.end ? ownOffer.index : sentence.end]);
      }
      const chars = text.split('');
      for (const [start, end] of ranges) for (let i = start; i < end; i++) chars[i] = '\n';
      text = chars.join('');
    }
    promotional.push({ ...source, text, originalSource: source });
  }
  const raffleContext = promotional.some(source => matches(source.text, RX.prize).some(match => !unavailable(source.text, match, 'prize')));
  for (const source of promotional) {
    for (const key of ['prize', 'random', 'income', 'free']) {
      for (const match of [...matches(source.text, RX[key]), ...(key === 'free' ? matches(source.text, noPurchase) : [])]) {
        if (negativeBefore(source.text, match.index ?? 0, key) || unavailable(source.text, match, key)) continue;
        if (key === 'free' && !freeContext(source.text, match)) continue;
        if (key === 'income' && /(?:без\s+комисси|комисси[а-яё]*[^\n.!?]{0,45}(?<!\d)0\s*%|не\s+получает\s+(?:доход|прибыл))/iu.test(sentenceAt(source.text,match).text)) continue;
        addEvidence(signals[key], source.originalSource || source, match, labels[key]);
      }
    }
    if (raffleContext) for (const match of matches(source.text, RX.collection)) {
      const before=source.text.slice(Math.max(0,match.index-12),match.index);
      const after=source.text.slice(match.index+match[0].length,match.index+match[0].length+35);
      if (/(?:не|без|no)\s*$/iu.test(before)||/^\s+не\s+(?:вед[а-яё]*|провод[а-яё]*|осуществля[а-яё]*)/iu.test(after)||feeIsNegated(source.text,match)) continue;
      addEvidence(signals.collection,source.originalSource||source,match,labels.collection);
    }
    for (let patternIndex = 0; patternIndex < feePatterns.length; patternIndex += 1) {
      // A ticket or number by itself can also be a product. Require raffle context.
      if (patternIndex >= 4 && !raffleContext) continue;
      for (const match of matches(source.text, feePatterns[patternIndex])) {
        if (!feeIsNegated(source.text, match)) addEvidence(signals.payment, source.originalSource || source, match, labels.payment);
      }
    }
  }
  for (const signal of Object.values(signals)) if (signal.evidence.length) signal.state = 'found';
  const found = key => signals[key].state === 'found';
  const paymentConflict = found('payment') && found('free');
  if (paymentConflict) {
    signals.free.state = 'conflict';
    contradictions.push('В материалах одновременно заявлены бесплатное участие и обязательная оплата или покупка. Проверьте порядок публикаций и действующие условия.');
  }
  const judged = promotional.some(source => RX.judged.test(source.text));
  const incomplete = promotional.some(source => /(?:полные\s+условия[^\n.!?]{0,30}(?:позже|вечером|опубликуем|будут)|способ[^\n.!?]{0,50}не\s+(?:указан|объявлен)|(?:приз|способ\s+участия)[^\n.!?]{0,70}не\s+объявлен|информации\s+об\s+оплате[^\n.!?]{0,50}нет|подробности\s+пока\s+обсуждаем)/iu.test(source.text));
  const judgedConflict = judged && found('random');
  if (judgedConflict) {
    signals.random.state = 'conflict';
    contradictions.push('Указаны и случайный выбор, и выбор жюри или по оценкам. Порядок определения победителя требует уточнения.');
  }
  const coreCount = ['prize', 'payment', 'random'].filter(key => signals[key].state !== 'unknown').length;
  const warningOnly = coreCount === 0 && found('warning');
  const explicitFree = signals.free.state === 'found' && !found('payment');
  let risk = 'low';
  let score = 8;
  if (paymentConflict || judgedConflict) {
    risk = 'medium'; score = 65;
  } else if (found('prize') && found('payment') && found('random')) {
    risk = 'high'; score = found('income') ? 95 : 90;
  } else if (warningOnly) {
    score = 3;
  } else if (explicitFree) {
    score = 5;
  } else if (judged && !found('random')) {
    score = 12;
  } else if (coreCount >= 2) {
    risk = 'medium'; score = found('payment') ? 58 : 45;
  } else if (coreCount > 0 && incomplete) {
    risk = 'medium'; score = 35;
  } else {
    score = coreCount === 1 ? 18 : 8;
  }
  for (const key of ['prize', 'payment', 'random', 'collection', 'income']) {
    if (signals[key].state !== 'unknown') reasons.push(labels[key]);
  }
  if (warningOnly) reasons.push('Предупреждающие и цитируемые фрагменты исключены из оценки продвижения; активное предложение не найдено.');
  else if (found('warning')) reasons.push('Предупреждающие и цитируемые фрагменты сохранены как контекст. Остальные условия анализируются отдельно.');
  if (explicitFree) reasons.push('Заявлено бесплатное участие; обязательный платёж за участие не обнаружен.');
  if (judged && !found('random')) reasons.push('В источнике указан выбор жюри или по оценкам. Случайный выбор не заявлен.');
  if (!coreCount && promotional.some(source => RX.sale.test(source.text))) reasons.push('Обнаружен контекст обычной продажи; цена товара не принята за стоимость участия.');
  if (coreCount === 0 && !warningOnly && !explicitFree) reasons.push('Данных для сочетания признаков платного розыгрыша недостаточно.');
  const missingLabels = {
    prize: 'Не найдено явное указание приза или розыгрыша.',
    payment: 'Не найдено обязательное платное условие участия.',
    random: 'Не найдено явное указание случайного выбора победителя.',
    income: 'Нет явных сведений о комиссии или доходе организатора. Платёж за участие сам по себе не доказывает доход.',
  };
  for (const key of Object.keys(missingLabels)) if (signals[key].state === 'unknown') missing.push(missingLabels[key]);
  if (!active.some(source => source.text.trim())) missing.push('Нет текста для анализа. Для изображения требуется распознанный или вручную внесённый текст.');
  const summaries = {
    high: 'В материалах найдены приз, обязательное платное условие участия и случайный выбор. Кампания имеет высокий приоритет проверки аналитиком.',
    medium: contradictions.length ? 'Условия противоречат друг другу. Сохранены обе версии; требуется проверка аналитика.' : 'Найдена часть признаков розыгрыша. Условия нужно дополнить перед выводом.',
    low: warningOnly ? 'Это предупреждение о подозрительном предложении. Цитаты из него не считаются продвижением.' : explicitFree ? 'Заявлено бесплатное участие; обязательная оплата за участие не найдена.' : judged ? 'Указан оценочный конкурс с выбором жюри. Случайный выбор не найден.' : 'Сочетание признаков платного розыгрыша не установлено по загруженным материалам.',
  };
  return {
    ...campaign,
    analysis: {
      risk,
      riskLabel: { high: 'Высокий приоритет', medium: 'Нужна проверка', low: 'Низкий приоритет' }[risk],
      score,
      summary: summaries[risk],
      signals,
      reasons,
      contradictions,
      missing,
      linkBasis,
      coverage: Math.round(['prize', 'payment', 'random', 'income'].filter(key => signals[key].state !== 'unknown').length / 4 * 100),
      reviewRequired: risk !== 'low',
      engineVersion: ENGINE_VERSION,
      scoreMeaning: 'Эвристические баллы приоритета проверки, 0–100. Не вероятность и не оценка законности.',
    },
  };
}

/** Convenience wrapper: returns the same campaign + analysis shape as analyzeCampaign. */
export function analyzeText(text, options = {}) {
  const id = options.id ?? 'manual-campaign';
  return analyzeCampaign({
    id,
    title: options.title ?? 'Ручная проверка',
    organizer: options.organizer ?? 'Не указан',
    platform: options.platform ?? 'Ручной ввод',
    synthetic: options.synthetic ?? false,
    sources: [{ id: options.sourceId ?? 'manual-source', type: options.type ?? 'text', text: String(text ?? ''), author: options.author, url: options.url, timestamp: options.timestamp, campaignRef: id }],
  });
}
