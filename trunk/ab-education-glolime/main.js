/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru,en;q=0.8',
	'Connection': 'keep-alive',
	'Origin':'https://school.glolime.ru',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://school.glolime.ru/';
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login/', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'login/', {
		login:prefs.login,
		password:prefs.password
	}, addHeaders({Referer: baseurl}));
	
	if (!/login\/exit/i.test(html)) {
		var error = getParam(html, null, null, /<html>\s*<head>\s*<\/head>\s*<body>([^<]{10,50})/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Login failed/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'parents/', g_headers);
	
	var table = getParam(html, null, null, /Ваши счета:([\s\S]*?)<\/table>/i);
	if(!table)
		throw new AnyBalance.Error('Неудалось найти информацию по счетам, сайт изменен?');
	
	var result = {success: true};
	
	sumParam(table, result, 'balance', /<tr>\s*<td>([^>]*>){3}/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	getParam(table, result, 'hot', /Горячее питание([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'cafe', /Буфет([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}