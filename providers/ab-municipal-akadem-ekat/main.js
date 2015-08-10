 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36',
};

function aggregateCounters(rows){
	var res = [];
	for(var i = 1, toi = rows.length; i < toi; i++){
		var parts = sumParam(rows[i], null, null, /<td[^>]*>\s*([\s\S]+?)\s*<\/td>/ig, replaceTagsAndSpaces, html_entity_decode);
		res.push(parts[0] + '(' + parts[1] + '): ' + parts[2]);
	};
	return res.join('<br />');
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://uk-akadem.ru/';
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'users/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'users/?action=user/login', {
		'Ut5User[login]': prefs.login,
		'Ut5User[pass]': prefs.password,
	}, addHeaders({Referer: baseurl + 'users/'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<span[^>]+class="error_message"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Лицевой счет(?:[^>]*>){3}([^>]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'address', /Квартира(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);

	if(isAvailable(['counters', 'account'])){
		var countersHref = getParam(html, null, null, /href="(users\/\?action=realty\/takeReadings&o_id=\d+?)"/i, replaceTagsAndSpaces);
		AnyBalance.trace('Counters href: ' + countersHref);

		if(countersHref){
			html = AnyBalance.requestGet(baseurl + countersHref, g_headers);

			getParam(html, result, 'account', /л\/с:\s?(\d+)/i, replaceTagsAndSpaces, parseBalance);

			var table = getParam(html, null, null, /"takeReadingsForm">[\s\S]*?<table[^>]*>[\s\S]*?<\/table>/i);
			sumParam(table, result, 'counters', /<(?:tr|th)[^>]*>[\s\S]*?<\/(?:tr|th)>/ig, null, null, null, aggregateCounters);
		} else {
			throw new AnyBalance.Error('Не удалось найти адрес страницы со счетчиками. Сайт изменен?');
		}
	}

	AnyBalance.setResult(result);
}