/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	// 'Cache-Control': 'max-age=0',
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru,en;q=0.8',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.97 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = login();

	if (prefs.cabinet == 'old'){
		doOldCabinet(html);
	}else{
		doNewCabinet(html);
	}
}

function doNewCabinet(html) {
	var countersTable = {
		common: {
			"__forceAvailable": ["payments.sum", "payments.date"],
			"balance": "balance",
			"__tariff": "tariff",
			"min_left": "remainders.min_left",
			"traffic_left": "remainders.traffic_left",
			"sms_left": "remainders.sms_left",
			"mms_left": "remainders.mms_left",
			"min_used": "remainders.min_used",
			"traffic_used": "remainders.traffic_used",
			"sms_used": "remainders.sms_used",
			"mms_used": "remainders.mms_used",
//			"history_income": "payments.sum",
//			"history_out": "payments.sum",
//			"history": "payments.sum",
			"phone": "info.mphone",
			"userName": "info.fio",
		}
	};

	function shouldProcess(counter, info){
		return true;
	}

    var adapter = new NAdapter(countersTable.common, shouldProcess);
	
    adapter.processInfo = adapter.envelope(processInfo);
    adapter.processRemainders = adapter.envelope(processRemainders);
    adapter.processPayments = adapter.envelope(processPayments);
    adapter.processBalance = adapter.envelope(processBalance);

	var result = {success: true};
    adapter.processInfo(html, result);
    adapter.processBalance(html, result);
    adapter.processRemainders(html, result);
    adapter.processPayments(html, result);

    var newresult = adapter.convert(result);
	
	if(result.payments) {
		for (var i = 0; i < result.payments.length; ++i) {
			var p = result.payments[i];

			sumParam(fmtDate(new Date(p.date), '.') + ' ' + p.sum, newresult, 'history', null, null, null, aggregate_join);
			if (/^-/.test(p.sum)) {
				sumParam(p.sum, newresult, 'history_out', null, null, null, aggregate_sum);
			} else {
				sumParam(p.sum, newresult, 'history_income', null, null, null, aggregate_sum);
			}
		}
	}
    
    AnyBalance.setResult(newresult);
};

function doOldCabinet(html) {
	var baseurl = 'https://old.my.tele2.ru/';

	AnyBalance.trace('Входим в старый кабинет');
	html = reenterOld();
	
	if (AnyBalance.getLastStatusCode() > 400) {
		var error = getElement(html, /<div[^>]+error[^>]*>/i, replaceTagsAndSpaces);
		if (error) 
			throw new AnyBalance.Error('Старый кабинет: ' + error);
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Старый личный кабинет Теле2 временно недоступен. Попробуйте позже.');
	}
	
	var result = {success: true};
	
	getParam(html, result, "userName", /"wide-header"[\s\S]*?([^<>]*)<\/h1>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Тариф<\/h2>[\s\S]*?>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, "phone", /"top-profile-subscriber-phone"[^>]*>([^<>]*)<\//i, replaceTagsAndSpaces, html_entity_decode);
	var matches = html.match(/(csrf[^:]*):\s*'([^']*)'/i);
	if (!matches) {
		var error = getParam(html, null, null, /<div[^>]+(?:error-wrapper|popup-message-wrapper)[^>]*>([\s\S]*?)<\/?div/i, replaceTagsAndSpaces, html_entity_decode);
		if (error) throw new AnyBalance.Error(error);
		var error = getElement(html, /<div[^>]+popup-message\s+(?:error|info)[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error) throw new AnyBalance.Error(error);
		AnyBalance.trace(html);
		throw new AnyBalance.Error("Не удаётся найти код безопасности для запроса балансов. Свяжитесь с автором провайдера для исправления.");
	}
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
	if (AnyBalance.isAvailable('sms_used', 'min_used', 'traffic_used', 'mms_used')) {
		AnyBalance.trace("Searching for used resources in this month");
		var params = {};
		params[tokName] = tokVal;
		params.isBalanceRefresh = false;
		html = AnyBalance.requestPost(baseurl + "payments/summary/json", params);
		json = JSON.parse(html);
		if (isArray(json)) {
			for (var i = 0; i < json.length; ++i) {
				getCounter(result, json[i]);
			}
		} else {
			AnyBalance.trace('Tele2 не отдал использованные ресурсы: ' + JSON.stringify(json));
		}
	}
	if (AnyBalance.isAvailable('history')) {
		AnyBalance.trace("Searching for history");
		html = AnyBalance.getPreferences().testPage || AnyBalance.requestGet(baseurl + "payments/history/last_10");
		var table = getParam(html, null, null, /Время платежа([\s\S]*?)<\/table>/i);
		if (table) {
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

function getCounter(result, json) {
	if (json.subTotals) {
		for (var j = 0; j < json.subTotals.length; ++j) {
			getCounter(result, json.subTotals[j]);
		}
	} else {
		var name = json.name || '';
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
		if (AnyBalance.isAvailable('mms_used')) {
			if (matches = /(\d+).*MMS/i.exec(name)) {
				result.mms_used = parseInt(matches[1]);
			}
		}
		if (AnyBalance.isAvailable('traffic_used')) {
			matches = /GPRS.*?([\d\.\,]+)\s*(Гб|Мб|Кб)/i.exec(name);
			if (!matches) matches = /([\d\.\,]+)\s*(Гб|Мб|Кб).*GPRS/i.exec(name.replace(/\s+/g, ''));
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