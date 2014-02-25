/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main() {
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите логин - номера телефона из 10 цифр!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var baseurl = "https://my.tele2.ru/";
	
	AnyBalance.setDefaultCharset('utf-8');
	var html = AnyBalance.requestGet(baseurl);
	
	var matches = html.match(/<input[^>]*name="(csrf[^"]*)"[^>]*value="([^"]*)"/i);
	if (!matches) {
		var error = getParam(html, null, null, /<div[^>]+id="error-wrapper"[^>]*>([\s\S]*?)(?:<a |<\/div>)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error) throw new AnyBalance.Error(error);
		throw new AnyBalance.Error("Не удаётся найти код безопасности для входа. Проблемы на сайте или сайт изменен.");
	}
	AnyBalance.trace("Trying to enter selfcare at address: " + baseurl);
	var params = {
		j_username: prefs.login,
		j_password: prefs.password,
		_redirectToUrl: '',
		is_ajax: true
	};
	params[matches[1]] = matches[2]; //Код безопасности
	html = AnyBalance.requestPost(baseurl + "public/security/check", params, {"X-Requested-With": "XMLHttpRequest"});
	
	var error = getParam(html, null, null, /<div id="error-wrapper">[\s\S]*?<p>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
	if (error) throw new AnyBalance.Error(error, null, /Ошибка в номере телефона|Пароль неправильный/i.test(error));
	var json = JSON.parse(html.replace(/[\x0D\x0A]+/g, ' '));
	if (!json.success) throw new AnyBalance.Error(json.error, null, /Ошибка в номере телефона|Пароль неправильный/i.test(json.error));
	var result = {success: true}; //Баланс нельзя не получить, не выдав ошибку!
	if (AnyBalance.isAvailable('balance')) {
		result.balance = null; //Баланс должен быть всегда, даже если его не удаётся получить. 
		//Если его не удалось получить, то передаём null, чтобы значение взялось из предыдущего запроса
	}
	html = AnyBalance.requestGet(baseurl + "home");
	
	getParam(html, result, "userName", /"wide-header"[\s\S]*?([^<>]*)<\/h1>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Тариф<\/h2>[\s\S]*?>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
	var matches = html.match(/(csrf[^:]*):\s*'([^']*)'/i);
	if (!matches) throw new AnyBalance.Error("Не удаётся найти код безопасности для запроса балансов. Свяжитесь с автором провайдера для исправления.");
	var tokName = matches[1],
		tokVal = matches[2];
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