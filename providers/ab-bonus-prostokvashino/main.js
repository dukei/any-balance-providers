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
	var baseurl = 'http://prostokvashino.by/';
	AnyBalance.setDefaultCharset('utf-8');
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = AB.createFormParams(html, function(params, str, name, value) {
		if (name == 'user[email]') 
			return prefs.login;
		else if (name == 'user[password]')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'users/sign_in', params, AB.addHeaders({Referer: baseurl}));
	
	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /notification-message[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces);
		if (error) {
            throw new AnyBalance.Error(error, null, /email или пароль/i.test(error));
        }
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + 'profile', g_headers);
	
	var result = {success: true};

    AB.getParam(html, result, 'balance', /Баллов на счету:([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'fio', /<a[^>]*profile[^>]*name[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'email', /E-mail:([^<]+)/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'gender', /Пол:([^<]+)/i, AB.replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}