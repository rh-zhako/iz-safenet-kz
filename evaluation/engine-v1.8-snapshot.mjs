/**
 * ІЗ · Track 1: paid raffle evidence baseline.
 * Local deterministic rules; priority points are not a calibrated probability.
 * Evidence always refers to a verbatim substring of source.text.
 */
export const ENGINE_VERSION = '1.8.0-track1-evidence';

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

// General language families, developed on disclosed synthetic examples. No IDs or
// complete scenario strings are used as features. Unknown terms stay unknown.
const extend=(base,extra)=>new RegExp(`(?:${base.source})|(?:${extra.source})`,base.flags);
RX.prize=extend(RX.prize,/(?:rozygr\w*|раз[ыи]гр[а-яё]*|ж[үу]лде[а-яёәіңғүұқөһ]*|в\s+подарок|подарочн[а-яё]*\s+(?:комплект|набор|сертификат)|сыйға\s+бер[а-яёәіңғүұқөһ]*|ұтып\s+ал[а-яёәіңғүұқөһ]*|подарочн[а-яё]*\s+комплект[^\n!?]{0,140}(?:выбор|обладател))/giu);
RX.random=extend(RX.random,/(?:(?:вытян[а-яё]*|достан[а-яё]*|выбер[а-яё]*)[^\n.!?]{0,35}(?:вслепую|наугад)|(?:вслепую|наугад)[^\n.!?]{0,35}(?:вытян[а-яё]*|достан[а-яё]*|выбер[а-яё]*)|көз\s+жұмып[^\n.!?]{0,65}(?:суыр[а-яёәіңғүұқөһ]*|таңда[а-яёәіңғүұқөһ]*)|kezde[iy]s[oa]q[a-z]*|rand[оo]m[a-zа-яёәіңғүұқөһ]*)/giu);
RX.warning=extend(RX.warning,/(?:абай\s+бол[а-яёәіңғүұқөһ]*|сенбеңіз|дәйексөз|ақпараттық\s+сабақ|нұсқаулықтағы\s+мысал|учебн[а-яё]*\s+(?:цитат[а-яё]*|разбор|пример)|(?:это|я|мы)\s+цитир[а-яё]*|это\s+цитата|мы\s+разбираем\s+(?:эту\s+фразу|пример)|цитата\s+для\s+(?:обсуждени[а-яё]*|разбор[а-яё]*)|eskertu|aqsha\s+zhibermengiz|bul\s+tek\s+mysal|biz\s+utys\s+otkizbe[a-z]*)/giu);
RX.free=extend(RX.free,/(?:никаких\s+(?:платеж[а-яё]*|взнос[а-яё]*|покуп[а-яё]*)|не\s+(?:бер[её]м|принимаем|взимаем)[^\n.!?]{0,20}(?:плату|оплату|взнос[а-яё]*)\s+за\s+участи[а-яё]*|(?:оплата|покупка|платеж[а-яё]*|взнос[а-яё]*)[^\n.!?]{0,25}не\s+нужн[а-яё]*|не\s+(?:нужн[а-яё]*|обязател[а-яё]*|требуется)\s+(?:покуп[а-яё]*|оплат[а-яё]*|взнос[а-яё]*|платить)|(?:сатып\s+ал[а-яёәіңғүұқөһ]*|төле[а-яёәіңғүұқөһ]*)[^\n.!?]{0,15}(?:қажеті\s+жоқ|шарты\s+жоқ|міндетті\s+емес|қажет\s+емес|керек\s+емес)|ақша\s+сұрамай[а-яёәіңғүұқөһ]*|aqysyz|platit\s+ne\s+(?:nado|nuzhno)|pokup[a-z]*\s+ne\s+nuzhn[a-z]*)/giu);
RX.judged=extend(RX.judged,/(?:жюри[^\n.!?]{0,35}(?:оцен[а-яё]*|выбер[а-яё]*|отбер[а-яё]*)|оцен[а-яё]*\s+жюри|қазылар|qazylar|zh[uy]uri|zhuri|судьи[^\n.!?]{0,40}(?:оцен|сравн)|максимальн[а-яё]*\s+(?:сумм[а-яё]*\s+оцен[а-яё]*|балл)|ең\s+(?:жақсы|жоғары|қысқа)[^\n.!?]{0,35}(?:ұпай|уақыт|жұмыс)|(?:ең\s+)?жоғары\s+ұпай|en\s+zhogary\s+upai)/iu);
const participation = '(?:участ[а-яё]*|участв[а-яё]*|заявк[а-яё]*|допуск[а-яё]*|вход[а-яё]*|регистрац[а-яё]*|спис[а-яё]*|uchast[a-z]*|zayavk[a-z]*|spisok[a-z]*|vhod[a-z]*|қатыс[а-яёәіңғүұқөһ]*|өтінім[а-яёәіңғүұқөһ]*|тізім[а-яёәіңғүұқөһ]*|тіркел[а-яёәіңғүұқөһ]*|ұтыс[а-яёәіңғүұқөһ]*|qat[yi]s[a-z]*|tirk[a-z]*|otini[a-z]*|tizim[a-z]*|participat[a-z]*|entry|enter)';
const pay = '(?<![a-zа-яёәіңғүұқөһ])(?:опла[тч][а-яё]*|oplat[a-z]*|плат[её]ж[а-яё]*|платн[а-яё]*|плат[ияи][а-яё]*|перевод[а-яё]*|перевед[а-яё]*|pereved[a-z]*|взнос[а-яё]*|vznos[a-z]*|внес[а-яё]*|внест[а-яё]*|vnes[a-z]*|оргсбор[а-яё]*|orgsbor[a-z]*|пожертвован[а-яё]*|куп[иі][а-яё]*|kupi[a-z]*|покуп[а-яё]*|pokup[a-z]*|приобрет[а-яё]*|донат[а-яё]*|төле[а-яёәіңғүұқөһ]*|төлем[а-яёәіңғүұқөһ]*|жарна[а-яёәіңғүұқөһ]*|zharn[a-z]*|ақылы|акы[лд][а-яё]*|сатып\\s+ал[а-яёәіңғүұқөһ]*|satyp\\s+al[a-z]*|tole[a-z]*|aqyly|paid|pay(?:ment)?|buy|purchas[a-z]*|donat[a-z]*)';
const span = '[^\\n.!?;]{0,90}';
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
const entryUnit='(?:номер[а-яё]*|нөмір[а-яёәіңғүұқөһ]*|билет[а-яё]*|слот[а-яё]*|талон[а-яёәіңғүұқөһ]*|купон[а-яё]*|пропуск[а-яё]*|код[а-яё]*|slot[a-z]*|ticket[a-z]*|bilet[a-z]*|nom[iy]r[a-z]*|nomer[a-z]*|talon[a-z]*|kupon[a-z]*)';
const money='\\d[\\d\\s.,]{0,14}\\s*(?:₸|тг|теңге|тенге|tg|tenge|kzt|руб|₽|\\$)';
const mandatory='(?:обязател[а-яё]*|міндетті(?:\\s+түрде)?|mindetti|obyazatel[a-z]*|mandatory|required)';
feePatterns.push(
  new RegExp(`${pay}[^.!?;]{0,25}${mandatory}`,'giu'),
  new RegExp(`${entryUnit}[^\\n.!?;]{0,25}${money}`,'giu'),
  new RegExp(`${money}[^\\n.!?;]{0,15}${entryUnit}`,'giu'),
  new RegExp(`${mandatory}[^\\n.!?;]{0,22}(?:донат[а-яё]*|взнос[а-яё]*|жарна[а-яёәіңғүұқөһ]*|талон[а-яёәіңғүұқөһ]*|билет[а-яё]*|номер[а-яё]*|нөмір[а-яёәіңғүұқөһ]*|оргсбор[а-яё]*)`,'giu'),
  new RegExp(`(?:донат[а-яё]*|взнос[а-яё]*|жарна[а-яёәіңғүұқөһ]*|donat[a-z]*|zharn[a-z]*)[^\\n.!?;]{0,40}${mandatory}`,'giu'),
  new RegExp(`${participation}[^\\n.!?;]{0,20}(?:стоит|стоимост[а-яё]*|цен[а-яё]*|құны|бағасы)[^\\n.!?;]{0,15}${money}`,'giu'),
  /(?:организационн[а-яё]*\s+взнос|сервисн[а-яё]*\s+сбор|входн[а-яё]*\s+(?:взнос|билет)|платн[а-яё]*\s+заявк[а-яё]*)/giu,
);
RX.free=extend(RX.free,new RegExp(`${entryUnit}[^\\n.!?;]{0,35}(?<![\\d.,])0(?:[.,]0+)?\\s*(?:₸|тг|теңге|тенге|tg|kzt)`,'giu'));

