/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main() {
	var prefs = AnyBalance.getPreferences();

	checkEmpty(prefs.login,
		'Введите номер вашего телефона для входа в Мой Киевстар (в формате +380ХХХХХХХХХ), например +380971234567');
	checkEmpty(prefs.password, 'Введите пароль!');

	AnyBalance.setOptions({
		SSL_ENABLED_PROTOCOLS: ['TLSv1'], // https://my.kyivstar.ua очень смущается от присутствия TLSv1.1 и TLSv1.2
	});

	try {
		processSite();
	} catch (e) {
		if (e.fatal)
			throw e;
		AnyBalance.trace('Не удалось получить данные из лк: ' + e.message);
		AnyBalance.trace('Попробуем получить данные из мобильного приложения');
		processMobileApi();
	}
}

function processSite() {
	var prefs = AnyBalance.getPreferences();

	// var baseurl = "https://my.kyivstar.ua/";
	var baseurl = 'https://account.kyivstar.ua/';
	var html = loginSite(baseurl);

	/**
	if (!/payment\/activity\//i.test(html)) {
		//Не нашли ссылку на платежи. Очень вероятно, что это корпоративный аккаунт
		throw new AnyBalance.Error("Похоже, у вас корпоративный аккаунт. Пожалуйста, воспользуйтесь провайдером Киевстар для корпоративных тарифов");
	}
	*/

	if (/HierarchyOverview/i.test(html)) {
		throw new AnyBalance.Error(
			"Ошибка. Информация о номере не найдена. Если у вас корпоративный аккаунт, воспользуйтесь провайдером Киевстар для корпоративных тарифов."
		);
	}

	var result = {
		success: true
	};

	// 	{
	// success: true,
	// name: "Харченко Виктор",
	// __tariff: "СВОБОДНЫЙ СМАРТФОН. РЕГИОН 2",
	// bonusDate: "+380682834365 Настройки телефона",
	// till: 1486501200000
	// }

	//тип ЛК
	if (/(?:мобильного|мобільного|Mobile\s+phone\s+number)/i.test(html)) {
		AnyBalance.trace('тип лк: Домашний интернет');

		// Баланс
		getParam(html, result, 'balance',
			/(?:Текущий\s+баланс|Поточний\s+баланс|Current\s+balance)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces,
			parseBalance);
		getParam(html, result, ['currency', 'balance'],
			/(?:Текущий\s+баланс|Поточний\s+баланс|Current\s+balance)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
			replaceTagsAndSpaces, parseCurrency);

		// Бонус
		getParam(html, result, 'bonusValue',
			/(?:Бонусный\s+баланс|Бонусний\s+баланс|Bonuses)(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i,
			replaceTagsAndSpaces, parseBalance);

		getParam(html, result, 'bonusDate',
			/(?:Бонусный\s+баланс|Бонусний\s+баланс|Bonuses)(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i,
			replaceTagsAndSpaces);

		//Номер телефона
		getParam(html, result, 'phone',
			/(?:Номер\s+мобильного\s+телефона|Номер\s+мобільного\s+телефону|Mobile\s+phone\s+number)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
			replaceTagsAndSpaces);

		//Статус
		getParam(html, result, 'status',
			/(?:Статус\s+услуги|Статус\s+послуги|state\s+of\s+service)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
			replaceTagsAndSpaces);

		//Лицевой счет
		getParam(html, result, 'personal_account',
			/(?:Лицевой\s+сч[её]т|Особовий\s+рахунок|Account:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
			replaceTagsAndSpaces);

	} else {
		AnyBalance.trace('тип лк: Телефон');

		//Срок действия номера
		sumParam(html, result, 'till', /(?:Номер діє до:|Номер действует до:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
			replaceTagsAndSpaces, parseDate, aggregate_sum);

		// Баланс (лк Телефон)
		getParam(html, result, 'balance',
			/(?:Остаток\s+на\s+сч[её]ту|Залишок\s+на\s+рахунку:)[\s\S]*?<tr[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces,
			parseBalance);
		getParam(html, result, ['currency', 'balance'],
			/(?:Остаток\s+на\s+сч[её]ту|Залишок\s+на\s+рахунку:)[\s\S]*?<tr[^>]*>([\s\S]*?)<\/td>/i,
			replaceTagsAndSpaces, parseCurrency);

		//Номер телефона (лк Телефон)
		getParam(html, result, 'phone',
			/Номер:[\s\S]*?<td[^>]*>([^<]*)/i,
			replaceTagsAndSpaces);
	}

	getParam(html, result, 'name',
		/(?:Фамилия|Прізвище|First\s+name)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

	//Тарифный план
	getParam(html, result, '__tariff',
		/(?:Тарифный\s+план|Тарифний\s+план|Rate\s+Plan)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
		replaceTagsAndSpaces);



	//Бонусные минуты (1) на номера внутри сети
	sumParam(html, result, 'bonus_mins_1',
		/(?:Кількість хвилин для дзвінків|Количество минут для звонков)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_1',
		/(?:Хвилини всередині мережі ["«»]?Ки.встар["«»]?:|Минуты внутри сети ["«»]?Ки.встар["«»]?:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_1',
		/(?:Єдина абонентська група:|Единая абонентская группа:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces,
		parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_1',
		/(?:Залишок хвилин для дзвінків на Ки.встар:|Остаток минут для звонков на Ки.встар:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_1',
		/(?:Залишок хвилин для дзвінків абонентам Ки.встар та Beeline|Остаток минут для звонков абонентам Ки.встар и Beeline)\s*:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_1',
		/(?:Залишок:|Остаток минут на сеть Киевстар:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces,
		parseMinutes, aggregate_sum); //обратить внимание на "Залишок:", может измениться
	sumParam(html, result, 'bonus_mins_1',
		/(?:"\d+ хвилин на міські номери":|"\d+ минут на городские номера":)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	//Срок действия бонусных минут (1)
	sumParam(html, result, 'bonus_mins_1_till',
		/(?:Залишок хвилин для дзвінків на Ки.встар:|Остаток минут для звонков на Ки.встар:)[\s\S]*?<td[^>]*>[\s\S]*?<\/td>([\s\S]*?)<\/td>/i,
		replaceTagsAndSpaces, parseDate, aggregate_sum);
	//Бонусные минуты (2) на любые номера
	sumParam(html, result, 'bonus_mins_2',
		/(?:Залишок хвилин для дзвінків абонентам Ки.встар та DJUICE:|Остаток минут для звонков абонентам Ки.встар и DJUICE:)[\s\S]*?<b>([^<]*)/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2',
		/(?:Залишок Хвилини на КС 500 хв:|Остаток Минуты на КС 500 мин:)[\s\S]*?<b>([^<]*)/ig, replaceTagsAndSpaces,
		parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2',
		/(?:Залишок тарифних хвилин для дзвінків в межах України:|Остаток тарифних минут для звонков в пределах Украин[иы]\s*:)[\s\S]*?<b>([^<]*)/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2',
		/(?:Залишок хвилин для дзвінків в межах України:|Остаток минут для звонков в пределах Украин[иы]\s*:)[\s\S]*?<b>([^<]*)/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2',
		/(?:Залишок хвилин для дзвінків по Україні:|Остаток минут для звонков по Украине:)[\s\S]*?<b>([^<]*)/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2',
		/(?:Залишок хвилин для дзвінків на інших операторів та номери фіксованого зв"язку|Остаток минут для звонков на других операторов)(?:[^>]*>){3}(.*)/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2', /(?:Залишок хвилин|Остаток минут):(?:[^>]*>){3}(.*)/ig, replaceTagsAndSpaces,
		parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2',
		/(?:Залишок хвилин на інші мобільні мережі в межах України|Остаток минут на другие мобильные сети в пределах Украины):(?:[^>]*>){3}(.*)/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2',
		/(?:Залишок хвилин на інші мережі по Україні:|Остаток минут на другие сети по Украине:)[\s\S]*?<b>([^<]*)/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2',
		/(?:Залишок хвилин для дзвінків на інші мережі|Остаток минут для звонков на другие сети)[\s\S]*?<b>([^<]*)/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2', /(?:Хвилини на інші мобільні|Минуты на другие мобильные):(?:[^>]*>){3}(.*)/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	//Срок действия бонусных минут (2)
	sumParam(html, result, 'bonus_mins_2_till',
		/(?:Залишок хвилин на інші мобільні мережі в межах України:|Остаток минут на другие мобильные сети в пределах Украины:)[\s\S]*?<td[^>]*>[\s\S]*?<\/td>([\s\S]*?)<\/td>/i,
		replaceTagsAndSpaces, parseDate, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2_till',
		/(?:Залишок хвилин на інші мережі по Україні:|Остаток минут на другие сети по Украине:)[\s\S]*?<td[^>]*>[\s\S]*?<\/td>([\s\S]*?)<\/td>/i,
		replaceTagsAndSpaces, parseDate, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2_till',
		/(?:Залишок хвилин для дзвінків на інші мережі|Остаток минут для звонков на другие сети)[\s\S]*?<td[^>]*>[\s\S]*?<\/td>([\s\S]*?)<\/td>/i,
		replaceTagsAndSpaces, parseDate, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2_till',
		/(?:Хвилини на інші мобільні|Минуты на другие мобильные)[\s\S]*?<td[^>]*>[\s\S]*?<\/td>([\s\S]*?)<\/td>/i,
		replaceTagsAndSpaces, parseDate, aggregate_sum);
	//Тарифные минуты:
	sumParam(html, result, 'mins_tariff', /(?:Тарифні хвилини:|Тарифные минуты:)[\s\S]*?<b>([^<]*)/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	//Доплата за входящие:
	sumParam(html, result, 'inc_pay', /(?:Доплата за входящие звонки:|Доплата за входящие звонки:)[\s\S]*?<b>([^<]*)/ig,
		replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//MMS
	sumParam(html, result, 'mms', />(?:Бонусні MMS:|Бонусные MMS:)[\s\S]*?<b>(.*?)</, replaceTagsAndSpaces, parseBalance,
		aggregate_sum);
	sumParam(html, result, 'mms', />MMS:[\s\S]*?<b>(.*?)</, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//SMS
	sumParam(html, result, 'sms', />(?:Бонусні SMS:|Бонусные SMS:)[\s\S]*?<b>(.*?)</, replaceTagsAndSpaces, parseBalance,
		aggregate_sum);
	sumParam(html, result, 'sms', />SMS:[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'sms',
		/(?:Остаток текстових сообщений для отправки абонентам Киевстар и Beeline|Залишок текстових повідомлень для відправки абонентам Київстар та Beeline):[\s\S]*?<b>(.*?)</ig,
		replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'sms', />(?:СМС за умовами (?:ТП|пакета):|СМС по условиям (?:ТП|пакета):)[\s\S]*?<b>(.*?)</,
		replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'sms', />(?:Залишок смс|Остаток смс):[\s\S]*?<b>(.*?)</i, replaceTagsAndSpaces, parseBalance,
		aggregate_sum);
	sumParam(html, result, 'sms',
		/>(?:Домашній регіон. Залишок СМС по Україні|Домашний регион. Остаток СМС по Украине):[\s\S]*?<b>(.*?)</i,
		replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'sms', />(?:SMS по Україні|SMS[^<]*по Украине:)[\s\S]*?<b>(.*?)</i, replaceTagsAndSpaces,
		parseBalance, aggregate_sum);
	sumParam(html, result, 'sms', />(?:Остаток сообщений|Остаток сообщений):[\s\S]*?<b>(.*?)</i, replaceTagsAndSpaces,
		parseBalance, aggregate_sum);
	sumParam(html, result, 'sms', />(?:Залишок SMS на день|Остаток SMS на день):[\s\S]*?<b>(.*?)</i, replaceTagsAndSpaces,
		parseBalance, aggregate_sum);
	sumParam(html, result, 'sms', />(?:Залишок SMS|Остаток SMS):[\s\S]*?<b>(.*?)</i, replaceTagsAndSpaces, parseBalance,
		aggregate_sum);

	//Бонусные средства
	sumParam(html, result, 'bonus_money', /(?:Бонусні кошти:|Бонусные средства:)[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces,
		parseBalance, aggregate_sum);
	sumParam(html, result, 'bonus_money',
		/(?:Бонуси за умовами тарифного плану ["«»]Єдина ціна["«»]:|Бонусы по условиям тарифного плана ["«»]Единая цена["«»]:)[\s\S]*?<b>(.*?)</ig,
		replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'bonus_money',
		/(?:["«»]Екстра кошти["«»]|["«»]Экстра деньги["«»]|["«»]Екстра гроші["«»]):[\s\S]*?<b>(.*?)</ig,
		replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'bonus_money_till',
		/(?:Бонусні кошти:|Бонусные средства:)(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseDate,
		aggregate_min);
	sumParam(html, result, 'bonus_money_till',
		/(?:Бонуси за умовами тарифного плану ["«»]Єдина ціна["«»]:|Бонусы по условиям тарифного плана ["«»]Единая цена["«»]:)(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseDate, aggregate_min);
	sumParam(html, result, 'bonus_money_till',
		/(?:Кошти по послузі ["«»]Екстра кошти["«»]|Средства по услуге ["«»]Экстра деньги["«»]):(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseDate, aggregate_min);
	//Остаток бонусов
	sumParam(html, result, 'bonus_left', /(?:Залишок бонусів:|Остаток бонусов:)[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces,
		parseBalance, aggregate_sum);
	sumParam(html, result, 'bonus_left',
		/(?:Залишок бонусів:|Остаток бонусов:)[\s\S]*?(?:Залишок бонусів:|Остаток бонусов:)[\s\S]*?<b>(.*?)</ig,
		replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'bonus_left', /(?:Акція «Бонус \+»:|Акция «Бонус \+»:)[\s\S]*?<b>(.*?)</ig,
		replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'bonus_money_till',
		/(?:Залишок бонусів:|Остаток бонусов:)(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseDate,
		aggregate_min);
	sumParam(html, result, 'bonus_money_till',
		/(?:Залишок бонусів:|Остаток бонусов:)[\s\S]*?(?:Залишок бонусів:|Остаток бонусов:)(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseDate, aggregate_min);
	sumParam(html, result, 'bonus_money_till',
		/(?:Акція «Бонус \+»:|Акция «Бонус \+»:)(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseDate,
		aggregate_min);
	//Интернет
	sumParam(html, result, 'internet',
		/(?:Залишок бонусного об\'єму даних:|Остаток бонусного объема данных:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseTraffic, aggregate_sum);
	sumParam(html, result, 'internet',
		/(?:Залишок байт для користування послугою Інтернет GPRS\s*:|Остаток байт для пользования услугой Интернет GPRS\s*:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseTraffic, aggregate_sum);
	sumParam(html, result, 'internet',
		/(?:Остаток GPRS Internet\s*:|Залишок GPRS Internet\s*:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces,
		parseTraffic, aggregate_sum);
	sumParam(html, result, 'internet',
		/(?:Остаток Мб для пользования услугой Интернет GPRS\s*:|Залишок Мб для користування послугою Інтернет GPRS\s*:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseTraffic, aggregate_sum);
	sumParam(html, result, 'internet',
		/(?:Мб для Мобильного Интернета|Мб для Мобільного Інтернету)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseTraffic, aggregate_sum);
	sumParam(html, result, 'internet',
		/(?:Залишок байт на день:|Остаток байт на день:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces,
		function(str) {
			return parseTraffic(str, 'b');
		}, aggregate_sum);
	sumParam(html, result, 'internet', /(?:Інтернет:|Интернет:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces,
		function(str) {
			return parseTraffic(str, 'b');
		}, aggregate_sum);
	//  (?:Internet_\d+Mb_в_день:) - А вот так пейстор чудит...
	sumParam(html, result, 'internet', /Internet_\d{1,4}Mb_в_день:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces,
		function(str) {
			return parseTraffic(str, 'b');
		}, aggregate_sum);
	//Бонусный интернет
	sumParam(html, result, 'bonus_internet',
		/(?:Залишок бонусного об’єму даних для інтернет доступу:|Остаток бонусного объема данных для интернет доступа:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseTraffic, aggregate_sum);
	sumParam(html, result, 'bonus_internet_till',
		/(?:Залишок бонусного об’єму даних для інтернет доступу:|Остаток бонусного объема данных для интернет доступа:)(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseDate, aggregate_min);
	//Домашний Интернет
	sumParam(html, result, 'home_internet',
		/(?:Від послуги[^<]*Домашній Інтернет|От услуги[^<]*Домашний Интернет|Бонусні кошти послуги[^<]*Домашній Інтернет|Бонусные средства услуги[^<]*Домашний Интернет|Від Домашнього Інтернету|От Домашнего Интернета)[^<]*:(?:[^>]*>){3}([\s\S]*?)грн/ig,
		replaceTagsAndSpaces, parseBalance, aggregate_sum);
	getParam(html, result, 'home_internet_date',
		/(?:Від послуги[^<]*Домашній Інтернет|От услуги[^<]*Домашний Интернет|Бонусні кошти послуги[^<]*Домашній Інтернет|Бонусные средства услуги[^<]*Домашний Интернет|Від Домашнього Інтернету|От Домашнего Интернета)[^<]*:(?:[^>]*>){8}\s*<nobr>([^<]*)/i,
		replaceTagsAndSpaces, parseDate);
	//Порог отключения
	sumParam(html, result, 'limit', /(?:Поріг відключення:|Порог отключения:)[\s\S]*?<b>([^<]*)/i, replaceTagsAndSpaces,
		parseBalance, aggregate_sum);



	//Срок действия услуги Комфортный переход
	if (AnyBalance.isAvailable('comfort_till')) {
		if (!/overview/i.test(AnyBalance.getLastUrl()))
			html = AnyBalance.requestGet(baseurl + "tbmb/tsm/overview.do", g_headers);
		if (/show.do\?featureId=99&amp;in=1/i.test(html)) {
			html = AnyBalance.requestGet(baseurl + "tbmb/tsm/complexFeature/show.do?featureId=99&in=1", g_headers);
			sumParam(html, result, 'comfort_till',
				/(?:Послуга буде автоматично відключена&nbsp;|Услуга будет автоматически отключена&nbsp;)([\s\S]*?)<\/td>/ig,
				replaceTagsAndSpaces, parseDate, aggregate_min);
		}
	}
	//Пакет SMS
	if (AnyBalance.isAvailable('sms_packet', 'sms_packet_till', 'sms_packet_left')) {
		if (!/overview/i.test(AnyBalance.getLastUrl()))
			html = AnyBalance.requestGet(baseurl + "tbmb/tsm/overview.do", g_headers);
		if (/show.do\?featureId=349&amp;in=1/i.test(html)) {
			html = AnyBalance.requestGet(baseurl + "tbmb/tsm/complexFeature/show.do?featureId=349&in=1", g_headers);
			getParam(html, result, 'sms_packet', /<nobr>(?:Пакет: |Пакет: )<strong> ([\s\S]*?) <\/strong>/i,
				replaceTagsAndSpaces);
			sumParam(html, result, 'sms_packet_till', /<nobr>(?:Срок действия:|Строк дії:) <strong> ([\s\S]*?)<\/strong>/ig,
				replaceTagsAndSpaces, parseDate, aggregate_min);
			sumParam(html, result, 'sms_packet_left', /<nobr>(?:Остаток:|Залишок:) <strong> ([\s\S]*?)sms/ig,
				replaceTagsAndSpaces, parseInt, aggregate_sum);
		}
	}
	AnyBalance.setResult(result);
}

var g_session_counter = 0;
var g_session_token;
var g_replace_date = [/01.01.0001/, 'истек'];

function createMobileParams(params) {
	var o = {
		"version": "1.6.0.0",
		"lang": "ru",
		"sourceId": "Android 4.2"
	};
	var ret = {};
	if (params) {
		for (var i in params) {
			ret[i] = params[i];
		}
	}
	for (var i in o) {
		ret[i] = o[i];
	}
	return ret;
}

function getMobileApiResult(json) {
	if (json.errorCode)
		throw new AnyBalance.Error(json.errorMsg, null, /wrong\s+password/i.test(json.errorMsg));
	return json.value;
}

function callMobileApi(cmd, params) {
	var html, baseurl = 'https://my.kyivstar.ua/MobileConverter2/v2/';
	var headers = {
		Connection: 'keep-alive',
		SESSION_COUNTER: '' + (g_session_counter++),
		SESSION_TOKEN: g_session_token,
		'Content-Type': 'application/json;charset=UTF-8',
		'X-Requested-With': 'com.kyivstar.mykyivstar',
		'User-Agent': 'Mozilla/5.0 (Linux; U; Android 4.2; ru-ru; Android SDK built for x86 Build/JOP40C) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
		'Accept-Language': 'ru-RU, en-US',
		'Accept-Charset': 'utf-8, iso-8859-1, utf-16, *;q=0.7'
	};

	if (!isArray(params)) { //Простой запрос
		html = AnyBalance.requestPost(baseurl + cmd + '/?' + new Date().getTime(), JSON.stringify({
			param: createMobileParams(params)
		}), headers);
		var json = getJson(html);
		var value = getMobileApiResult(json);
		if (cmd == 'login2') {
			if (value.session_token)
				g_session_token = value.session_token;
		}
		return value;
	} else { //Бэтч
		var batchParams = [];
		for (var i = 0; i < params.length; ++i) {
			var param = params[i];
			for (var name in param) {
				var newParam = {};
				newParam[name] = {
					param: createMobileParams([param[name]])
				};
				batchParams.push(newParam);
			}
		}
		html = AnyBalance.requestPost(baseurl + 'batch/?' + new Date().getTime(), JSON.stringify(batchParams), headers);
		var json = getJson(html);
		return json;
	}
}

function processMobileApi() {
	var prefs = AnyBalance.getPreferences();
	var result = {
		success: true
	};

	loginMobile();
	var ticket = getParam(AnyBalance.getLastUrl(), null, null, /ticket=([^&]*)/i, null, decodeURIComponent);
	if (!ticket)
		throw new AnyBalance.Error('Не удалось найти тикет для авторизации в мобильном приложении. Сайт изменен?');

	var json = callMobileApi('login2', {
		ticket: ticket
	});
	getParam(json.rate_plan, result, '__tariff');
	getParam(json.uid, result, 'phone');

	json = callMobileApi('batch', [{
		getBalance: {}
	}, {
		getBonuses: {}
	}, {
		showProfile: {}
	}]);

	for (var i = 0; i < json.length; ++i) {
		for (var func in json[i]) {
			var ret = getMobileApiResult(json[i][func]);
			switch (func) {
				case 'getBalance':
					getParam(ret.balance, result, 'balance', null, null, parseBalance);
					getParam(ret.exp_date, result, 'till', null, g_replace_date, parseDate);
					break;
				case 'getBonuses':
					processBonuses(ret, result);
					break;
				case 'showProfile':
					if (ret.account)
						getParam(ret.account, result, 'personal_account');
					if (ret.ratePlan)
						getParam(ret.ratePlan.uk_ua || ret.ratePlan.ru_ru || ret.ratePlan.en_us, result, '__tariff');
					break;
			}
		}
	}

	setCountersToNull(result);
	AnyBalance.setResult(result);
}

function processBonuses(bonuses, result) {
	for (var name in bonuses) {
		if (isArray(bonuses[name])) {
			for (var i = 0; i < bonuses[name].length; ++i) {
				processBonus(bonuses[name][i], name, result);
			}
		} else {
			processBonus(bonuses[name], name, result);
		}
	}
}

function processBonus(bonus, name, result) {
	if (isArray(bonus)) {
		if (/От Домашнего Интернета/i.test(bonus[0])) {
			getParam(bonus[1], result, 'home_internet', null, null, parseBalance);
			getParam(bonus[2], result, 'home_internet_till', null, g_replace_date, parseDate);
		} else if (/Экстра деньги|Бонусные средства|Остаток бонусов/i.test(bonus[0])) {
			sumParam(bonus[1], result, 'bonus_money', null, null, parseBalance, aggregate_sum);
			sumParam(bonus[2], result, 'bonus_money_till', null, g_replace_date, parseDate, aggregate_min);
		} else if (/Остаток бонусов/i.test(bonus[0])) {
			getParam(bonus[1], result, 'bonus_left', null, null, parseBalance);
		} else if (/SMS|смс|Остаток сообщений/i.test(bonus[0])) {
			sumParam(bonus[1], result, 'sms', null, null, parseBalance, aggregate_sum);
		} else if (/MMS|ммс/i.test(bonus[0])) {
			sumParam(bonus[1], result, 'mms', null, null, parseBalance, aggregate_sum);
		} else if (/sms/i.test(name)) {
			AnyBalance.trace('Неизвестные sms ' + name + ', относим к sms: ' + JSON.stringify(bonus));
			sumParam(bonus[1], result, 'sms', null, null, parseBalance, aggregate_sum);
		} else if (/TIME/i.test(name) && /на Киевстар|В сети Киевстар/i.test(bonus[0])) {
			sumParam(bonus[1], result, 'bonus_mins_1', null, null, parseMinutes, aggregate_sum);
			sumParam(bonus[2], result, 'bonus_mins_1_till', null, g_replace_date, parseDate, aggregate_min);
		} else if (/TIME/i.test(name)) {
			if (!/В пределах Укр|по Украине|на другие сети/i.test(bonus[0]))
				AnyBalance.trace('Неизвестные минуты ' + name + ', относим к минутам на все сети: ' + JSON.stringify(bonus));
			sumParam(bonus[1], result, 'bonus_mins_2', null, null, parseMinutes, aggregate_sum);
			sumParam(bonus[2], result, 'bonus_mins_2_till', null, g_replace_date, parseDate, aggregate_min);
		} else if (/INET/i.test(name)) {
			sumParam(bonus[1] + bonus[3], result, 'internet', null, null, parseTraffic, aggregate_sum);
		} else {
			AnyBalance.trace('Неизвестный бонус ' + name + ': ' + JSON.stringify(bonus));
		}
	} else {
		AnyBalance.trace('Пропускаем суммарный бонус ' + name + ': ' + bonus);
	}
}
