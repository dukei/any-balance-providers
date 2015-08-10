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
	var baseurl = 'http://www.getcashback.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'auth/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'auth/?login=yes', {
        'AUTH_FORM': 'Y',
        'TYPE': 'AUTH',
        'backurl': '/auth/',
        'USER_LOGIN': prefs.login,
        'USER_PASSWORD': prefs.password,
        'Login': 'Войти'
	}, addHeaders({Referer: baseurl + 'auth/?login=yes'}));
	
    
	if (!/UserLogOut/i.test(html)) {
		var error = getParam(html, null, null, /errortext"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    html = AnyBalance.requestGet(baseurl + 'profile/?backurl=%2F', g_headers);
    
	var result = {success: true};
	
	getParam(html, result, 'balance', /Доступные для вывода:(?:[^>]*>){1}([\s\S]*?)<\/span/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'waiting', /Ожидающие подтверждения:(?:[^>]*>){1}([\s\S]*?)<\/span/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'unconfirmed', /Неподтвержденные:(?:[^>]*>){1}([\s\S]*?)<\/span/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'total', /Итого выведено:(?:[^>]*>){1}([\s\S]*?)<\/span/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}