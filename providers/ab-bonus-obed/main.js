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
	var baseurl = 'http://www.obed.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'registration/getPassword/', {
		'f_login': prefs.login,
		'f_password': prefs.password
	}, AB.addHeaders({Referer: baseurl}));
	
	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /alertsBlock\.create\(["']([^"']+)/i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неправильно введен пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	if(isAvailable('balance')) {
		html = AnyBalance.requestGet(baseurl + 'staff/balance', g_headers);
		
		AB.getParam(html, result, 'balance', /Свободных средств(?:[^>]*>){2}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces, AB.parseBalance);
	}
	
	AB.getParam(html, result, 'fio', /class="ob-lk__name[^>]*>([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, '__tariff', /class="ob-company-lk__name[^>]*>([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}