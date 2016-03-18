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

function main(){
	var prefs = AnyBalance.getPreferences();

	AB.checkEmpty(prefs.email, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');

	AnyBalance.setDefaultCharset('utf-8');

	var baseurl = 'https://cloud.digitalocean.com';

	var html = AnyBalance.requestGet(baseurl + '/login', g_headers);

	var params = AB.createFormParams(html, function(params, str, name, value) {
		if (name == 'user[email]') 
			return prefs.email;
		else if (name == 'user[password]')
			return prefs.password;

		return value;
	});

	html = AnyBalance.requestPost(baseurl + '/sessions', params, g_headers);

	if (!/currentUser[^{]+(?:{[^}]+})/i.test(html)) {
		var error = AB.getParam(html, null, null, /<ul[^>]+class=['"]notice errors['"][^>]*>([\s\S]*?)<\/ul>/i, AB.replaceTagsAndSpaces);
		if (error) {
            throw new AnyBalance.Error(error, null, /Invalid email or password/i.test(error));
        }
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var status = AnyBalance.getLastStatusCode();

	if(status != 200 && status != 302 ){
		throw new AnyBalance.Error('Ошибка авторизации ');
	}

	html = AnyBalance.requestGet(baseurl + '/settings/billing', g_headers);

	status = AnyBalance.getLastStatusCode();

	if(status != 200){
		throw new AnyBalance.Error('Ошибка получения данных');
	}

	var result = {success: true};

    AB.getParam(html, result, 'balance', /Your Credit([\s\S]*?)<\//i, null, AB.parseBalance);
    AB.getParam(html, result, 'usage', /Usage([\s\S]*?)<\//i, null, AB.parseBalance);
	
	AnyBalance.setResult(result);
}

