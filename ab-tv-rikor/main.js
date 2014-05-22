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
	var baseurl = 'http://www.itvt.ricor.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер договора!');
	var match = /^(\d{11})(\d)$/i.exec(prefs.password);
	checkEmpty(match, 'Введите номер карты доступа, 12 цифр подряд!');
	
	var html = AnyBalance.requestGet(baseurl + 'rikortv/lkslogon0.aspx', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'rikortv/lkslogon0.aspx', {
		hlog: prefs.login,
		hpass: match[1],
		hpass2: match[2],
	}, addHeaders({Referer: baseurl + 'rikortv/lkslogon0.aspx'}));
	
	if (!/"status":"success"/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'rikortv/lks1.aspx', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Остаток на \d+\.\d+\.\d{4}(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /Абонент(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Подписка(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}