// Linguistic families. These are intentionally independent of scenario IDs,
// particular prizes and amounts. Clauses below determine whether a mention
// describes entry, a delivery charge, a quote, a denial or a selection stage.
RX.prize=extend(RX.prize,/(?:на\s+кон(?:у)?(?![\p{L}])|roz[yi]gr[a-z]*|получит\s+(?:случайн[а-яё]*|выбранн[а-яё]*)\s+(?:комментатор[а-яё]*|участник[а-яё]*|автор[а-яё]*)|na\s+kon[u]?\b|сыйлы[ғқ][а-яёәіңғүұқөһ]*|ut[iy]s(?:qa|ka|ty|tin|yn|y)?\b|(?:жеңімпаз[а-яёәіңғүұқөһ]*|кім)[^.!?;]{0,65}(?:береміз|беріледі|берілет[а-яёәіңғүұқөһ]*|алатынын)|(?:sebet|zhiynty[ghq]|zhin[ay]q|жиынты[ғқ])[\p{L}]*[^.!?;]{0,45}(?:алатынын|beremiz|alatynyn))/giu);
RX.random=extend(RX.random,/(?:на\s*угад|na\s*ugad|вслепую|vsl[ei]puyu|(?:қарамай|қарамастан|qarama[iy](?:stan)?)[^.!?;]{0,45}(?:суыр[а-яёәіңғүұқөһ]*|ал[а-яёәіңғүұқөһ]*|suy[ir][a-z]*|su[yi]yr[a-z]*|al[a-z]*)|(?:біреуін|бірін|bireuin|birin)[^.!?;]{0,25}(?:қарамай|қарамастан|qarama[iy](?:stan)?)|генератор(?:[а-яё]*)\s+(?:комментари[а-яё]*|чис[её]л|сандар[а-яёәіңғүұқөһ]*)|generator[a-z]*\s+(?:slucha[a-z]*|sand[a-z]*|chisel)|(?:случайн[а-яё]*|slucha[a-z]*)[^.!?;]{0,30}(?:номер[а-яё]*|билет[а-яё]*|комментатор[а-яё]*|заявк[а-яё]*))/giu);
RX.warning=extend(RX.warning,/(?:бөтен\s+(?:хабарландыру|жарнама)[а-яёәіңғүұқөһ]*[^.!?;]{0,35}(?:үзінді|көшірме)|талдау\s+үшін\s+келтір[а-яёәіңғүұқөһ]*|өзіміз\s+ұтыс\s+өткізбейміз|chuzh[a-z]*\s+(?:reklam[a-z]*|obyavlen[a-z]*)[^.!?;]{0,30}(?:razbor[a-z]*|citir[a-z]*)|(?:my|biz)\s+[^.!?;]{0,25}(?:citiru[a-z]*|preduprezhda[a-z]*))/giu);
RX.free=extend(RX.free,/(?:взнос[а-яё]*\s+(?:и\s+(?:обязательн[а-яё]*\s+)?покуп[а-яё]*\s+)?нет|(?:билет[а-яё]*|покупк[а-яё]*|плат[её]ж[а-яё]*)\s+(?:или\s+(?:покупк[а-яё]*|билет[а-яё]*)\s+)?не\s+требу[а-яё]*|(?:төлем|сатып\s+алу|донат)[^.!?;]{0,40}талап\s+етілмейді|(?:міндетті\s+жарна|сатып\s+алу|жарна|төлем)[^.!?;]{0,20}жоқ|ештеңе\s+сатып\s+алу[^.!?;]{0,40}қажет\s+емес)/giu);
RX.judged=extend(RX.judged,/(?:решени[а-яё]*\s+(?:прим[её]т|принимает|выносит)\s+жюри|жюри\s+(?:решает|определит|выносит|судит)|жюри[^.!?;]{0,40}по\s+(?:качеств[а-яё]*|мастерств[а-яё]*|техник[а-яё]*|композици[а-яё]*|оригинальност[а-яё]*)|қазылар[^.!?;]{0,40}(?:шешеді|шешім|шеберлік[а-яёәіңғүұқөһ]*))/iu);
feePatterns.push(
  /(?:участи[а-яё]*|uchasti[a-z]*|қатыс[а-яёәіңғүұқөһ]*|qat[yi]s[a-z]*)\s+(?:не\s+бесплатн[а-яё]*|ne\s+besplatn[a-z]*|тегін\s+емес|tegin\s+emes)/giu,
  /(?:билет[а-яё]*|номер[а-яё]*|слот[а-яё]*|комисси[а-яё]*|bilet[a-z]*|nomer[a-z]*)[^.!?;]{0,30}(?:обязател[а-яё]*|міндетті|obyazatel[a-z]*|mindetti)/giu,
  /(?:обязател[а-яё]*|міндетті|obyazatel[a-z]*|mindetti)[^.!?;]{0,35}(?:комисси[а-яё]*|ақы[а-яёәіңғүұқөһ]*|aqys[a-z]*)/giu,
  /(?:тек|только|only)[^.!?;]{0,20}(?:төленген|оплаченн[а-яё]*|tolengen)[^.!?;]{0,22}(?:номер[а-яё]*|нөмір[а-яёәіңғүұқөһ]*|билет[а-яё]*|bilet[a-z]*|nomer[a-z]*)/giu,
  /(?:без|без\s+такого|bez)[^.!?;]{0,15}(?:донат[а-яё]*|donat[a-z]*|оплат[а-яё]*|oplat[a-z]*|покуп[а-яё]*|pokup[a-z]*)[^.!?;]{0,50}(?:номер[^.!?;]{0,12}не\s+выда[а-яё]*|не\s+(?:принима[а-яё]*|участв[а-яё]*|допуска[а-яё]*|включ[а-яё]*)|нет|нельзя|ne\s+(?:uchast[a-z]*|dobav[a-z]*))/giu,
  /(?:донатсыз|төлемсіз|билетсіз|талонсыз|төлемей[а-яёәіңғүұқөһ]*|tolemese)[^.!?;]{0,50}(?:нөмір[^.!?;]{0,15}берілмей[а-яёәіңғүұқөһ]*|қатыса\s+алмай[а-яёәіңғүұқөһ]*|тізім[^.!?;]{0,20}(?:болмайды|кірмей[а-яёәіңғүұқөһ]*)|qatysa\s+alma[a-z]*)/giu,
);

// All dictionary candidates begin at a Unicode word boundary. In particular,
// KK "тегін" (free) is not a feature inside "түбіртегінің" (of the receipt).
// Unicode lookarounds are used because JavaScript \b is ASCII based.
const lexical = rx => new RegExp(`(?<![\\p{L}\\p{N}_])(?:${rx.source})`,rx.flags);
for(const key of Object.keys(RX))RX[key]=lexical(RX[key]);
for(let i=0;i<feePatterns.length;i++)feePatterns[i]=lexical(feePatterns[i]);

// Candidate extraction is deliberately separate from the role decision. These
// families describe predicates and recipients, never a list of particular
// prizes or arbitrary ticket-like products.
const acquisition = /(?<![\p{L}])(?:заплат[а-яё]*|оплачен[а-яё]*|оплативш[а-яё]*|купивш[а-яё]*|бер[её](?:т[а-яё]*|м|те)|берите|взять|алу|алады|аласыз|алған[а-яёәіңғүұқөһ]*|алады[а-яёәіңғүұқөһ]*|al(?:u|ady|asyz|gandar)|alasyz|alasiz|alatyn|alghan[a-z]*)(?![\p{L}])/giu;
const entryPredicates = /(?:участ[а-яё]*|участв[а-яё]*|заявк[а-яё]*|претенд[а-яё]*|запис[а-яё]*|запись|вступлен[а-яё]*|вступить|доступ[а-яё]*|войти|вход[а-яё]*|допуск[а-яё]*|жереб[а-яё]*|розыгрыш[а-яё]*|рандом|қатыс[а-яёәіңғүұқөһ]*|үміткер[а-яёәіңғүұқөһ]*|кіру|тіркел[а-яёәіңғүұқөһ]*|өтінім[а-яёәіңғүұқөһ]*|тізім[а-яёәіңғүұқөһ]*|uchast[a-z]*|zayavk[a-z]*|pretendent[a-z]*|zapis[a-z]*|vhod[a-z]*|voiti|qat[yi]s[a-z]*|umitker[a-z]*|kiru|tirk[a-z]*|otini[a-z]*|tizim[a-z]*|entry|participat[a-z]*)/iu;
const obligation = /(?:обязател[а-яё]*|необходим[а-яё]*|нуж[а-яё]*|нужно|только|лишь|единственн[а-яё]*|после\s+покуп[а-яё]*|доступ[а-яё]*|міндетті|керек|шарт|қажет|тек|ғана|mindetti|kerek|shart|qazhet|tolko|obyazatel[a-z]*|required|mandatory|only)/iu;
const rewardAllocation = /(?:(?:одному|один|одна|одной|одного)\s+(?:случайн[а-яё]*\s+)?(?:участник[а-яё]*|читател[а-яё]*|победител[а-яё]*|человек[а-яё]*|автор[а-яё]*)[^.!?;]{0,85}(?:обещан[а-яё]*|подар[а-яё]*|отда[а-яё]*|получ[а-яё]*)|(?:отда[её]м|отдадим|передадим|получит|достанется|уйд[её]т|будет\s+подарком|жд[её]т|ждут)[^.!?;]{0,85}(?:участник[а-яё]*|победител[а-яё]*|одному\s+человеку)|(?:кому\s+достанется)[^.!?;]{1,90}|(?:подарочн[а-яё]*|подарок)[^.!?;]{0,60}(?:участник[а-яё]*|получ[а-яё]*|уйд[её]т)|(?:бір\s+(?:адам|қатысушы|оқырман|жеңімпаз)[а-яёәіңғүұқөһ]*|біреу)[^.!?;]{0,85}(?:бер[а-яёәіңғүұқөһ]*|ал[а-яёәіңғүұқөһ]*|сыйла[а-яёәіңғүұқөһ]*|алып\s+кет[а-яёәіңғүұқөһ]*)|(?:сыйға\s+тарт[а-яёәіңғүұқөһ]*)|(?:otdaem|otdadim|poluchit|dostanetsya)[^.!?;]{0,65}(?:odnomu|uchastnik[a-z]*))/giu;
const credentialOnly = /(?:регистрационн[а-яё]*\s+код|номер\s+заявки|входн[а-яё]*\s+(?:номер|код)|подтверждени[а-яё]*\s+регистраци|тіркеу\s+(?:нөмір|код)|registration\s+code)/iu;
const reportingContext = /(?:(?:дәріс|брошюр|сабақ)[а-яёәіңғүұқөһ]*[^.!?;]{0,130}(?:бөгде|жарнама|мысал|талдау)|цитиру[а-яё]*[^.!?;]{0,55}(?:стар[а-яё]*|чуж[а-яё]*|был[а-яё]*|объявлен[а-яё]*)|(?:учебн[а-яё]*|выдуманн[а-яё]*|образец|экспонат|памятк[а-яё]*|семинар[а-яё]*|слайд[а-яё]*|заняти[а-яё]*)[^.!?;]{0,95}(?:цитат[а-яё]*|реклам[а-яё]*|пример|сообщени[а-яё]*|текст|приглашени[а-яё]*)|пример\s+чужого\s+приглашени[а-яё]*|(?:бөтен|сыртқы)[^.!?;]{0,60}(?:хабарлама|жарнама)[а-яёәіңғүұқөһ]*[^.!?;]{0,80}(?:үлгі|мысал)|(?:слайд|семинар)[а-яёәіңғүұқөһ]*[^.!?;]{0,85}(?:жарнама|мысал)|(?:мәтін\s+талдауға\s+арналған\s+үлгі))/iu;
RX.warning=extend(RX.warning,reportingContext);
RX.prize=extend(RX.prize,rewardAllocation);
RX.prize=extend(RX.prize,/(?:(?:отда[её]м|отдадим|передадим)[^.!?;]{0,70}(?:подписчик[а-яё]*|зрител[а-яё]*|донатер[а-яё]*|по\s+жребию)|будет\s+подарком|(?:приготов[а-яё]*|подготов[а-яё]*)[^.!?;]{0,65}подарочн[а-яё]*\s+[\p{L}-]+|(?:заявк[а-яё]*|участи[а-яё]*)\s+на\s+подарочн[а-яё]*\s+[\p{L}-]+)/giu);
RX.judged=extend(RX.judged,/(?:(?:победител[а-яё]*|получател[а-яё]*)[^.!?;]{0,35}(?:выбира[а-яё]*|определ[а-яё]*)[^.!?;]{0,30}(?:мастер[а-яё]*|эксперт[а-яё]*|судь[а-яё]*)[^.!?;]{0,35}по\s+(?:качеств[а-яё]*|форм[а-яё]*|техник[а-яё]*|скорост[а-яё]*|оригинальност[а-яё]*)|кто\s+(?:быстрее|точнее|лучше)[^.!?;]{0,65}(?:получит|выиграет)|jury\s+(?:sravni[a-z]*|ocen[a-z]*|choos[a-z]*|select[a-z]*)|(?:жеңімпаз[а-яёәіңғүұқөһ]*|жүлде[^.!?;]{0,20}иесі)[^.!?;]{0,55}(?:ұпай|шеберлік|уақыт)[^.!?;]{0,25}(?:анықта[а-яёәіңғүұқөһ]*|шеш[а-яёәіңғүұқөһ]*))/iu);
RX.free=extend(RX.free,/(?:(?:плат[её]ж[а-яё]*|взнос[а-яё]*|оплат[а-яё]*)\s+(?:ради|для|за)\s+участи[а-яё]*\s+нет(?![\p{L}])|оплат[а-яё]*\s+участи[а-яё]*\s+нулев[а-яё]*|(?:тіркел[а-яёәіңғүұқөһ]*|кіру)[^.!?;]{0,35}тегін|қатысуға\s+ақша\s+қажет\s+емес)/giu);


