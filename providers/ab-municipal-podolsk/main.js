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
	var baseurl = 'http://irc-zhkh-podolsk.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'dologin.php', {
		login: prefs.login,
		password: prefs.password,
	}, addHeaders({Referer: baseurl}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + '?mode=private&page=counters', g_headers);

	var countersHTML = getParam(html, null, null, new RegExp('Адрес:[^<]+<\\/h2>\\s*<h3>Лицевой счёт:\\s*' + (prefs.num || '') + '[^]+?(?:<h2>|class=calcholder)', 'i'));
	var counters = sumParam(countersHTML, null, null, /<table[^>]+class=list[^>]*>[^]*?<\/table>/ig);

	var result = {success: true};

	getParam(countersHTML, result, 'address', /Адрес:([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);

	for(var i = 0, toi = counters.length; i < toi; i++){
		getParam(counters[i], result, 'tariff' + i, /Тариф(?:[^>]*>){23}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(counters[i], result, 'date' + i, /Дата предыдущего показания(?:[^>]*>){23}([^<]+)/i, replaceTagsAndSpaces, parseDate);
		getParam(counters[i], result, 'value' + i, /Предыдущее показание(?:[^>]*>){24}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	}
	
	AnyBalance.setResult(result);
}