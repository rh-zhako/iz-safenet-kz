// Authored synthetic cases. Freeze labels before changing the engine.
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const path=new URL('../evaluation/challenge-v1.json',import.meta.url);
if(existsSync(path))throw new Error('Frozen dataset already exists; do not overwrite it.');
const dev=[
 ['high','ru','wheel','Розыгрыш телефона. Слот 2500 тенге. Победителя определит колесо фортуны. Комиссия организатора 8%.'],
 ['high','kk','paid-kz','Телефон ұтысы! Қатысу құны 1500 теңге. Жеңімпаз кездейсоқ таңдалады.'],
 ['high','ru','split',['Разыгрываем велосипед. #draw_dev03','Для участия переведите взнос на карту. #draw_dev03','Победитель через жеребьевку в эфире. #draw_dev03']],
 ['high','ru','purchase','Приз — планшет. Чтобы участвовать, купите набор за 5000 тенге. Победителя выберет рандомайзер.'],
 ['high','mix','mixed','Жүлде — смартфон. Для участия оплатите билет. Кездейсоқ жеңімпазды анықтаймыз.'],
 ['high','translit','translit','Rozygrysh telefona. Bilet 2000 KZT. Pobeditel random.'],
 ['high','ru','not-free','Розыгрыш часов. Участие не бесплатно. Победителя выберем случайно.'],
 ['high','ru','free-delivery','Разыгрываем самокат. Билет 3000 тг. Доставка приза бесплатная. Победитель через жеребьевку.'],
 ['high','ru','slang','Розыгрыш приставки. Слот за 2к тенге. Крутим колесо в эфире.'],
 ['high','kk','ticket-kz','Көлік ұтысы. Нөмір бағасы 2000 теңге. Жеңімпаз рандом арқылы таңдалады.'],
 ['low','ru','free','Разыгрываем книгу. Участие бесплатно, покупка не обязательна. Победителя выберем случайно.'],
 ['low','kk','free-kz','Кітап ұтысы. Қатысу тегін. Жеңімпаз кездейсоқ таңдалады.'],
 ['low','ru','warning','Мошенники предлагают: «Розыгрыш телефона. Билет 3000 тг. Победитель случайный». Не переводите деньги.'],
 ['low','kk','warning-kz','Алаяқтар ұсынады: «Телефон ұтысы. Нөмір 2000 теңге. Жеңімпаз рандом». Ақша аудармаңыз.'],
 ['low','ru','jury','Конкурс рисунков с призом. Регистрационный взнос 1000 тенге. Победителя определяет жюри.'],
 ['low','ru','retail','Продаём смартфон за 50000 тенге. Это обычная продажа, розыгрыша нет.'],
 ['low','ru','voluntary','Розыгрыш книги. Участие бесплатно. Донат по желанию, на шансы не влияет. Победитель случайный.'],
 ['low','kk','voluntary-kz','Кітап ұтысы. Қатысу тегін. Қатысу үшін донат міндетті емес. Жеңімпаз кездейсоқ таңдалады.'],
 ['low','ru','delivery','Розыгрыш книги. Участие бесплатно. Победитель оплачивает доставку после выигрыша. Выбор случайный.'],
 ['low','ru','negation','Конкурс с призом. Для участия оплатите взнос. Рандом не используется. Победителя выбирает жюри.'],
 ['low','ru','price-prize','Розыгрыш смартфона. Цена приза 300000 тенге. Участие бесплатно. Победитель случайный.'],
 ['low','ru','no-raffle','Билет на концерт 8000 тенге. Места распределяются случайно. Розыгрыша и приза нет.'],
 ['low','translit','free-translit','Rozygrysh knigi. Uchastie besplatno, bez oplaty. Random vyberet pobeditelya.'],
 ['low','ru','no-commission','Розыгрыш книги. Участие бесплатно. Победитель случайный. Комиссия организатора 0%.'],
 ['medium','ru','missing-random','Разыгрываем телефон. Для участия оплатите билет 2000 тенге. Способ определения победителя пока не указан.'],
 ['medium','ru','conflict-free',['Розыгрыш планшета. Участие бесплатное. Победителя выберем случайно.','Для участия обязательно купите билет за 2000 тенге.']],
 ['medium','ru','conflict-jury','Розыгрыш ноутбука. Билет 4000 тг. Победитель через рандом. Победителя определяет жюри.'],
 ['medium','ru','unknown-entry','Разыгрываем велосипед. Победитель случайный. Условия участия опубликуем вечером.'],
 ['medium','kk','unknown-entry-kz','Телефон ұтысы. Жеңімпаз кездейсоқ таңдалады.'],
 ['medium','ru','missing-prize','Для участия оплатите взнос. Победитель определяется случайно. Описание приза появится позже.'],
 ['medium','ru','teaser','Розыгрыш! Полные условия будут позже.'],
 ['medium','mix','conflict-kz','Жүлде — сағат. Қатысу тегін. Қатысу үшін міндетті төлем 2000 теңге. Жеңімпаз кездейсоқ таңдалады.'],
];
const holdout=[
 ['high','ru','slots','Разыгрываем наушники. Продажа слотов открыта. Победитель через колесо удачи.'],
 ['high','kk','entry-price','Жүлде — ноутбук. Қатысу құны 2500 теңге. Жеңімпазды кездейсоқ таңдаймыз.'],
 ['high','mix','cross-post',['Планшет ұтысы! #draw_hold03','Нөмір бағасы 3500 теңге. #draw_hold03','Победителя определит рандомайзер. #draw_hold03']],
 ['high','translit','ticket-translit','Rozygrysh velosipeda. Bilet 4500 KZT. Random opredelit pobeditelya.'],
 ['high','ru','mandatory-donation','Розыгрыш игровой консоли. Обязательный донат для участия 1500 тенге. Победитель через жеребьевку.'],
 ['high','ru','gift-purchase','Дарим телефон. Для участия обязательная покупка набора. Выбор победителя случайный.'],
 ['high','kk','paid','Ұтысқа қатысу ақылы. Жүлде — велосипед. Жеңімпаз рандом арқылы анықталады.'],
 ['high','ru','wheel-live','Приз — телевизор. За номер 5000 тенге. В эфире запускаем колесо фортуны. Доход организатора — комиссия.'],
 ['low','ru','no-payment','Розыгрыш блокнота. Платить не нужно. Победителя определит колесо удачи.'],
 ['low','kk','no-payment-kz','Сыйлық — кітап. Қатысу үшін төлем қажет емес. Жеңімпазды кездейсоқ таңдаймыз.'],
 ['low','ru','educational','Учебный разбор схемы: «Приз телефон; участие после оплаты; победитель случайный». Не участвуйте в таких предложениях.'],
 ['low','kk','warning','Алаяқтық туралы ескерту. Ақша аудармаңыз. «Ұтысқа қатысу ақылы. Жүлде көлік. Жеңімпаз кездейсоқ».'],
 ['low','ru','skills','Конкурс фотографий. Приз — камера. Для участия оплатите взнос. Победителя выбирает жюри по оценкам.'],
 ['low','ru','retail-negated','Купите билет на выставку. Подарков и розыгрышей нет. Распределение мест случайное.'],
 ['low','ru','shipping','Разыгрываем картину. Участие бесплатно. Доставку оплачивает победитель после выигрыша. Победитель случайный.'],
 ['low','mix','free-mixed','Жүлде — кітап. Участие бесплатно, донат по желанию. Победитель случайный.'],
 ['low','translit','free','Rozygrysh kalendarya. Uchastie besplatno. Vybor random.'],
 ['low','ru','prize-price','Розыгрыш сертификата. Стоимость приза 10000 тенге. Для участия покупать не нужно. Выбор случайный.'],
 ['medium','ru','no-method','Розыгрыш велосипеда. Для участия купите билет. Как определим победителя — ещё не указано.'],
 ['medium','kk','no-method-kz','Ұтысқа қатысу ақылы. Жүлде — сағат.'],
 ['medium','mix','conflict','Телефон ұтысы. Қатысу тегін. Для участия обязательная покупка билета. Победитель случайный.'],
 ['medium','ru','incomplete','Разыгрываем камеру. Победителя выберет рандомайзер. Условия оплаты пока не объявлены.'],
 ['medium','ru','jury-conflict','Розыгрыш часов. Слот 1200 тенге. Победитель случайный. Победителя определяет жюри.'],
 ['medium','ru','teaser','Приз будет! Полные условия опубликуем позже.'],
];
const expand=(rows,split)=>rows.map(([expectedRisk,language,tag,text],i)=>{
 const id=`${split}-${String(i+1).padStart(2,'0')}`;
 return {id,title:`${split}: ${tag}`,split,language,tag,expectedRisk,synthetic:true,manualGrouping:false,sources:(Array.isArray(text)?text:[text]).map((t,j)=>({id:`${id}-s${j+1}`,type:'text',text:t,campaignRef:id,kind:j===2?'live':'post'}))};
});
const data={version:'challenge-v1',created:'2026-10-20',provenance:'Authored synthetic text scenarios; no real persons or accounts. Labels fixed before engine changes. Same developer authored dataset and engine; not independently blinded.',labelDefinition:{high:'Explicit prize/raffle + mandatory entry payment + random winner, no unresolved contradiction',medium:'Missing core conditions or conflicting active terms',low:'Explicit free entry, skill/jury selection, warnings or ordinary retail'},cases:[...expand(dev,'development'),...expand(holdout,'holdout')]};
const raw=JSON.stringify(data,null,2)+'\n';mkdirSync(new URL('../evaluation/',import.meta.url),{recursive:true});writeFileSync(path,raw);writeFileSync(new URL('../evaluation/challenge-v1.sha256',import.meta.url),createHash('sha256').update(raw).digest('hex')+'  challenge-v1.json\n');console.log(`Frozen ${data.cases.length} authored scenarios: ${dev.length} development + ${holdout.length} holdout.`);