// v1.8: linguistic roles, not a list of prizes or campaign identifiers.
// Purchases qualify only when linked to admission by paymentContext below.
RX.prize=lexical(extend(RX.prize,/(?:розы[-\s]грыш[а-яё]*|ұт(?:у|уға|уды|удың|уға|ып|ып\s+ал)[а-яёәіңғүұқөһ]*|ut[uiy]s[a-z]*|ut(?:u|uga|udyn|ip|yp)(?![a-z])|победител[а-яё]*\s+[^.!?;]{1,55}(?:определ[а-яё]*|получ[а-яё]*)|(?:получит|получат|достанется|передадим|отдадим)[^.!?;]{0,70}(?:владел[а-яё]*|хозяин[а-яё]*|челове[а-яё]*|номер[а-яё]*|чек[а-яё]*)|(?:владел[а-яё]*|хозяин[а-яё]*|обладател[а-яё]*)[^.!?;]{0,55}(?:получит|достанется)|(?:себет|жиынтық|топтама)[а-яёәіңғүұқөһ]*[^.!?;]{0,45}(?:беріледі|ұту)|(?:жереб[а-яёәіңғүұқөһ]*|zhereb[a-z]*)[^.!?;]{0,30}(?:береміз|beremiz)|(?:соған|иесіне|iesine)[^.!?;]{0,35}(?:беріледі|beriledi|tiesili))/giu));
RX.random=lexical(extend(RX.random,/(?:(?:перемеша[а-яё]*|смеша[а-яё]*)[^.!?;]{0,65}(?:вытян[а-яё]*|достан[а-яё]*|вытащ[а-яё]*)|(?:случайн[а-яё]*\s+(?:финальн[а-яё]*\s+)?вытяж[а-яё]*)|генератор[^.!?;]{0,35}(?:случайн[а-яё]*|выбер[а-яё]*))/giu));
RX.judged=lexical(extend(RX.judged,/(?:(?:результат|победител[а-яё]*)[^.!?;]{0,30}(?:устанавлива[а-яё]*|определ[а-яё]*)\s+жюри|жюри[^.!?;]{0,45}(?:перспектив[а-яё]*|владени[а-яё]*\s+цвет[а-яё]*))/giu));
RX.warning=lexical(extend(RX.warning,/(?:(?:дәріс|брошюр|сабақ)[а-яёәіңғүұқөһ]*[^.!?;]{0,120}(?:бөгде|жарнама|мысал|талдау)|(?:өз\s+атынан|өзіміз)[^.!?;]{0,60}(?:ұсынбай[а-яёәіңғүұқөһ]*|тіркемей[а-яёәіңғүұқөһ]*|өткізбейміз))/giu));
const ADMISSION_EXCLUSION=/(?:без\s+(?:такого\s+)?(?:оплат[а-яё]*|покуп[а-яё]*|донат[а-яё]*|взнос[а-яё]*|сбор[а-яё]*)[^.!?;]{0,70}(?:не\s+(?:участв[а-яё]*|добав[а-яё]*|включ[а-яё]*|попад[а-яё]*|проход[а-яё]*|допуска[а-яё]*|выда[а-яё]*|принима[а-яё]*|внос[а-яё]*|вно[сш][а-яё]*|присваива[а-яё]*)|нельзя|недоступ[а-яё]*|нет)|(?:төлемей[а-яёәіңғүұқөһ]*|төлемсіз|донатсыз|жарнасыз|сатып\s+алмай)[^.!?;]{0,65}(?:жоқ|кірмей[а-яёәіңғүұқөһ]*|қоспай[а-яёәіңғүұқөһ]*|берілмей[а-яёәіңғүұқөһ]*|қабылданбай[а-яёәіңғүұқөһ]*|жүрмейді|болмайды))/iu;
const AMBIGUOUS_CONDITION=/(?:белгісіз|түсіндірілмеген|көрсетілмеген|көрінбейді|белгисиз|не\s+(?:ясно|понятно|утвержд[её]н[а-яё]*)|черновик|(?:төле[а-яёәіңғүұқөһ]*|міндетті|жереб[а-яёәіңғүұқөһ]*|бағасы)\s+(?:ме|ма|бе|пе)(?![\p{L}]))/iu;
const PURCHASE_PREDICATE=/(?<![\p{L}])(?:куп[иі][а-яё]*|куплен[а-яё]*|покуп[а-яё]*|опла[тч][а-яё]*|плат[ияи][а-яё]*|платн[а-яё]*|прода[еёю][а-яё]*|потрат[а-яё]*|денежн[а-яё]*|ақылы|ақша[а-яёәіңғүұқөһ]*|төле[а-яёәіңғүұқөһ]*|сатып\s+ал[а-яёәіңғүұқөһ]*|ақшамен[^.!?;]{0,35}толықтыр[а-яёәіңғүұқөһ]*)(?![\p{L}])/giu;

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

// Normalization is used only for matching. Every UTF-16 output position maps
// back to its original span, so NFKC expansion, zero-width OCR noise and mixed
// glyphs cannot change the evidence quote or its offsets in source.text.
function analysisSource(source){
  const original=String(source.text??''),starts=[],ends=[];let text='';
  const append=(value,start,end)=>{text+=value;for(let i=0;i<value.length;i++){starts.push(start);ends.push(end);}};
  for(let at=0;at<original.length;){
    const raw=String.fromCodePoint(original.codePointAt(at)),finish=at+raw.length;
    append(raw.normalize('NFKC').toLowerCase().replace(/[\u200b-\u200d\u2060\ufeff]/gu,'').replace(/[\r\n\t]/gu,' ').replace(/[‐‑‒–—−]/gu,'-').replace(/[’‘]/gu,"'"),at,finish);at=finish;
  }
  const lookalikes={a:'а',c:'с',e:'е',o:'о',p:'р',x:'х',y:'у',k:'к',m:'м',t:'т',b:'в',h:'н'},latinLookalikes=Object.fromEntries(Object.entries(lookalikes).map(([a,b])=>[b,a]));
  text=text.replace(/[\p{L}]+/gu,word=>{
    const cy=(word.match(/[а-яёәіңғүұқөһ]/gu)||[]).length,la=(word.match(/[a-z]/gu)||[]).length;
    return cy>la?word.replace(/[aceopxykmtbh]/gu,ch=>lookalikes[ch]):la>cy?word.replace(/[асеорхукмтвн]/gu,ch=>latinLookalikes[ch]):word;
  });
  // Limited Kazakh transliteration families; ordinary Latin names are untouched.
  // These are feature words and morphology, never campaign labels or prize names.
  const aliases=[
    [/^ut[uiy]s/,'ұтыс'],[/^ut(?:ip|yp)/,'ұтып'],[/^ut(?:u|uga|udyn)/,'ұту'],
    [/^qat[yi]s/,'қатыс'],[/^t[yi]z[yi]m/,'тізім'],[/^t[yi]rke/,'тірке'],[/^ot[iy]n[iy]m/,'өтінім'],
    [/^t[oö]le/,'төле'],[/^aqyly/,'ақылы'],[/^aqsha/,'ақша'],[/^tegin/,'тегін'],[/^aqysyz/,'ақысыз'],
    [/^satyp/,'сатып'],[/^al(?:gan|ghan)/,'алған'],[/^alu$/,'алу'],[/^kiru$/,'кіру'],[/^qoldan/,'қолдан'],[/^qajet/,'қажет'],[/^qazhet/,'қажет'],[/^kerek/,'керек'],[/^tek$/,'тек'],[/^mindetti/,'міндетті'],[/^zherebe/,'жеребе'],[/^kezde[iy]?so[qk]/,'кездейсоқ'],
    [/^zhenimpaz/,'жеңімпаз'],[/^tanda/,'таңда'],[/^anyqta/,'анықта'],[/^tenge/,'теңге'],
    [/^n[oö]m[iy]r/,'нөмір'],[/^kupon/,'купон'],[/^shart/,'шарт'],[/^bilet/,'билет'],[/^berile/,'беріле'],[/^berem/,'берем'],
    [/^iesine/,'иесіне'],[/^alyn/,'алын'],[/^shygar/,'шығар'],[/^bireu/,'біреу'],[/^beredi/,'береді'],[/^beretin/,'беретін'],[/^bolmaidy$/,'болмайды'],[/^qosp/,'қосп'],[/^kirme/,'кірме'],[/^qabylda/,'қабылда'],[/^zho[qk]$/,'жоқ'],[/^emes$/,'емес']
  ];
  const suffix=value=>value.replace(/sh|ch|zh|gh|ng|ya|yu|yo|[a-z]/gu,ch=>({sh:'ш',ch:'ч',zh:'ж',gh:'ғ',ng:'ң',ya:'я',yu:'ю',yo:'ё',a:'а',b:'б',c:'с',d:'д',e:'е',f:'ф',g:'г',h:'һ',i:'і',j:'ж',k:'к',l:'л',m:'м',n:'н',o:'о',p:'п',q:'қ',r:'р',s:'с',t:'т',u:'у',v:'в',w:'у',x:'х',y:'ы',z:'з'}[ch]));
  let next='',nextStarts=[],nextEnds=[],cursor=0;
  for(const m of text.matchAll(/[a-zöü]+|[а-яёәіңғүұқөһ]+-[а-яёәіңғүұқөһ]+/gu)){
    next+=text.slice(cursor,m.index);nextStarts.push(...starts.slice(cursor,m.index));nextEnds.push(...ends.slice(cursor,m.index));
    let value=m[0];
    if(value.includes('-')){const joined=value.replace('-','');if(/^(?:розыгрыш|обязател|вступление)/u.test(joined))value=joined;}
    else{const pair=aliases.find(([rx])=>rx.test(value));if(pair){const prefix=value.match(pair[0])[0];value=pair[1]+suffix(value.slice(prefix.length));}}
    next+=value;
    if(value===m[0]){nextStarts.push(...starts.slice(m.index,m.index+value.length));nextEnds.push(...ends.slice(m.index,m.index+value.length));}
    else for(let i=0;i<value.length;i++){nextStarts.push(starts[m.index]);nextEnds.push(ends[m.index+m[0].length-1]);}
    cursor=m.index+m[0].length;
  }
  next+=text.slice(cursor);nextStarts.push(...starts.slice(cursor));nextEnds.push(...ends.slice(cursor));
  return {...source,text:next,originalSource:source,offsetMap:{starts:nextStarts,ends:nextEnds}};
}

