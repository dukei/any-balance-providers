/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Провайдер NCC (Республика Татарстан, Нижегородский филиал)
Сайт оператора: http://ncc-volga.ru/
Личный кабинет: https://iserve.ncc-volga.ru/
**/

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://login.rt.ru/';
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
		j_username: prefs.userv,
		j_password: prefs.passv,
		_redirectToUrl: '',
		is_ajax: true,
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
	
	getParam(html, result, "userName", /<div[^>]+id="top-profile-subscriber-name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, "phone", /<div[^>]+id="top-profile-subscriber-phone"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
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

	if (AnyBalance.isAvailable('accum_sms', 'accum_mins', 'accum_trafic')) {
		AnyBalance.trace("Searching for used resources in this month");
		var params = {};
		params[tokName] = tokVal;
		params.isBalanceRefresh = false;
		html = AnyBalance.requestPost(baseurl + "payments/summary/json", params);
		json = JSON.parse(html);
		getUsedResources(result, json);
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

function getUsedResources(result, json){
	var subTotals, name;
	for(var i = 0; i < json.length; ++i){
		subTotals = json[i].subTotals;
		name = json[i].name;
		if(subTotals && isArray(subTotals))
			getUsedResources(result, subTotals);

		sumParam(name, result, 'accum_mins', /(\d+).*минут/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
		sumParam(name, result, 'accum_sms', /(\d+).*SMS/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
		sumParam(name, result, 'accum_mms', /(\d+).*MMS/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
		sumParam(name, result, 'accum_trafic', /GPRS.*?([\d\.\,]+)\s*(Гб|Мб|Кб)/i, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
		sumParam(name, result, 'accum_trafic', /([\d\.\,]+\s*(?:Гб|Мб|Кб)).*GPRS/i, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
	}
}

function mainOld(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://login.rt.ru/';
	AnyBalance.setDefaultCharset('koi8-r');
	// Заходим на главную страницу
	var info = AnyBalance.requestPost(baseurl ,{
		path:'iserv',
		userv:prefs.userv,
		passv:prefs.passv
	});
	// Проверяем успешный ли вход
	if(!/path=exit/i.test(info)){
		var error = getParam(info, null, null, /<div class="tech">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	        if(error)
        		throw new AnyBalance.Error(error);
		error = getParam(info, null, null, /<div[^>]*class="info_block_right"[^>]*>[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	        if(error)
        		throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	getParam(info, result, 'balance', /<dd[^>]*>Баланс:<\/dd>\s*<dd[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'bonus', /<dd[^>]*>Бонус:<\/dd>\s*<dd[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'filial', /<dd[^>]*>Филиал:<\/dd>\s*<dd[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'phone', /<dd[^>]*>Номер:<\/dd>\s*<dd[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	// Теперь аккумуляторы
	if(isAvailable(['accum_trafic', 'accum_mins', 'accum_sms', 'accum_rub'])) {
		AnyBalance.trace('Requesting accumulators info...');
		info = AnyBalance.requestGet(baseurl + '?path=services');
		
		var table = getParam(info, null, null, /Аккумуляторы[\s\S]*?(<table[\s\S]*?<\/table>)/i, null, html_entity_decode);
		if(table){
			// Получаем все ряды из таблицы, там и смс и интернет..
			var Rows = sumParam(table, null, null, /(<tr>\s*<td[^>]*[\s\S]*?\/tr>)/ig, null, html_entity_decode, null);
			for (i = 0; i < Rows.length; i++){
				var row = Rows[i];
				// Это трафик не знаю надо ли его суммировать? пока не будем, если попросят потом сделаем
				if(/мб/i.test(row))
					getParam(row, result, 'accum_trafic', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, null, parseTraffic);
				else if(/мин/i.test(row))
					getParam(row, result, 'accum_mins', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, null, parseBalance);
				else if(/смс|sms/i.test(row))
					getParam(row, result, 'accum_sms', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, null, parseBalance);
				else if(/руб/i.test(row))
					getParam(row, result, 'accum_rub', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, null, parseBalance);
			}
		}
		else
			AnyBalance.trace('Не удалось найти таблицу с аккумуляторами. Сайт изменен?');
	}
	info = AnyBalance.requestGet(baseurl + '?path=allbills');
	getParam(info, result, '__tariff', /Тарифный план(?:[\s\S]*?<td[^>]*>){3}\s*([\s\S]*?)\s*<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'acc_num', /Тарифный план(?:[\s\S]*?<td[^>]*>){1}\s*([\s\S]*?)\s*<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

	if(isAvailable('trafic')){
		AnyBalance.trace('Fetching trafic info...');
		var table = getParam(info, null, null, /Трафик за текущий месяц[\s\S]*?(<table[\s\S]*?<\/table>)/i, null, html_entity_decode);
		if(table){
			// Получаем все ряды из таблицы, там и смс  и ммс и интернет..
			var trafRows = sumParam(table, null, null, /(<tr>\s*<td[^>]*class="normal"[\s\S]*?<\/tr>)/ig, null, html_entity_decode, null);
			for (i = 0; i < trafRows.length; i++){
				var row = trafRows[i];
				// Это трафик
				if(/кбайт/i.test(row))
					sumParam(row, result, 'trafic', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig, null, parseTraffic, aggregate_sum);
			}
		}
		else
			AnyBalance.trace('Не удалось найти таблицу с трафиком. Сайт изменен?');
	}
	AnyBalance.setResult(result);
};