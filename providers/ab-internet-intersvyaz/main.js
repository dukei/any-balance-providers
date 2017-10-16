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
        var baseurl = 'https://lk.is74.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'auth/login', g_headers);
        
        if(!html || AnyBalance.getLastStatusCode() >= 400){
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
        var loginParams = {
            u: prefs.login, 
            p: prefs.password
        };
	var params = AB.createFormParams(html, function(params, str, name, value) {
            return loginParams[name] || value;
        });
	
        html = AnyBalance.requestPost(baseurl + 'auth/login', params, AB.addHeaders({
            Referer: baseurl + 'auth/login',
            Origin: 'https://lk.is74.ru'
        }));
	
	var lastUrl = AnyBalance.getLastUrl();
	AnyBalance.trace('Last url was: ' + lastUrl);
	
	var subDomain = getParam(lastUrl, null, null, /https:\/\/([^\.]*)\.lk/i);
	AnyBalance.trace('Sub domain is: ' + subDomain);
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /class="auth-error-summary"[^>]*>([\s\S]*)<\/ul/i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, false, /логин|пароль/i.test(error));
		
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	AB.getParam(html, result, 'balans', /Баланс на\s*(?:\d+\.){2}\d{4}(?:[^>]*>){2}([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'bonuspr', /Ваш текущий бонус(?:[^>]*>){2}([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'econom', /Ваш текущий бонус(?:[^>]*>){4}([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'fio', /Здравствуйте,(?:[^>]*>){1}([^<]*)/i, AB.replaceTagsAndSpaces);
	
	if(isAvailable('nls')) {
		html = AnyBalance.requestGet('https://' + subDomain + '.lk.is74.ru/profile', g_headers);
		getParam(html, result, 'nls', /Лицевой счет №:(?:[^>]*>){2}([^<]*)/i, AB.replaceTagsAndSpaces);
	}
	
	AnyBalance.setResult(result);
}