function originalMatch(source,match){
  if(!source.offsetMap)return match;
  const at=match.index??0,last=at+match[0].length-1,start=source.offsetMap.starts[at],end=source.offsetMap.ends[last];
  return {0:String(source.originalSource.text??'').slice(start,end),index:start};
}

function negativeBefore(text, start, key) {
  const before = text.slice(Math.max(0, start - 32), start);
  if (key === 'free') return /(?<![\p{L}])(?:не|емес|not|ne|нет\s*(?:никак[а-яё]*\s*|ни\s+одн[а-яё]*\s*)?)\s*$/iu.test(before);
  if (key === 'random') return /(?<![\p{L}])(?:не|ни|без|no|not|ne|ni)\s*(?:никак[а-яё]*\s+|будет\s+|используем\s+)?$/iu.test(before);
  return false;
}

// Explicit absence of a required purchase is evidence about entry, not the prize price.
const noPurchase = /(?:(?:покупать|оплачивать|приобретать|платить)[^.!?;,]{0,25}не\s+(?:нужно|требуется|обязательно)|(?:платить|покупать|оплачивать|приобретать|переводить\s+деньги)\s+(?:ничего\s+)?не\s+(?:нужно|требуется|обязательно)|ничего\s+(?:покупать|оплачивать)\s+не\s+(?:нужно|требуется)|(?:покупки|взносы|платежи)\s+не\s+(?:нужны|требуются)|(?:сатып\s+алу|төлеу|ақша\s+төлеу)\s+(?:керек\s+емес|қажет\s+емес|міндетті\s+емес)|(?:kupovat|pokupat|platit)\s+ne\s+(?:nuzhno|nado)|no\s+entry\s+fee)/giu;

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
    if (/(?<![\p{L}])нет\s*(?:никак[а-яё]*\s*)?$/iu.test(before)) return true;
    if (key === 'random' && /^[\s,]*(?:(?:таңдау|таңдай|анықтау|анықтай)[а-яёәіңғүұқөһ]*\s+)?(?:емес|болмайды|таңдамаймыз|таңдалмайды|анықталмайды|қолданбаймыз)/iu.test(after)) return true;
    if (/^[\s,]*(?:(?:и|или|ни|выбор[а-яё]*|жереб[а-яё]*|приз[а-яё]*|розыгрыш[а-яё]*|случайн[а-яё]*)[\s,]*){0,8}(?:нет|не\s+будет|не\s+проводим|не\s+проводит|не\s+предусмотрен|исключ[её]н[а-яё]*|не\s+(?:использу[а-яё]*|применя[а-яё]*|описан[а-яё]*)|жоқ|қолданылмайды)/iu.test(after)) return true;
    if(key==='prize'&&/^[\s,]*(?:(?:ұтыс[а-яёәіңғүұқөһ]*|сыйлық[а-яёәіңғүұқөһ]*|та|те|да|де)\s+){0,4}(?:емес|жоқ)/iu.test(after))return true;
    if(key==='random'&&/^[\s,]*(?:(?:tanda[a-z]*|zhereb[a-z]*|da|de|ta|te|kezde[a-z]*)[\s,]*){0,9}(?:zhoq|zhok|emes|bolmaidy|qoldanylmaidy)/iu.test(after))return true;
    if(key==='random'&&/^[\s,]*(?:(?:выбор[а-яё]*|мы|здесь|у\s+нас|таңдау|бізде)\s+){0,4}(?:не\s+(?:провод[а-яё]*|использ[а-яё]*|выбира[а-яё]*|определя[а-яё]*)|болмайды|жоқ)/iu.test(after))return true;
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
  const evidence = quoteFor(source.originalSource||source, originalMatch(source,match), reason);
  if (!signal.evidence.some(item => item.sourceId === evidence.sourceId && item.start === evidence.start && item.end === evidence.end)) {
    signal.evidence.push(evidence);
  }
}

function freeContext(text, match) {
  const at = match.index ?? 0;
  const context=sentenceAt(text,match),sentence=context.text;
  const found = match[0];
  const following=text.slice(at+found.length,at+found.length+100);
  if (/^(?:бесплатн[а-яё]*|тегін|тегин|tegin|ақысыз)\s+(?:доставк|жеткіз|shipping|delivery)/iu.test(text.slice(at))) return false;
  if(/(?:бесплатн|тегін|тегин|tegin|ақысыз|aqysyz|besplatn)/iu.test(found)&&/^(?:\s+[\p{L}-]+){0,4}\s+(?:нет|net|жоқ|zhoq|zhok|болмайды|ne\s+budet|не\s+(?:выда[а-яё]*|да[её][а-яё]*|предусмотр[а-яё]*)|берілмейді|бермейміз|berilmei[a-z]*|berilmeidi)(?:\s|[,.!?;]|$)/iu.test(following))return false;
  if(/^\s*(?:ли|бе|пе|ма|ме)(?=\s|[,.!?;:-]|$)/iu.test(following))return false;
  if(/(?:без\s+(?:оплат[а-яё]*|покуп[а-яё]*|донат[а-яё]*)|bez\s+(?:oplat[a-z]*|pokup[a-z]*))/iu.test(found)&&/^[^.!?;]{0,65}(?:не\s+(?:участв[а-яё]*|включ[а-яё]*|добав[а-яё]*|попад[а-яё]*|допуска[а-яё]*)|нельзя|кірмей[а-яёәіңғүұқөһ]*|қатыса\s+алмай[а-яёәіңғүұқөһ]*|ne\s+(?:uchast[a-z]*|dobav[a-z]*|popast[a-z]*))/iu.test(following))return false;
  if (/(?:без\s+покупки[^\n.!?]{0,35}(?:не\s+выда|нельзя|не\s+допуска|не\s+участв)|без\s+оплаты[^\n.!?]{0,35}(?:нельзя|не\s+выда|не\s+участв))/iu.test(sentence)) return false;
  // A free delivery, gift, referral or service is not evidence of free entry.
  if (/бесплатн|тегін|тегин|tegin|ақысыз/iu.test(found)
    && /(?:доставк|жеткіз|shipping|delivery|бонус|консультаци|сервис)/iu.test(sentence)
    && !new RegExp(participation, 'iu').test(sentence)) return false;
  if (/(?:тегін|тегин|tegin)[^\n.!?]{0,12}емес/iu.test(text.slice(at, at + found.length + 16))) return false;
  if(/(?:доставк|жеткіз|перевоз|shipping|delivery)/iu.test(found)&&/(?:^|\s)0(?:[.,]0+)?\s*(?:₸|тг|теңге|тенге|tg|kzt)/iu.test(found))return false;
  return true;
}

function randomHasSelectionRole(text,match){
  if(!/^(?:случайн|slucha|кездейс|кездес|kezde)/iu.test(match[0]))return true;
  return /(?:победител|выбор|выб[еи]р|определ[а-яё]*|вытян|достан|генератор|рандом|жереб|таңда|анықта|суыр[а-яёәіңғүұқөһ]*|(?:біреуін|бірін)[^.!?]{0,35}алам[а-яёәіңғүұқөһ]*|жеңімпаз|ұт[а-яёәіңғүұқөһ]*|tanda[a-z]*|zhenimpaz|vyber[a-z]*|vybir[a-z]*|pobedit[a-z]*|generator|random)/iu.test(sentenceAt(text,match).text);
}

