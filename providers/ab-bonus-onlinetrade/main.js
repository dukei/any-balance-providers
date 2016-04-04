/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.125 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.onlinetrade.ru/';
	AnyBalance.setDefaultCharset('windows-1251');
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	AnyBalance.setCookie('www.onlinetrade.ru', 'beget', 'begetok');
	
	var html = AnyBalance.requestGet(baseurl + 'member/login.html', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'member/login.html', {
		login: prefs.login,
		password: prefs.password,
		'log_in': '1',
		'submit': 'войти'
	}, addHeaders({Referer: baseurl + 'member/login.html'}));
	
	if (!/member\/\?log_out=1/i.test(html)) {
		var error = AB.getParam(html, null, null, /MessageError[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /неверный/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	AB.getParam(html, result, 'balance', /ON-бонусов:([^>]+>){2}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'price', /Цена:([^>]+>){2}/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'userId', /Клиентский номер([^>]+>){2}/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'status', /Статус:([^>]+>){2}/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'email', /E-mail:([^>]+>){2}/i, AB.replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}