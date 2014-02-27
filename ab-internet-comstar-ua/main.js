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
	var baseurl = 'https://stat.home.mts.com.ua/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login_user.htms', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'login_user.htms', {
		LOGIN: prefs.login,
		PASSWD: prefs.password,
		'URL': 'stat.home.mts.com.ua',
		'domain': '122',
		'subm': 'Вход',
	}, addHeaders({Referer: baseurl + 'login_user.htms'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /class="message"[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Текущий остаток([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'account', /Договор N([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', />Абонент([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}