function feeIsNegated(text, match) {
  const raw = sentenceAt(text, match).text;
  // Keep opposite clauses separate; an optional purchase does not negate a required ticket.
  const clauses = raw.split(/[,;]|\s+(?:но|однако|бірақ)\s+/iu);
  const matchPayment = matches(match[0], new RegExp(pay, 'giu')).map(m => m[0]);
  const fragment = clauses.find(c => matchPayment.some(p => c.includes(p))) || raw;
  const before = text.slice(Math.max(0, (match.index ?? 0) - 28), match.index ?? 0);
  if(/(?:покупать|платить|оплачивать|приобретать|перечислять)[^.!?;]{0,55}не\s+(?:надо|нужно|требуется|обязательно)|(?:төлем|төлеу)[^.!?;]{0,25}(?:сұралмай[а-яёәіңғүұқөһ]*|қажет\s+емес)|(?:отказ[^.!?;]{0,25}донат|донат[^.!?;]{0,35}отказ)[^.!?;]{0,60}не\s+(?:меня[а-яё]*|влия[а-яё]*)/iu.test(fragment))return true;
  if(/(?:не\s+(?:прода[её]м|бер[её]м|взимаем|принимаем)|төлем\s+емес|талап\s+етілмейді|не\s+нужна\s+для\s+участи)/iu.test(fragment))return true;
  if(/(?:нужн[а-яё]*\s+ли|есть\s+ли|нужна\s+ли|платно\s+ли|керек\s+пе|қажет\s+пе|платно\s+ма|тегін\s+бе|(?:информаци[а-яё]*|услови[а-яё]*|правил[а-яё]*)[^.!?]{0,35}(?:нет|позже|не\s+(?:указан|описан|объявлен))|ақпарат[а-яёәіңғүұқөһ]*[^.!?]{0,35}кейін|poka\s+ne\s+(?:skazan[a-z]*|izvestn[a-z]*))/iu.test(fragment))return true;
  // "Without payment no entry" asserts a required payment; the word "without"
  // must not turn this into free entry or negate the fee evidence.
  if(/(?:без\s+(?:оплат[а-яё]*|покуп[а-яё]*|донат[а-яё]*|взнос[а-яё]*|оплаченн[а-яё]*\s+[а-яё]+)[^.!?;]{0,60}(?:не\s+(?:участв[а-яё]*|добав[а-яё]*|включ[а-яё]*|попад[а-яё]*|допуска[а-яё]*)|нельзя|недоступно)|bez\s+(?:oplat[a-z]*|pokup[a-z]*|donat[a-z]*)[^.!?;]{0,50}ne\s+(?:uchast[a-z]*|dobav[a-z]*|popast[a-z]*)|(?:төлемсіз|талонсыз|билетсіз|нөмірсіз)[^.!?;]{0,35}(?:жоқ|берілмейді|есептелмейді|алмай[а-яёәіңғүұқөһ]*))/iu.test(fragment))return false;
  if (matches(fragment, noPurchase).length) return true;
  if(/(?<![\p{L}])не\s+(?:плат[а-яё]*|покуп[а-яё]*|опла[тч][а-яё]*)/iu.test(fragment))return true;
  const pricedAmounts=matches(fragment,/(?<!\d)(\d[\d\s]*(?:[.,]\d+)?)\s*(?:₸|тг|теңге|тенге|tg|kzt)(?![\p{L}])/giu).map(m=>Number(m[1].replace(/\s/gu,'').replace(',','.')));
  if(pricedAmounts.length&&pricedAmounts.every(n=>n===0))return true;
  if(/(?:не\s+(?:обязател[а-яё]*|нужн[а-яё]*|требуется)[^.!?]{0,18}(?:покуп[а-яё]*|оплат[а-яё]*|взнос[а-яё]*|платить)|(?:покуп[а-яё]*|оплат[а-яё]*|взнос[а-яё]*|донат[а-яё]*)[^.!?]{0,25}(?:по\s+желанию|добровольн[а-яё]*|необязател[а-яё]*)|(?:сатып\s+ал[а-яёәіңғүұқөһ]*|төле[а-яёәіңғүұқөһ]*|донат)[^.!?]{0,18}(?:міндетті\s+емес|қажет\s+емес|керек\s+емес))/iu.test(fragment))return true;
  if(/(?:төлемей[а-яёәіңғүұқөһ]*|төлемейміз|төлемеңіз|сатып\s+алма[а-яёәіңғүұқөһ]*|төле[а-яёәіңғүұқөһ]*[^.!?]{0,20}қажеті\s+жоқ|сатып\s+ал[а-яёәіңғүұқөһ]*[^.!?]{0,15}(?:шарты|қажеті)\s+жоқ|(?:оплата|покупка|плат[её]ж[а-яё]*|взнос[а-яё]*)[^.!?]{0,25}не\s+нужн[а-яё]*|(?:platit|pokup[a-z]*)\s+ne\s+(?:nado|nuzh[a-z]*)|ұтыс[а-яёәіңғүұқөһ]*\s+емес|не\s+розыгрыш)/iu.test(fragment))return true;
  if(/(?:донат|пожертвован|donat)/iu.test(fragment)&&/(?:ерікті|өз\s+еркі[а-яёәіңғүұқөһ]*|добровольн[а-яё]*|по\s+желанию|не\s+обязател[а-яё]*|po\s+zhelaniyu|optional|(?:участи[а-яё]*|спис[а-яё]*|шанс[а-яё]*)[^.!?]{0,25}не\s+влия[а-яё]*)/iu.test(raw))return true;
  if (/(?:bez\s+(?:oplat[a-z]*|pokup[a-z]*|vznos[a-z]*)|(?:төлем|донат|сатып\s+алу)\s+(?:қажет\s+емес|міндетті\s+емес))/iu.test(fragment)) return true;
  if (/(?<![\p{L}])(?:не|без|no|not)\s*$/iu.test(before) && !/не\s+бесплатно/iu.test(fragment)) return true;
  if (/(?:без\s+оплаты|без\s+покупки|не\s+нужно\s+(?:платить|покупать)|(?:оплата|покупка|платёж|платеж)\s+не\s+(?:нужна|требуется|обязательна|является)|(?:платить|покупать|оплачивать|переводить\s+деньги)[^\n.!?]{0,35}не\s+(?:нужно|обязательно)|никаких\s+(?:взнос[а-яё]*|платеж[а-яё]*)|покупать\s+не\s+обязательно|(?:необязательн[а-яё]*|добровольн[а-яё]*)\s+(?:донат|пожертвован[а-яё]*)|(?:донат|пожертвован[а-яё]*)\s+(?:не\s+обязателен|по\s+желанию|добровольн[а-яё]*)|(?:төлем|сатып\s+алу)\s+(?:қажет\s+емес|міндетті\s+емес)|no\s+purchase|optional\s+donation|взнос\s+не\s+даёт\s+участия|участие\s+и\s+оплату\s+мы\s+не\s+принимаем|пока\s+не\s+сообщаем|нужна\s+ли\s+(?:покупка|оплата))/iu.test(fragment)) return true;
  // Price of a prize and payment for delivery after winning have another role.
  if (/(?:доставк|перевозк|жеткіз|тасымал|delivery|shipping|dostavk)/iu.test(fragment)
    && /(?:победител|после\s+выигрыш|после\s+победы|ұтқан|ұтып\s+алған|жеңімпаз|кейін|winner|after\s+winning|posle\s+vyigrysh)/iu.test(raw)
    && !/(?:для\s+участия|чтобы\s+участвовать|қатысу\s+үшін|обязательн[а-яё]*\s+оплат)/iu.test(fragment)) return true;
  if (/(?:стоимост[а-яё]*\s+приз|цен[а-яё]*\s+приз|приз[^\n.!?]{0,15}стоит|жүлденің\s+бағасы)/iu.test(fragment)
    && !/(?:для\s+участия|чтобы\s+участвовать|қатысу\s+үшін|участие\s+после)/iu.test(fragment)) return true;
  return false;
}

/**
 * Clause context is an intermediate representation, not a language model.
 * It keeps original-source evidence and makes the actual rule decisions
 * inspectable. Negation belongs to the condition it modifies: a denied
 * delivery charge must not cancel an earlier mandatory ticket.
 */
function clausesOf(text) {
  const boundaries = /(?<!\d)[.!?;]+(?!\d)|(?<!\d),(?!\d)|\s+(?:но|однако|бірақ|алайда|but|no\s+(?=chtoby))\s+/giu;
  const clauses=[]; let start=0;
  for(const m of text.matchAll(boundaries)){
    if(m.index>start)clauses.push({start,end:m.index,text:text.slice(start,m.index)});
    start=m.index+m[0].length;
  }
  if(start<text.length)clauses.push({start,end:text.length,text:text.slice(start)});
  return clauses.filter(c=>c.text.trim());
}

const ENTRY_ROLE = new RegExp(`${participation}|${entryUnit}|(?:допуск|жеребеге\\s+кіру|ұтысқа\\s+кіру|қосылу|орын\\s+алу|zherebege\\s+kir|utysqa\\s+kir)`,'iu');
const DELIVERY_ROLE = /(?:доставк|жеткіз|тасымал|перевоз|курьер|shipping|delivery|dostavk|жеткізу)/iu;
const PRIZE_PRICE = /(?:цен[а-яё]*\s+(?:сам[а-яё]*\s+)?(?:приз|прибор|подарк)|стоимост[а-яё]*\s+(?:наш[а-яё]*\s+)?приз|приз[а-яё]*[^.!?;]{0,20}стоит|жүлденің[^.!?;]{0,20}бағасы|сома[^.!?;]{0,35}жүлде|стоимость\s+(?:нашего\s+)?приза)/iu;
const OPTIONAL = /(?:добровольн[а-яё]*|по\s+желанию|необязател[а-яё]*|не\s+обязател[а-яё]*|ерікті|өз\s+еркі[а-яёәіңғүұқөһ]*|міндетті\s+емес|optional|po\s+zhelaniyu)/iu;
const DONATION = /(?:донат[а-яё]*|пожертвован[а-яё]*|donat[a-z]*)/iu;
const ENTRY_FREE = /(?:участи[а-яё]*|вход[а-яё]*|қатыс[а-яёәіңғүұқөһ]*|өтінім[а-яёәіңғүұқөһ]*|uchasti[a-z]*|vhod[a-z]*|qat[yi]s[a-z]*|entry)/iu;
const NO_CONDITIONS = /(?:не\s+(?:объявлен[а-яё]*|указан[а-яё]*|описан[а-яё]*|сообщаем|заполнен[а-яё]*|извест[а-яё]*)|пока\s+(?:ничего\s+)?не|услови[а-яё]*[^.!?;]{0,25}нет|(?:поле|раздел)[^.!?;]{0,35}(?:пуст[а-яё]*|не\s+заполнен)|бос\s*(?:тұр|$)|бос\s*(?:деп|екен)|әзірге\s+бос|айтылмаған|жарияланбаған|жазылмаған|zhazylmagan|sharttary\s+bos)/iu;
const UNCERTAIN = /(?:возможно(?!\s+(?:только|лишь))|может\s+быть|вероятно|обсуждаем|предлагаем\s+обсудить|не\s+решили|пока\s+решаем|если\s+(?:решим|будем|станем)|мүмкін(?![\p{L}])|талқыла[а-яёәіңғүұқөһ]*|әлі\s+шеш[а-яёәіңғүұқөһ]*\s+жоқ|mumkin|ali\s+shesh[a-z]*\s+zhoq|vozmozhno|poka\s+resh[a-z]*|might|perhaps)/iu;
const DENIED_SUFFIX = /^\s*(?:[\s:—-]*(?:да|де|та|те|и|или|ни|pen|da|de|ta|te)[\s,]*)*(?:нет|net(?![\p{L}])|жоқ|емес|zhoq|zhok|emes|болмайды|bolmaidy|қарастырылмаған|qarastyrylmagan|не\s+(?:будет|провод[а-яё]*|использ[а-яё]*|предусмотр[а-яё]*|требу[а-яё]*|прода[а-яё]*|бер[её][а-яё]*|принима[а-яё]*))/iu;

function paymentKind(text) {
  if(DONATION.test(text))return 'donation';
  if(/(?:комисси|оргсбор|сбор|жарна|zharn|fee)/iu.test(text))return 'fee';
  if(new RegExp(entryUnit,'iu').test(text))return 'ticket';
  if(/(?:покуп|куп[иі]|приобрет|сатып\s+ал|satyp\s+al|pokup|kupi|buy|purchas)/iu.test(text))return 'purchase';
  return 'general';
}

function stageOf(text) {
  if(/(?:полуфинал|предварительн[а-яё]*\s+(?:отбор|этап)|перв[а-яё]*\s+этап|іріктеу|алдын\s+ала\s+ірікт|semifinal|preliminary|qualification)/iu.test(text))return 'preliminary';
  if(/(?:финальн|финал[а-яё]*|итогов[а-яё]*\s+(?:победител|решени)|соңғы|aqyrgy|final)/iu.test(text))return 'final';
  return 'winner';
}

