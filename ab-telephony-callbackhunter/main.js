/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': '*/*',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://callbackhunter.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + '', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'ajax/loginuser/', {
		email: prefs.login,
		password: prefs.password,
	}, addHeaders({Referer: baseurl + 'ajax/loginuser/', 'X-Requested-With':'XMLHttpRequest'}));
	
	var json = getJson(html);
	
	if (!json.success) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(json.redirect, g_headers);

	// Фильтруем звонки за период c начала 2000 года по настоящее время
	var now = new Date();
	html = AnyBalance.requestPost(baseurl + 'cabinet_new/', {
		export_to_excel: 0,
		export_to_xml: 0,
		after_day: 01,
		after_month: 01,
		after_year: 2000,
		before_day: now.getDate(),
		before_month: now.getMonth() + 1,
		before_year: now.getFullYear(),
		show_deferred: 'N',
		hunter: ''
	}, addHeaders({Referer: baseurl + 'cabinet_new/'}));
	
	// Берем последние 5 звонков
	function getLastCalls(html){
		var count = 5,
			rows = html.match(/<tr[\S\s]*?<\/tr>/g),
			lastCalls = [],
			date,
			cells;

		for (var i = 1; i < rows.length && lastCalls.length < count; i++){
			cells = rows[i].match(/<t[dh][\S\s]*?<\/t[dh]>/g) || [];

			// Строка с датой
			if(cells.length == 1)
				date = replaceAll(cells[0], replaceTagsAndSpaces);
			// Строка со звонком
			else
				lastCalls.push(date + ' в ' + replaceAll(cells[1], replaceTagsAndSpaces) + 
					' с номера ' + replaceAll(cells[2], replaceTagsAndSpaces));
		};

		return html_entity_decode(lastCalls.join('<br>'));
	}

	var result = {success: true};

	getParam(html, result, 'user_id', /Ваш ID:([^)<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'minutes_left', />(\d+) минут осталось/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'last_calls', /<!-- список звонков -->[\s\S]*?<\/table>/i, null, getLastCalls);
	
	AnyBalance.setResult(result);
}