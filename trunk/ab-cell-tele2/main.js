/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите логин - номера телефона из 10 цифр!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var baseurl = "https://my.tele2.ru/";
	var baseurlLogin = 'https://login.tele2.ru/ssotele2/';
	
	AnyBalance.setDefaultCharset('utf-8');
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurlLogin + 'wap/auth/submitLoginAndPassword', {
		pNumber: prefs.login,
		password: prefs.password,
	}, g_headers);
	
	if (!/profile\/logout/i.test(html)) {
		var error = sumParam(html, null, null, /class="error"[^>]*>([\s\S]*?)</gi, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		if (error)
			throw new AnyBalance.Error(error, null, /не найден|Неверный пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'home', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, "userName", /"wide-header"[\s\S]*?([^<>]*)<\/h1>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Тариф<\/h2>[\s\S]*?>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
	var matches = html.match(/(csrf[^:]*):\s*'([^']*)'/i);
	if (!matches)
		throw new AnyBalance.Error("Не удаётся найти код безопасности для запроса балансов. Свяжитесь с автором провайдера для исправления.");
		
	var tokName = matches[1], tokVal = matches[2];
	
	if (AnyBalance.isAvailable('balance')) {
		AnyBalance.trace("Searching for balance");
		var params = {};
		params[tokName] = tokVal;
		params.isBalanceRefresh = false;
		html = AnyBalance.requestPost(baseurl + "balance/json", params);
		json = JSON.parse(html);
		result.balance = parseBalance(json.balance);
	}
	if (AnyBalance.isAvailable('sms_used', 'min_used', 'traffic_used')) {
		AnyBalance.trace("Searching for used resources in this month");
		var params = {};
		params[tokName] = tokVal;
		params.isBalanceRefresh = false;
		html = AnyBalance.requestPost(baseurl + "payments/summary/json", params);
		json = JSON.parse(html);
		for (var i = 0; i < json.length; ++i) {
			var name = json[i].name;
			var matches;
			if (AnyBalance.isAvailable('min_used')) {
				if (matches = /(\d+).*минут/i.exec(name)) {
					result.min_used = parseInt(matches[1]);
				}
			}
			if (AnyBalance.isAvailable('sms_used')) {
				if (matches = /(\d+).*SMS/i.exec(name)) {
					result.sms_used = parseInt(matches[1]);
				}
			}
			if (AnyBalance.isAvailable('traffic_used')) {
				matches = /GPRS.*?([\d\.\,]+)\s*(Гб|Мб|Кб)/i.exec(name);
				if (!matches) matches = /([\d\.\,]+)\s*(Гб|Мб|Кб).*GPRS/i.exec(name);
				if (matches) {
					var val = parseFloat(matches[1].replace(/^[\s,\.]*|[\s,\.]*$/g, '').replace(',', '.'));
					switch (matches[2]) {
					case 'Гб':
						val *= 1000;
						break;
					case 'Мб':
						break;
					case 'Кб':
						val /= 1000;
						break;
					}
					result.traffic_used = val;
				}
			}
		}
	}
	if (AnyBalance.isAvailable('history')) {
		AnyBalance.trace("Searching for history");
		html = prefs.testPage || AnyBalance.requestGet(baseurl + "payments/history/last_10");
		
		var table = getParam(html, null, null, /Время платежа([\s\S]*?)<\/table>/i);
		if(table) {
			sumParam(table, result, 'history', /<a[^>]*name="pos(?:[^>]*>){2}((?:[^>]*>){3})/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
			// Отрицательные
			sumParam(table, result, 'history_out', /<a[^>]*name="pos(?:[^>]*>){4}(\s*-\s*[\d,.]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			// Положительные
			sumParam(table, result, 'history_income', /<a[^>]*name="pos(?:[^>]*>){4}\s*([\d,.]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
		} else {
			AnyBalance.trace('Не удалось найти таблицу платежей.');
		}
	}	
	AnyBalance.setResult(result);
}