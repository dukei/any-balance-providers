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
	var baseurl = 'http://lk.udmesk.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + '/Services/Auth.asmx/CheckLogin?part=&login=%27' + prefs.login + '%27&password=%27' + prefs.password +  '%27&format=json&callback=jQuery16203505221998784691_1394184130841&_=' + new Date().getTime(), g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'default.aspx', {
		login: prefs.login,
		password: prefs.password,
		'action': 'login'
	}, addHeaders({Referer: baseurl + 'default.aspx'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, '__tariff', /<table class="ControlChecksList(?:[^>]*>){4}\s*Год(?:[^>]*>){21}((?:[\s\S]*?<\/td[^>]*>){2})/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'licschet', /№ л\/с([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /ФИО([^>]*>){7}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Состояние счета([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}