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

//var g_baseurl = 'http://my.xtratv.com.ua/';
var g_baseurl = 'http://devmy.xtratv.com.ua/';

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(g_baseurl + 'ru/login', g_headers);
	
	html = AnyBalance.requestPost(g_baseurl + 'ru/login', {
		login: prefs.login,
		password: prefs.password,
		'redirect_url': ''
	}, addHeaders({Referer: g_baseurl + 'ru/login'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var acc_num = prefs.acc_num || '\\d{4}';
	
	var account = getParam(html, null, null, new RegExp('<p>(?:[^>]*>){3}\\d*' + acc_num + '(?:[^>]*>){30,33}\\s*</p>', 'i'));
	if(!account)
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.acc_num ? 'счет с последними цифрами ' + prefs.acc_num : 'ни одного счета!'));
	
	var href = getParam(account, null, null, /<a\s*href="\/([^"]*state[^"]*)/i);
	if(!href)
		throw new AnyBalance.Error('Не удалось найти ссылку на информацию по счету!');
	
	html = AnyBalance.requestGet(g_baseurl + href, g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'status', />Статус(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', />Баланс(?:[^>]*>){1}([^<]+)/i, [replaceTagsAndSpaces, /([\d]+)\s*грн\s*([\d]+)\s*коп\./i, '$1.$2'], parseBalance);
	getParam(html, result, 'recomend_pay', />Рекомендуемая сумма доплаты(?:[^>]*>){3}([^<]+)/i, [replaceTagsAndSpaces, /([\d]+)\s*грн\s*([\d]+)\s*коп\./i, '$1.$2'], parseBalance);
	getParam(html, result, 'deadline', />Рекомендуемая сумма доплаты(?:[^>]*>){3}[^<]+до ([^<]+)/i, replaceTagsAndSpaces, parseDate);
		
	AnyBalance.setResult(result);
}