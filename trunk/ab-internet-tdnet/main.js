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
	var baseurl = 'http://report.td-net.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	var action = getParam(html, null, null, /name=["']LoginForm["'][^>]*action=["']([^"']*)/i, null, html_entity_decode);
	if (!action)
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	
	html = AnyBalance.requestPost(baseurl + action, {
		CardNum: prefs.login,
		Pwd: prefs.password,
		login_submit: 'OK'
	}, addHeaders({Referer: baseurl}));
	
	if (!/>Другой\s*логин</i.test(html)) {
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	getParam(html, result, 'fio', /Клиент:(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Баланс:(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
	var href = getParam(html, null, null, /<a[^>]*href="\/([^"]*)[^>]*>Балансовые счета/i);
	if(!href)
		throw new AnyBalance.Error('Не удалось найти ссылку на счета, сайт изменен?');
	
	html = AnyBalance.requestGet(baseurl + href, g_headers);
	
	getParam(html, result, 'dogovor1', /<H1>Балансовые счета<\/H1>(?:[\s\S]*?<td[^>]*>)([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance1', /<H1>Балансовые счета<\/H1>(?:[\s\S]*?<td[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
	getParam(html, result, 'dogovor2', /<H1>Балансовые счета<\/H1>(?:[\s\S]*?<td[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance2', /<H1>Балансовые счета<\/H1>(?:[\s\S]*?<td[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}