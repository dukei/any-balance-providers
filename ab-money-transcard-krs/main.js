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
	var baseurl = 'http://www.krasinform.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.CardNumber, 'Введите номер карты!');

	var html = AnyBalance.requestGet(baseurl + 'card/transport/', g_headers);

	var token = getParam(html, null, null, /name="csrf_token"[^>]*value="([^"]*)/i, null, html_entity_decode);
	if (!token)
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

	html = AnyBalance.requestPost(baseurl + 'card/transport/', {
		'csrf_token': token,
		card_num: prefs.CardNumber,
	}, addHeaders({Referer: baseurl + 'card/transport/'}));

	if (!/<h2>\s*Информация по транспортной карте\s*<\/h2>/i.test(html)) {
		var error = getParam(html, null, null, /"alert alert-error"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось получить информацию по карте № '+prefs.CardNumber);
	}
	var result = {success: true};
	
	getParam(html, result, 'KolvoEdinits', /Количество транспортных единиц:[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'LastDate', /<h3>\s*Платежи(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'LastSum', /<h3>\s*Платежи(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}