function candidateDenied(text,match,key) {
  const before=text.slice(Math.max(0,match.index-45),match.index),after=text.slice(match.index+match[0].length);
  if(negativeBefore(text,match.index,key)||unavailable(text,match,key))return true;
  if(UNCERTAIN.test(text)||AMBIGUOUS_CONDITION.test(text))return true;
  if(/(?<![\p{L}])(?:не|ни|без|no|not|ne|ni)\s*(?:(?:нашего|своего|nash[a-z]*|svoego)\s+)?$/iu.test(before))return true;
  if(DENIED_SUFFIX.test(after))return true;
  if(/^[^.!?;]{0,55}(?:қабылдамай[а-яёәіңғүұқөһ]*|ұсынбай[а-яёәіңғүұқөһ]*|тіркемей[а-яёәіңғүұқөһ]*|ашпай[а-яёәіңғүұқөһ]*)/iu.test(after))return true;
  if(key==='prize'&&/^\s*(?:что\s|како[а-яё]*\s|қандай\s|не\s+берілетіні)/iu.test(text))return true;
  if(key==='prize'&&NO_CONDITIONS.test(text)&&/(?:поле|жол[а-яёәіңғүұқөһ]*|раздел|описани|не\s+объявлен|айтылмаған)/iu.test(text))return true;
  if(key==='prize'&&/^[^.!?;]{0,65}(?:қарастырылмаған|qarastyrylmagan|zhoq|zhok|жоқ|не\s+предусмотр[а-яё]*)\s*$/iu.test(after))return true;
  if(key==='random') {
    if(NO_CONDITIONS.test(text)&&/(?:про\s+|способ|тәсіл|қалай|uslov|shart)/iu.test(text))return true;
    if(/^[^.!?;]{0,45}(?<![\p{L}])(?:нет|жоқ|zhoq|zhok|болмайды|қолданылмайды|қолданбаймыз|тартылмайды|qarastyrylmagan|қолданылмайтын|исключ[её]н[а-яё]*|не\s+(?:будет|использу[а-яё]*|провод[а-яё]*|описан[а-яё]*|предусмотр[а-яё]*|применя[а-яё]*|выбира[а-яё]*|определя[а-яё]*)|ne\s+(?:vybira[a-z]*|vyber[a-z]*|opredel[a-z]*))(?![\p{L}])/iu.test(after))return true;
    if(/(?<![\p{L}])(?:не\s+(?:выбира[а-яё]*|определя[а-яё]*|использу[а-яё]*|применя[а-яё]*)|ne\s+(?:vybira[a-z]*|vyber[a-z]*|opredel[a-z]*))\s*$/iu.test(before))return true;
    if(/(?:кездейсоқтық|случайност[а-яё]*)[^.!?;]{0,20}(?:жоқ|нет)/iu.test(text))return true;
  }
  if(key==='judged'){
    if(NO_CONDITIONS.test(text))return true;
    if(/^[^.!?;]{0,30}(?:не\s+(?:выбира[а-яё]*|определя[а-яё]*|реша[а-яё]*|оценива[а-яё]*)|таңдамайды|бағаламайды)/iu.test(after)||/(?<![\p{L}])не\s+(?:выбира[а-яё]*|определя[а-яё]*|реша[а-яё]*|оценива[а-яё]*)/iu.test(match[0]))return true;
  }
  return false;
}

function entryFreeRole(text,match,raffleContext) {
  if(!freeContext(text,match)||candidateDenied(text,match,'free')||ADMISSION_EXCLUSION.test(text))return false;
  if(/(?:больше|дополнительн[а-яё]*|ещё|көп|тағы)\s+[^.!?;]{0,30}(?:покуп|сатып\s+ал|оплат)/iu.test(text))return false;
  if(/(?:покуп[а-яё]*|плат[её]ж[а-яё]*|оплат[а-яё]*)[^.!?;]{0,45}на\s+(?:сам[а-яё]*\s+)?(?:выставк|площадк|концерт|встреч)[а-яё]*/iu.test(text))return false;
  if(NO_CONDITIONS.test(text))return false;
  if(/(?:бесплатн[а-яё]*|besplatn[a-z]*|тегін|tegin)\s+(?:способ[а-яё]*|пут[а-яё]*|вариант[а-яё]*|жол[а-яёәіңғүұқөһ]*)[^.!?;]{0,50}(?:нет|жоқ|болмайды|net|zhoq)/iu.test(text))return false;
  if(/(?:сыз|сіз)[^.!?;]{0,35}(?:қатыс[а-яёәіңғүұқөһ]*|тіркел[а-яёәіңғүұқөһ]*|нөмір[а-яёәіңғүұқөһ]*)[^.!?;]{0,15}(?:жоқ|болмайды|берілмейді)/iu.test(text))return false;
  if(/(?:без\s+(?:оплат[а-яё]*|покуп[а-яё]*|донат[а-яё]*|взнос[а-яё]*)|bez\s+(?:oplat[a-z]*|pokup[a-z]*|donat[a-z]*))[^.!?;]{0,50}(?:не\s+(?:записыва[а-яё]*|принима[а-яё]*|выда[а-яё]*|допуска[а-яё]*)|нет|net|нельзя|nelzya)/iu.test(text))return false;
  const found=match[0],at=match.index||0;
  const after=text.slice(at+found.length);
  // Denying a free entry path is not an assertion of free entry. The denial
  // must concern the application/code, not the absence of a separate fee.
  if(/(?:бесплатн[а-яё]*|besplatn[a-z]*|тегін|tegin|ақысыз)/iu.test(found)
    && /^[^.!?;]{0,85}(?<![\p{L}])(?:нет|жоқ|не\s+(?:выда[а-яё]*|принима[а-яё]*|предусмотр[а-яё]*)|таратылмай[а-яёәіңғүұқөһ]*|қабылданбай[а-яёәіңғүұқөһ]*|кірмей[а-яёәіңғүұқөһ]*|жүрмейді)(?![\p{L}])/iu.test(after)
    && !/(?:плат[её]ж|взнос|оплат|төлем|жарна)/iu.test(after.split(/нет|жоқ|не\s+|таратылмай|қабылданбай/iu)[0]))return false;
  // A benefit/charge can be free while entry still costs money.
  if(DELIVERY_ROLE.test(text)&&!ENTRY_FREE.test(text)&&matches(text,noPurchase).length===0)return false;
  if(/(?:бесплатн|тегін|тегин|tegin|besplatn|ақысыз|aqysyz)/iu.test(found)){
    const neighbor=text.slice(Math.max(0,at-40),Math.min(text.length,at+found.length+50));
    if(/(?:бесплатн[а-яё]*\s+(?:приз|подар[а-яё]*|комисси|доставк)|(?:тегін|tegin)\s+(?:жүлде|сыйлық|жеткіз|комисси))/iu.test(neighbor)&&!ENTRY_FREE.test(text))return false;
    if(!entryPredicates.test(text)&&!/(?:розыгрыш|разыгр|ұтыс|ойнат|rozygr|utys|utis|oinat)/iu.test(text)&&!new RegExp(entryUnit,'iu').test(text))return false;
  }
  return raffleContext||entryPredicates.test(text)||matches(text,noPurchase).length>0;
}

function paymentContext(source,clause,match,raffleContext) {
  const fragment=clause.text,kind=paymentKind(match[0]);
  if(clause.uncertainLead)return {accepted:false,kind,role:'entry',polarity:'unknown'};
  if(/(?:вопрос|спрашива[а-яё]*|сұра[а-яёәіңғүұқөһ]*|вопросительн[а-яё]*)/iu.test(fragment))return {accepted:false,kind,role:'entry',polarity:'unknown'};
  const at=match.index||0,after=fragment.slice(at+match[0].length);
  const parent=sentenceAt(source.text,{0:match[0],index:clause.start+at}).text;
  const exclusion=/(?:без\s+(?:такого\s+)?(?:оплат[а-яё]*|покуп[а-яё]*|донат[а-яё]*|взнос[а-яё]*)[^.!?;]{0,65}(?:не\s+(?:участв[а-яё]*|добав[а-яё]*|включ[а-яё]*|попад[а-яё]*|допуска[а-яё]*|выда[а-яё]*|принима[а-яё]*)|нет|нельзя)|(?:төлемсіз|талонсыз|билетсіз|донатсыз|төлемей[а-яёәіңғүұқөһ]*)[^.!?;]{0,50}(?:жоқ|берілмей[а-яёәіңғүұқөһ]*|есептелмейді|алмай[а-яёәіңғүұқөһ]*|болмайды)|bez\s+(?:oplat[a-z]*|pokup[a-z]*|donat[a-z]*)[^.!?;]{0,45}(?:ne|net|nelzya)|tolemese[^.!?;]{0,35}qatysa\s+alma[a-z]*)/iu.test(fragment);
  if((exclusion||ADMISSION_EXCLUSION.test(fragment))&&raffleContext)return {accepted:true,kind,role:'entry',polarity:'required'};
  if(/(?:қабылдамай[а-яёәіңғүұқөһ]*|сұрамай[а-яёәіңғүұқөһ]*|ұсынбай[а-яёәіңғүұқөһ]*)/iu.test(fragment))return {accepted:false,kind,role:'entry',polarity:'denied'};
  if(NO_CONDITIONS.test(fragment)||UNCERTAIN.test(fragment)||AMBIGUOUS_CONDITION.test(fragment)||/(?:керек\s+пе|қажет\s+пе|нужн[а-яё]*\s+ли|платно\s+ма|тегін\s+бе)/iu.test(fragment))return {accepted:false,kind,role:'entry',polarity:'unknown'};
  if(/(?:купон|сертификат|coupon)/iu.test(fragment)&&/(?:беріле[а-яёәіңғүұқөһ]*|сыйла[а-яёәіңғүұқөһ]*|в\s+подарок|подарим)/iu.test(fragment))return {accepted:false,kind,role:'reward',polarity:'not-entry'};
  if(/(?:приз|жүлде|сыйлық|prize)[^.!?;]{0,35}(?:купон|сертификат|coupon)/iu.test(fragment)&&!entryPredicates.test(fragment))return {accepted:false,kind,role:'prize-price',polarity:'not-entry'};
  // A coupon already won can require a purchase when redeemed. That purchase
  // does not determine who was admitted into the preceding draw.
  if(/(?:купон|сертификат|coupon)/iu.test(fragment)&&/(?:после\s+побед|после\s+выигрыш|уже\s+выигран|ұтқаннан\s+кейін|ұтып\s+алғаннан\s+кейін|after\s+winning|posle\s+pobed)/iu.test(fragment)
    &&/(?:примен|использ|покуп|заказ|заказ|қолдан|тапсырыс|сатып|redeem|use)/iu.test(fragment))return {accepted:false,kind,role:'reward-redemption',polarity:'not-entry'};
  if(DELIVERY_ROLE.test(fragment)&&(/(?:после\s+побед|выигравш[а-яё]*|после\s+выигрыш|ұтқан|ұтып\s+алған|жеңімпаз)/iu.test(fragment)||!/(?:для\s+участия|чтобы\s+участвовать|қатысу\s+үшін|до\s+допуска)/iu.test(fragment)))return {accepted:false,kind,role:'delivery',polarity:'not-entry'};
  if(/(?:кіру\s+шарт[а-яёәіңғүұқөһ]*\s+емес|kiru\s+shart[a-z]*\s+емес)/iu.test(parent))return {accepted:false,kind,role:'reward-redemption',polarity:'not-entry'};
  if(PRIZE_PRICE.test(fragment)&&!ENTRY_FREE.test(fragment))return {accepted:false,kind,role:'prize-price',polarity:'not-entry'};
  if(/^(?:\s+|и\s+|или\s+|обязательн[а-яё]*\s+|покуп[а-яё]*\s+|взнос[а-яё]*\s+)*(?:нет|жоқ)(?![\p{L}])/iu.test(after))return {accepted:false,kind,role:'entry',polarity:'denied'};
  if(DENIED_SUFFIX.test(after)||/^[^.!?;]{0,22}(?:взнос[а-яё]*\s+)?(?:нет|не\s+(?:требу[а-яё]*|нужн[а-яё]*)|жоқ|емес|талап\s+етілмейді)/iu.test(after))return {accepted:false,kind,role:'entry',polarity:'denied'};
  if(DONATION.test(fragment)&&OPTIONAL.test(parent)&&!new RegExp(mandatory,'iu').test(fragment))return {accepted:false,kind,role:'entry',polarity:'optional'};
  const hasMandatory=new RegExp(mandatory,'iu').test(fragment)||/(?:только\s+после|лишь\s+после|сначала|ғана|тек\s+төленген|төлеп)/iu.test(fragment);
  // Coordinated negative conditions extend across a comma, only when this
  // clause has no positive obligation of its own.
  if(!hasMandatory&&/(?:ештеңе|никаких|ни\s+)[^.!?;]{0,100}(?:қажет\s+емес|талап\s+етілмейді|нет|не\s+требу[а-яё]*)/iu.test(parent))return {accepted:false,kind,role:'entry',polarity:'denied'};
  if(!hasMandatory&&entryPredicates.test(parent)&&!DELIVERY_ROLE.test(parent)&&!PRIZE_PRICE.test(parent)
    && /(?:сатып\s+алу|ақша\s+төлеу)[^.!?;]{0,100}(?:қажет\s+емес|талап\s+етілмейді|керек\s+емес)/iu.test(parent))return {accepted:false,kind,role:'entry',polarity:'denied'};
  if(/(?:оплат[а-яё]*|плат[её]ж[а-яё]*)[^.!?;]{0,30}нулев[а-яё]*|плат[её]ж[а-яё]*\s+(?:ради|для|за)\s+участи[а-яё]*\s+нет(?![\p{L}])/iu.test(fragment))return {accepted:false,kind,role:'entry',polarity:'denied'};
  if(feeIsNegated(fragment,match))return {accepted:false,kind,role:'entry',polarity:OPTIONAL.test(fragment)?'optional':'denied'};
  if(OPTIONAL.test(fragment)&&!hasMandatory)return {accepted:false,kind,role:'entry',polarity:'optional'};
  const role=ENTRY_ROLE.test(fragment)||entryPredicates.test(fragment)||kind==='ticket'||hasMandatory||clause.entryLead;
  return {accepted:Boolean(role),kind,role:role?'entry':'unknown',polarity:role?'required':'unknown'};
}

