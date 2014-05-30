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
	var baseurl = 'http://ladypink.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер карты!');
	
	var html = AnyBalance.requestGet(baseurl + 'check-savings', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'check-savings/?submit', {
		card: prefs.login,
		card2: prefs.login,
		'ds.x':72,
		'ds.y':9,
		'ds':'a'
	}, addHeaders({Referer: baseurl + 'check-savings'}));
	
	if (!/Ваша карта №/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить данные по карте'+prefs.login+'. Сайт изменен?');
	}
	
	var text = getParam(html, null, null, /<div class="whith_detail_account">\s*<[^>]*class="first"[^>]*>((?:[\s\S]*?<\/p>){3})/i, replaceTagsAndSpaces);
	checkEmpty(text, 'Не удалось найти данные по карте, сайт изменен?', true);
	AnyBalance.trace(text);
	
	var result = {success: true};
	
	getParam(text, result, 'balance', /покупки на сумму([^<]+)коп/i, [replaceTagsAndSpaces, /руб/i, ''], parseBalance);
	getParam(text, result, 'discount', /составляет([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(text, result, 'text');
	
	AnyBalance.setResult(result);
}