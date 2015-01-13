/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1',
	Connection: 'keep-alive'
};

function main() {
	var prefs = AnyBalance.getPreferences();

	checkEmpty(prefs.login, 'Введите номер вашего телефона для входа в Мой Киевстар (в формате +380ХХХХХХХХХ), например +380971234567');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	AnyBalance.setOptions({
		SSL_ENABLED_PROTOCOLS: ['TLSv1'], // https://my.kyivstar.ua очень смущается от присутствия TLSv1.1 и TLSv1.2
	}); 

	var baseurl = "https://my.kyivstar.ua/";
	AnyBalance.trace('Соединение с ' + baseurl);
	var html = AnyBalance.requestGet(baseurl + 'tbmb/login/show.do', g_headers);
	
	// Проверим, нужна ли капча?
	var captchaa = AnyBalance.requestPost(baseurl + "tbmb/checkUser", {
		action:'isCaptchaNeeded',
		user:prefs.login
	}, g_headers);
	
	if(captchaa == true) {
		AnyBalance.trace('Необходимо ввести капчу..');
		
		if(AnyBalance.getLevel() >= 7){
			AnyBalance.trace('Пытаемся ввести капчу');
			var p = getParam(html, null, null, /src="\/(tbmb\/jcaptcha[^"]+)/i);
			
			var captcha = AnyBalance.requestGet(baseurl + p);
			captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
			AnyBalance.trace('Капча получена: ' + captchaa);
		}else{
			throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
		}
	}
	
	//заготовка для обработки ошибок сайта, надо будет проверить во время следующего сбоя
	if (/<TITLE>error<\/TITLE>/i.test(html)) {
		var matches = html.match(/(<H1>[\s\S]*?<\/p>)/i);
		if (matches) {
			throw new AnyBalance.Error(matches[1].replace(/<\/?[^>]+>/g, ''));
		}
		throw new AnyBalance.Error("Неизвестная ошибка на сайте.");
	}
	
	AnyBalance.trace('Успешное соединение.');
	if (/\/tbmb\/logout\/perform/i.test(html)) {
		AnyBalance.trace('Уже в системе.');
		if (!~html.indexOf(prefs.login)) {
			AnyBalance.trace('Не тот аккаунт, выход.');
			html = AnyBalance.requestGet(baseurl + 'tbmb/logout/perform.do', g_headers);
			AnyBalance.trace('Переход на страницу входа.');
			html = AnyBalance.requestGet(baseurl + 'tbmb/login/show.do', g_headers);
		}
	}
	// Login
	var form = getParam(html, null, null, /<form[^>]+action="[^"]*perform.do"[^>]*>([\s\S]*?)<\/form>/i);
	if (form) {
		AnyBalance.trace('Вход в систему.');
		var params = createFormParams(form);
		params.user = prefs.login;
		params.password = prefs.password;
		
		if(captchaa)
			params.captcha = captchaa;
		
		html = AnyBalance.requestPost(baseurl + "tbmb/login/perform.do", params, g_headers);
		
		if (!/\/tbmb\/logout\/perform/i.test(html)) {
			var error = getParam(html, null, null, /<td class="redError"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
			if (error)
				throw new AnyBalance.Error(error, null, /Перевірте правильність введення логіну|введіть правильний пароль/i.test(error));
			
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в систему. Сайт изменен?');
		}
	}
	
	/**
	if (!/payment\/activity\//i.test(html)) {
		//Не нашли ссылку на платежи. Очень вероятно, что это корпоративный аккаунт
		throw new AnyBalance.Error("Похоже, у вас корпоративный аккаунт. Пожалуйста, воспользуйтесь провайдером Киевстар для корпоративных тарифов");
	}
	*/
	
	if (!~html.indexOf(prefs.login)) {
		throw new AnyBalance.Error("Ошибка. Информация о номере не найдена. Если у вас корпоративный аккаунт, воспользуйтесь провайдером Киевстар для корпоративных тарифов.");
	}
	AnyBalance.trace('Успешный вход.');
	var result = {success: true};
	//Тарифный план
	getParam(html, result, '__tariff', /(?:Тарифний план:|Тарифный план:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	// Баланс
	getParam(html, result, 'balance', /(?:Залишок на рахунку:|Остаток на счету:|Поточний баланс:|Текущий баланс:)[\s\S]*?<b>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	//Бонусные минуты (1) на номера внутри сети
	sumParam(html, result, 'bonus_mins_1', /(?:Кількість хвилин для дзвінків|Количество минут для звонков)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_1', /(?:Хвилини всередині мережі ["«»]?Ки.встар["«»]?:|Минуты внутри сети ["«»]?Ки.встар["«»]?:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_1', /(?:Єдина абонентська група:|Единая абонентская группа:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_1', /(?:Залишок хвилин для дзвінків на Ки.встар:|Остаток минут для звонков на Ки.встар:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_1', /(?:Залишок хвилин для дзвінків абонентам Ки.встар та Beeline|Остаток минут для звонков абонентам Ки.встар и Beeline)\s*:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_1', /(?:Залишок:|Остаток минут на сеть Киевстар:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);   //обратить внимание на "Залишок:", может измениться
	sumParam(html, result, 'bonus_mins_1', /(?:Залишок хвилин на день:|Остаток минут на день:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);   //обратить внимание на "Залишок:", может измениться
	//Срок действия бонусных минут (1)
	sumParam(html, result, 'bonus_mins_1_till', /(?:Залишок хвилин для дзвінків на Ки.встар:|Остаток минут для звонков на Ки.встар:)[\s\S]*?<td[^>]*>[\s\S]*?<\/td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate, aggregate_sum);
	//Бонусные минуты (2) на любые номера
	sumParam(html, result, 'bonus_mins_2', /(?:Залишок хвилин для дзвінків абонентам Ки.встар та DJUICE:|Остаток минут для звонков абонентам Ки.встар и DJUICE:)[\s\S]*?<b>([^<]*)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2', /(?:Залишок Хвилини на КС 500 хв:|Остаток Минуты на КС 500 мин:)[\s\S]*?<b>([^<]*)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2', /(?:Залишок тарифних хвилин для дзвінків в межах України:|Остаток тарифних минут для звонков в пределах Украин[иы]\s*:)[\s\S]*?<b>([^<]*)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2', /(?:Залишок хвилин для дзвінків в межах України:|Остаток минут для звонков в пределах Украин[иы]\s*:)[\s\S]*?<b>([^<]*)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2', /(?:Залишок хвилин для дзвінків по Україні:|Остаток минут для звонков по Украине:)[\s\S]*?<b>([^<]*)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2', /(?:Залишок хвилин для дзвінків на інших операторів та номери фіксованого зв"язку|Остаток минут для звонков на других операторов)(?:[^>]*>){3}(.*)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2', /(?:Залишок хвилин|Остаток минут):(?:[^>]*>){3}(.*)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2', /(?:Залишок хвилин на інші мобільні мережі в межах України|Остаток минут на другие мобильные сети в пределах Украины):(?:[^>]*>){3}(.*)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2', /(?:Залишок хвилин на інші мережі по Україні:|Остаток минут на другие сети по Украине:)[\s\S]*?<b>([^<]*)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2', /(?:Залишок хвилин для дзвінків на інші мережі|Остаток минут для звонков на другие сети)[\s\S]*?<b>([^<]*)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	//Срок действия бонусных минут (2)
	sumParam(html, result, 'bonus_mins_2_till', /(?:Залишок хвилин на інші мобільні мережі в межах України:|Остаток минут на другие мобильные сети в пределах Украины:)[\s\S]*?<td[^>]*>[\s\S]*?<\/td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2_till', /(?:Залишок хвилин на інші мережі по Україні:|Остаток минут на другие сети по Украине:)[\s\S]*?<td[^>]*>[\s\S]*?<\/td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2_till', /(?:Залишок хвилин для дзвінків на інші мережі|Остаток минут для звонков на другие сети)[\s\S]*?<td[^>]*>[\s\S]*?<\/td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate, aggregate_sum);
	//Тарифные минуты:
	sumParam(html, result, 'mins_tariff', /(?:Тарифні хвилини:|Тарифные минуты:)[\s\S]*?<b>([^<]*)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	//Доплата за входящие:
	sumParam(html, result, 'inc_pay', /(?:Доплата за входящие звонки:|Доплата за входящие звонки:)[\s\S]*?<b>([^<]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//MMS
	sumParam(html, result, 'mms', />(?:Бонусні MMS:|Бонусные MMS:)[\s\S]*?<b>(.*?)</, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'mms', />MMS:[\s\S]*?<b>(.*?)</, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//SMS
	sumParam(html, result, 'sms', />(?:Бонусні SMS:|Бонусные SMS:)[\s\S]*?<b>(.*?)</, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'sms', />SMS:[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'sms', /(?:Остаток текстових сообщений для отправки абонентам Киевстар и Beeline|Залишок текстових повідомлень для відправки абонентам Київстар та Beeline):[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'sms', />(?:СМС за умовами ТП:|СМС по условиям ТП:)[\s\S]*?<b>(.*?)</, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'sms', />(?:Залишок смс|Остаток смс):[\s\S]*?<b>(.*?)</i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'sms', />(?:Домашній регіон. Залишок СМС по Україні|Домашний регион. Остаток СМС по Украине):[\s\S]*?<b>(.*?)</i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'sms', />(?:Залишок SMS по Україні|Остаток SMS по Украине):[\s\S]*?<b>(.*?)</i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'sms', />(?:Остаток сообщений|Остаток сообщений):[\s\S]*?<b>(.*?)</i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'sms', />(?:Залишок SMS на день|Остаток SMS на день):[\s\S]*?<b>(.*?)</i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//Бонусные средства 
	sumParam(html, result, 'bonus_money', /(?:Бонусні кошти:|Бонусные средства:)[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'bonus_money', /(?:Бонуси за умовами тарифного плану ["«»]Єдина ціна["«»]:|Бонусы по условиям тарифного плана ["«»]Единая цена["«»]:)[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'bonus_money', /(?:Кошти по послузі ["«»]Екстра кошти["«»]|Средства по услуге ["«»]Экстра деньги["«»]):[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'bonus_money_till', /(?:Бонусні кошти:|Бонусные средства:)(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
	sumParam(html, result, 'bonus_money_till', /(?:Бонуси за умовами тарифного плану ["«»]Єдина ціна["«»]:|Бонусы по условиям тарифного плана ["«»]Единая цена["«»]:)(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
	sumParam(html, result, 'bonus_money_till', /(?:Кошти по послузі ["«»]Екстра кошти["«»]|Средства по услуге ["«»]Экстра деньги["«»]):(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
	//Остаток бонусов
	sumParam(html, result, 'bonus_left', /(?:Залишок бонусів:|Остаток бонусов:)[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'bonus_left', /(?:Залишок бонусів:|Остаток бонусов:)[\s\S]*?(?:Залишок бонусів:|Остаток бонусов:)[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'bonus_left', /(?:Акція «Бонус \+»:|Акция «Бонус \+»:)[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'bonus_money_till', /(?:Залишок бонусів:|Остаток бонусов:)(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
	sumParam(html, result, 'bonus_money_till', /(?:Залишок бонусів:|Остаток бонусов:)[\s\S]*?(?:Залишок бонусів:|Остаток бонусов:)(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
	sumParam(html, result, 'bonus_money_till', /(?:Акція «Бонус \+»:|Акция «Бонус \+»:)(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
	//Интернет
	sumParam(html, result, 'internet', /(?:Залишок бонусного об\'єму даних:|Остаток бонусного объема данных:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
	sumParam(html, result, 'internet', /(?:Залишок байт для користування послугою Інтернет GPRS\s*:|Остаток байт для пользования услугой Интернет GPRS\s*:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
	sumParam(html, result, 'internet', /(?:Остаток GPRS Internet\s*:|Залишок GPRS Internet\s*:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
	sumParam(html, result, 'internet', /(?:Остаток Мб для пользования услугой Интернет GPRS\s*:|Залишок Мб для користування послугою Інтернет GPRS\s*:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
	sumParam(html, result, 'internet', /(?:Мб для Мобильного Интернета|Мб для Мобільного Інтернету)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
	sumParam(html, result, 'internet', /(?:Залишок байт на день:|Остаток байт на день:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, function(str) {return parseTraffic(str, 'b')}, aggregate_sum);
	//Домашний Интернет
	sumParam(html, result, 'home_internet', /(?:Від послуги[^<]*Домашній Інтернет|От услуги[^<]*Домашний Интернет|Бонусні кошти послуги[^<]*Домашній Інтернет|Бонусные средства услуги[^<]*Домашний Интернет|Від Домашнього Інтернету|От Домашнего Интернета)[^<]*:(?:[^>]*>){3}([\s\S]*?)грн/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	getParam(html, result, 'home_internet_date', /(?:Від послуги[^<]*Домашній Інтернет|От услуги[^<]*Домашний Интернет|Бонусні кошти послуги[^<]*Домашній Інтернет|Бонусные средства услуги[^<]*Домашний Интернет)[^<]*:(?:[^>]*>){8}\s*<nobr>([^<]*)/i, replaceTagsAndSpaces, parseDate);
	//Порог отключения
	sumParam(html, result, 'limit', /(?:Поріг відключення:|Порог отключения:)[\s\S]*?<b>([^<]*)/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//Срок действия номера
	sumParam(html, result, 'till', /(?:Номер діє до:|Номер действует до:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate, aggregate_sum);
	//Номер телефона
	getParam(html, result, 'phone', /(?:Номер|Номер):[\s\S]*?<td[^>]*>([\s\S]*?)(?:\(|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
	//Лицевой счет
	getParam(html, result, 'personal_account', /(?:Особовий рахунок|Лицевой счет):[\s\S]*?<td[^>]*>([\s\S]*?)(?:\(|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
	//Срок действия услуги Комфортный переход
	if (AnyBalance.isAvailable('comfort_till')) {
		html = AnyBalance.requestGet(baseurl + "tbmb/tsm/overview.do", g_headers);
		if (/show.do\?featureId=99&amp;in=1/i.test(html)) {
			html = AnyBalance.requestGet(baseurl + "tbmb/tsm/complexFeature/show.do?featureId=99&in=1", g_headers);
			sumParam(html, result, 'comfort_till', /(?:Послуга буде автоматично відключена&nbsp;|Услуга будет автоматически отключена&nbsp;)([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
		}
	}
	//Пакет SMS
	if (AnyBalance.isAvailable('sms_packet', 'sms_packet_till', 'sms_packet_left')) {
		html = AnyBalance.requestGet(baseurl + "tbmb/tsm/overview.do", g_headers);
		if (/show.do\?featureId=349&amp;in=1/i.test(html)) {
			html = AnyBalance.requestGet(baseurl + "tbmb/tsm/complexFeature/show.do?featureId=349&in=1", g_headers);
			getParam(html, result, 'sms_packet', /<nobr>(?:Пакет: |Пакет: )<strong> ([\s\S]*?) <\/strong>/i, replaceTagsAndSpaces);
			sumParam(html, result, 'sms_packet_till', /<nobr>(?:Срок действия:|Строк дії:) <strong> ([\s\S]*?)<\/strong>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
			sumParam(html, result, 'sms_packet_left', /<nobr>(?:Остаток:|Залишок:) <strong> ([\s\S]*?)sms/ig, replaceTagsAndSpaces, parseInt, aggregate_sum);
		}
	}
	AnyBalance.setResult(result);
}