function randomContext(text,match,raffleContext,continuation='') {
  if(NO_CONDITIONS.test(text)||UNCERTAIN.test(text)||AMBIGUOUS_CONDITION.test(text))return {accepted:false,role:'selection',polarity:'unknown'};
  if(candidateDenied(text,match,'random'))return {accepted:false,role:'selection',polarity:'denied'};
  const stage=stageOf(text);
  if(stage==='preliminary'&&!/(?:финальн[а-яё]*\s+победител|итогов[а-яё]*\s+победител|жүлде\s+иесі)/iu.test(text))return {accepted:false,role:'preliminary-selection',polarity:'positive',stage};
  if(/(?:порядок\s+(?:выступлен[а-яё]*|подачи|ходов)|очередност[а-яё]*|порядков[а-яё]*\s+номер|кезектілік|кездейсоқ\s+(?:пароль|логин)|случайн[а-яё]*\s+(?:распредел[а-яё]*|назнач[а-яё]*|сломал|повредил|курьер|прохож|ошибк|адрес)|генератор\s+(?:парол[а-яё]*|логин[а-яё]*))/iu.test(text))return {accepted:false,role:'other-randomness',polarity:'not-winner',stage};
  const selection=/(?:бер(?:етін|еді|еміз|іледі)|победител|победн[а-яё]*\s+(?:номер|билет)|комментатор|выбор|выб[еи]р|выбра[а-яё]*|определ[а-яё]*|укаж[а-яё]*|отмет[а-яё]*|вытян|вытащ|выпавш|вытяж|назов[а-яё]*|наз[ыи]ва[а-яё]*|достан|жереб|лототрон|фортуны|(?:крутим|вращаем|запускаем)[^.!?;]{0,20}колесо|на\s*угад|na\s*ugad|вслепую|таңда|анықта|белгіле[а-яёәіңғүұқөһ]*|шығар[а-яёәіңғүұқөһ]*|шыққан|суыр[а-яёәіңғүұқөһ]*|алын[а-яёәіңғүұқөһ]*|қарамай|қарамастан|(?<![\p{L}])(?:аламыз|алып|алады|біреуін|біреу|бірін)(?![\p{L}])|жеңімпаз|ұт[а-яёәіңғүұқөһ]*|tanda[a-z]*|any[qk]ta[a-z]*|zhereb[a-z]*|zhenimpaz|vyber[a-z]*|vybir[a-z]*|vybran[a-z]*|vytyan[a-z]*|tyanet|opredel[a-z]*|alamyz|alyp|shygady|belgile[a-z]*|pobedit[a-z]*|suy[ir][a-z]*|su[yi]yr[a-z]*|qaramai|sluchain[a-z]*\s+(?:chisel|nomer)|(?:случайн[а-яё]*\s+участник[а-яё]*)|(?:случайн[а-яё]*\s+автор[а-яё]*\s+комментари[а-яё]*))/iu.test(`${text} ${continuation}`);
  const shorthand=/^\s*(?:рандом[а-яё]*|random[a-z]*|колесо\s+фортуны|генератор)(?:\s+(?:вечером|в\s+эфире|завтра))?\s*$/iu.test(text);
  return {accepted:Boolean(selection||(raffleContext&&shorthand)),role:selection||shorthand?'winner-selection':'unknown',polarity:selection||shorthand?'positive':'unknown',stage};
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
  // Older feed importers preserved the original identity while replacing the
  // working campaignRef. Keep those saved materials intact, but do not combine
  // conditions from conflicting original campaigns into a high alert. The old
  // manualGrouping flag can also be set by appending a source and therefore is
  // not an explicit analyst confirmation of conflicting original identities.
  const originalCampaignRefs=[...new Set(active.map(s=>String(s.originalCampaignRef??'').trim()).filter(Boolean))];
  const identityConflict=originalCampaignRefs.length>1;
  const groupingIntegrity={
    state:identityConflict?'conflict':campaign.manualGrouping===true?'manual':campaign.manualGrouping===false&&active.some(s=>!String(s.originalCampaignRef??'').trim())?'unverified':'consistent',
    automatic:campaign.manualGrouping===false,
    originalCampaignRefs,
  };
  if(identityConflict){
    contradictions.push('Объединённые материалы имеют разные исходные campaignRef; их принадлежность одной кампании не подтверждена. Условия разных кампаний нельзя суммировать для высокого приоритета.');
    linkBasis.push('Сохранены оригинальные источники и их originalCampaignRef. Требуется раздельный разбор; прежний флаг ручной группировки не подтверждает принадлежность источников.');
  }
  if (active.length > 1) {
    const linked = active.filter(source => source.campaignRef && String(source.campaignRef) === expectedRef);
    if (linked.length > 1) linkBasis.push(`Источники ${linked.map(source => source.id).join(', ')} явно отнесены к кампании «${expectedRef}» через campaignRef.`);
    if (linked.length < active.length) linkBasis.push('Часть источников сгруппирована вручную; их принадлежность кампании требует проверки аналитиком.');
  } else if (active.length === 1) {
    linkBasis.push(active[0].campaignRef ? `Источник явно отнесён к кампании «${String(active[0].campaignRef)}» через campaignRef.` : 'Анализируется один загруженный источник.');
  }
  if (excluded.length) linkBasis.push(`Источники ${excluded.map(source => source.id).join(', ')} имеют другой campaignRef и не участвуют в оценке этой кампании.`);
  const promotional = [];
  const contextAtoms = [];
  const contextualFacts = [];
  const contexts = [];
  const judgedAtoms = [];
  const optionalDonations = [];
  for (const original of active) {
    const source=analysisSource(original);
    const warningMatches = matches(source.text, RX.warning);
    for (const match of warningMatches) addEvidence(signals.warning, source, match, labels.warning);
    let text = source.text;
    if (warningMatches.length) {
      const ranges = [];
      const quotedRanges=matches(text,/«[^»]*»|“[^”]*”|"[^"\n]*"|'[^'\n]*'/gu).map(m=>[m.index,m.index+m[0].length]);
      const ownOffer = matches(text,/(?:наш(?:а|и|его|ей|у|ем)?\s+(?:розыгрыш[а-яё]*|акци[а-яё]*)|а\s+у\s+нас|біздің[^\n.!?]{0,45}(?:акци[а-яёәіңғүұқөһ]*|ұтыс[а-яёәіңғүұқөһ]*))/giu).find(m=>!quotedRanges.some(([start,end])=>m.index>=start&&m.index<end)&&!/(?:не\s+|это\s+не\s+)$/iu.test(text.slice(Math.max(0,m.index-15),m.index))&&!/^\s*(?:емес|не\s+(?:провод|наш))/iu.test(text.slice(m.index+m[0].length,m.index+m[0].length+25)));
      const educational = reportingContext.test(text)||/(?:бөтен\s+хабарландыру[а-яёәіңғүұқөһ]*[^.!?;]{0,30}үзінді|талдау\s+үшін\s+келтір[а-яёәіңғүұқөһ]*|chuzh[a-z]*\s+(?:reklam[a-z]*|obyavlen[a-z]*)[^.!?;]{0,30}(?:razbor[a-z]*|citir[a-z]*)|my[^.!?;]{0,20}(?:citiru[a-z]*|preduprezhda[a-z]*)|учебн[а-яё]*\s+(?:пример|разбор|цитат)|математическ[а-яё]*\s+задач|мошенники\s+(?:пишут|обещают|предлагают|просят)|алаяқтар\s+(?:ұсынады|жазады|сұрайды)|ақпараттық\s+сабақ|нұсқаулықтағы\s+мысал|дәйексөз|цитата\s+для\s+(?:обсуждени|разбор)|мы\s+разбираем\s+эту\s+фразу|eskertu|bul\s+tek\s+mysal|taldap\s+otyrmyz)/iu.test(text);
      if (educational) ranges.push([0, ownOffer ? ownOffer.index : text.length]);
      ranges.push(...quotedRanges);
      for (const m of warningMatches) {
        const sentence = sentenceAt(text, m);
        ranges.push([sentence.start, ownOffer && ownOffer.index > m.index && ownOffer.index < sentence.end ? ownOffer.index : sentence.end]);
      }
      const chars = text.split('');
      for (const [start, end] of ranges) for (let i = start; i < end; i++) chars[i] = '\n';
      text = chars.join('');
    }
    promotional.push({ ...source, text });
  }
  const raffleContext = promotional.some(source => clausesOf(source.text).some(clause => matches(clause.text,RX.prize).some(match => !candidateDenied(clause.text,match,'prize'))));
  for (const source of promotional) {
    const clauses=clausesOf(source.text);
    for(let i=0;i<clauses.length;i++){
      const current=clauses[i],previous=clauses[i-1],next=clauses[i+1];
      const continues=(left,right)=>left&&right&&!/[.!?;]/u.test(source.text.slice(left.end,right.start));
      const purpose=previous&&entryPredicates.test(previous.text)&&/(?:чтоб(?:ы)?|для|надо|нужно|только|лишь|үшін|керек|ғана|тек)/iu.test(previous.text);
      const following=next&&entryPredicates.test(next.text)&&/(?:только|лишь|после|ғана|тек|затем)/iu.test(next.text);
      current.entryLead=Boolean(continues(previous,current)&&purpose||continues(current,next)&&following);
      current.performanceLead=Boolean(continues(previous,current)&&/^\s*кто\s+(?:быстрее|точнее|лучше)/iu.test(previous.text));
    }
    const lift=(clause,match)=>({0:match[0],index:clause.start+(match.index||0)});
    const remember=(clause,match,key,decision)=>{
      contextualFacts.push({feature:key,...decision,stage:decision.stage||stageOf(clause.text)});
      const explanation=decision.accepted?(decision.polarity==='optional'?'Донат назван добровольным. Это не доказывает отсутствие других платных условий.':labels[key]||'Заявлен выбор победителя по оценкам или решению жюри.'):`Упоминание исключено из положительного признака: роль «${decision.role}», состояние «${decision.polarity}».`;
      const evidence=quoteFor(source.originalSource||source,originalMatch(source,lift(clause,match)),explanation);
      if(contextAtoms.length<500&&!contextAtoms.some(a=>a.sourceId===evidence.sourceId&&a.start===evidence.start&&a.end===evidence.end&&a.feature===key&&a.role===decision.role&&a.polarity===decision.polarity))contextAtoms.push({feature:key,role:decision.role,polarity:decision.polarity,stage:decision.stage||stageOf(clause.text),accepted:Boolean(decision.accepted),kind:decision.kind||null,...evidence});
      return evidence;
    };
    for(let clauseIndex=0;clauseIndex<clauses.length;clauseIndex++){
      const clause=clauses[clauseIndex],previous=clauses[clauseIndex-1];
      clause.uncertainLead=Boolean(previous&&/^\s*(?:возможно|вероятно|может\s+быть|мүмкін|perhaps|vozmozhno)\s*$/iu.test(previous.text));
      const ctext=clause.text;
      contexts.push({sourceId:source.id,start:originalMatch(source,{0:ctext,index:clause.start}).index,stage:stageOf(ctext)});
      const parentText=sentenceAt(source.text,{0:ctext,index:clause.start}).text;
      const coordinatedDenial=/(?:про\s+|ni\s+|ни\s+|da\s*,|та\s*,|да\s*,|de\s*,)[^.!?;]{0,110}(?:услови[а-яё]*[^.!?;]{0,15}нет|не\s+(?:будет|описан[а-яё]*)|zhoq|zhok|жоқ|қолданылмайды)/iu.test(parentText);
      for(const key of ['prize','random','income','free']){
        const candidates=[...matches(ctext,RX[key]),...(key==='free'?matches(ctext,noPurchase):[])];
        for(const match of candidates){
          let decision={accepted:true,role:key==='prize'?'prize':key==='income'?'organizer-income':'entry',polarity:'positive'};
          if(key==='random'){
            const next=clauses[clauseIndex+1],continuation=next&&!/[.!?;]/u.test(source.text.slice(clause.end,next.start))?next.text:'';
            decision=coordinatedDenial?{accepted:false,role:'selection',polarity:'denied'}:randomContext(ctext,match,raffleContext,continuation);
          }
          else if(key==='free')decision={accepted:entryFreeRole(ctext,match,raffleContext),role:'entry',polarity:'free'};
          else if(candidateDenied(ctext,match,key))decision={accepted:false,role:decision.role,polarity:'denied-or-unknown'};
          if(key==='prize'&&credentialOnly.test(ctext)&&!/(?:приз|жүлде|сыйлық|подарок|подарком|priz|julde|zhulde)/iu.test(ctext))decision={accepted:false,role:'entry-credential',polarity:'not-reward'};
          if(key==='income'&&/(?:без\s+комисси|комисси[а-яё]*[^.!?;]{0,45}(?<!\d)0\s*%|комисси[а-яё]*[^.!?;]{0,35}(?:нет|жоқ|не\s+(?:предусмотр[а-яё]*|взима[а-яё]*))|не\s+получает\s+(?:доход|прибыл)|no\s+(?:commission|profit))/iu.test(ctext))decision.accepted=false;
          if(clause.uncertainLead)decision={...decision,accepted:false,polarity:'unknown'};
          remember(clause,match,key,decision);
          if(decision.accepted)addEvidence(signals[key],source,lift(clause,match),labels[key]);
        }
      }
      const judgedCandidates=matches(ctext,RX.judged);
      if(clause.performanceLead&&/(?:получит|выиграет|победит)/iu.test(ctext))judgedCandidates.push({0:ctext,index:0});
      for(const match of judgedCandidates){
        const decision={accepted:!clause.uncertainLead&&!candidateDenied(ctext,match,'judged'),role:'judged-selection',polarity:'positive',stage:stageOf(ctext)};
        const evidence=remember(clause,match,'judged',decision);
        if(decision.accepted)judgedAtoms.push({...decision,...evidence});
      }
      if(DONATION.test(ctext)&&OPTIONAL.test(ctext)){
        const match=matches(ctext,DONATION)[0];
        const decision={accepted:true,role:'entry-condition',polarity:'optional',kind:'donation'};
        const evidence=remember(clause,match,'free',decision);optionalDonations.push(evidence);
      }
      if(raffleContext)for(const match of matches(ctext,RX.collection)){
        const decision=paymentContext(source,clause,match,raffleContext);remember(clause,match,'collection',decision);
        if(decision.accepted)addEvidence(signals.collection,source,lift(clause,match),labels.collection);
      }
      if(clause.entryLead)for(const match of matches(ctext,new RegExp(pay,'giu'))){const decision=paymentContext(source,clause,match,raffleContext);remember(clause,match,'payment',decision);if(decision.accepted)addEvidence(signals.payment,source,lift(clause,match),labels.payment);}
      // A conditional acquisition can concern any object. Extract the payment
      // predicate first, then require admission/obligation in this clause or
      // its immediately preceding purpose clause. Ordinary retail remains a
      // different role; no prize names or purchased product lists are used.
      const predicateCandidates=[...matches(ctext,new RegExp(pay,'giu')),...matches(ctext,acquisition),...matches(ctext,PURCHASE_PREDICATE)];
      const admission=entryPredicates.test(ctext)||clause.entryLead||(raffleContext&&obligation.test(ctext)&&!DELIVERY_ROLE.test(ctext)&&!PRIZE_PRICE.test(ctext));
      if(admission)for(const match of predicateCandidates){
        const priced=matches(ctext,new RegExp(money,'giu')).length>0;
        const financial=new RegExp(pay,'iu').test(match[0])||matches(match[0],PURCHASE_PREDICATE).length>0;
        if(financial||obligation.test(ctext)||priced){const decision=paymentContext(source,clause,match,raffleContext);remember(clause,match,'payment',decision);if(decision.accepted)addEvidence(signals.payment,source,lift(clause,match),labels.payment);}
      }
      if(admission&&(obligation.test(ctext)||/(?:стоит|құны|бағасы|ақылы)/iu.test(ctext)))for(const match of matches(ctext,new RegExp(money,'giu'))){const decision=paymentContext(source,clause,match,raffleContext);remember(clause,match,'payment',decision);if(decision.accepted)addEvidence(signals.payment,source,lift(clause,match),labels.payment);}
      for(let patternIndex=0;patternIndex<feePatterns.length;patternIndex++){
        // Entry conditions can be observed even when no prize was announced.
        for(const match of matches(ctext,feePatterns[patternIndex])){
          const decision=paymentContext(source,clause,match,raffleContext);remember(clause,match,'payment',decision);
          if(decision.accepted)addEvidence(signals.payment,source,lift(clause,match),labels.payment);
        }
      }
    }
  }
  for (const signal of Object.values(signals)) if (signal.evidence.length) signal.state = 'found';
  const found = key => signals[key].state === 'found';
  const donationConflict=optionalDonations.length>0&&contextualFacts.some(a=>a.feature==='payment'&&a.accepted&&a.kind==='donation');
  if(donationConflict)for(const evidence of optionalDonations)if(!signals.free.evidence.some(e=>e.sourceId===evidence.sourceId&&e.start===evidence.start))signals.free.evidence.push({...evidence,reason:'Донат назван добровольным, но в других условиях оплата доната обязательна для допуска.'});
  const paymentConflict = found('payment') && (found('free')||donationConflict);
  if (paymentConflict) {
    signals.free.state = 'conflict';
    contradictions.push('В материалах одновременно заявлены бесплатное участие и обязательная оплата или покупка. Проверьте порядок публикаций и действующие условия.');
  }
  const judged = judgedAtoms.some(a=>a.stage!=='preliminary');
  const incomplete = promotional.some(source => NO_CONDITIONS.test(source.text)||AMBIGUOUS_CONDITION.test(source.text)||/(?:полные\s+условия[^\n.!?]{0,30}(?:позже|вечером|опубликуем|будут)|способ[^\n.!?]{0,50}не\s+(?:указан|объявлен)|(?:приз|способ\s+участия)[^\n.!?]{0,70}не\s+объявлен|информации\s+об\s+оплате[^\n.!?]{0,50}нет|подробности\s+пока\s+обсуждаем|(?:шарт|ереже|ақпарат|тәсіл)[а-яёәіңғүұқөһ]*[^.!?]{0,40}(?:кейін|әлі\s+жарияланбаған)|(?:shart|erezhe|aqparat)[a-z]*[^.!?]{0,40}(?:kei[iy]n|ali\s+zhariyalanbagan)|usloviy[a-z]*[^.!?]{0,35}(?:pozzhe|eshe\s+ne\s+obyavlen[a-z]*))/iu.test(source.text));
  const judgedConflict = judged && found('random');
  const randomDenialConflict=found('random')&&contextualFacts.some(a=>a.feature==='random'&&!a.accepted&&a.polarity==='denied'&&a.stage!=='preliminary');
  if (judgedConflict||randomDenialConflict) {
    signals.random.state = 'conflict';
    contradictions.push(judgedConflict?'Указаны и случайный выбор победителя, и решение жюри или по оценкам. Условия финального выбора требуют уточнения.':'Одни материалы утверждают случайный выбор, другие его отрицают. Требуется сверить действующие условия.');
  }
  const coreCount = ['prize', 'payment', 'random'].filter(key => signals[key].state !== 'unknown').length;
  const warningOnly = coreCount === 0 && found('warning');
  const explicitFree = signals.free.state === 'found' && !found('payment');
  let risk = 'low';
  let score = 8;
  if (identityConflict || paymentConflict || judgedConflict || randomDenialConflict) {
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
      groupingIntegrity,
      coverage: Math.round(['prize', 'payment', 'random', 'income'].filter(key => signals[key].state !== 'unknown').length / 4 * 100),
      reviewRequired: risk !== 'low',
      engineVersion: ENGINE_VERSION,
      context: {schemaVersion:'clause-v1',normalization:'NFKC, mixed glyphs, bounded OCR hyphen repair and limited Kazakh transliteration families; original UTF-16 offsets',clauseCount:contexts.length,atoms:contextAtoms,limits:'Dictionary and clause rules; stages and attribution remain heuristic. Quotes are original source substrings. At most 500 context atoms are exposed.'},
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
