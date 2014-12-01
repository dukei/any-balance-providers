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
	var baseurl = 'http://www.baltplay.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl, {
        '__EVENTTARGET': '',
        '__EVENTARGUMENT': '',
        '__CALLBACKID': 'Top1',
        '__CALLBACKPARAM': '1|'+ prefs.login +'|' + prefs.password
	}, addHeaders({Referer: baseurl}));
  
	if (!/Выйти/i.test(html)) {
        if(/s1/i.test(html))
		var error = 'Имя пользователя или пароль введен неверно';
		if (error)
			throw new AnyBalance.Error(error, null, /Имя пользователя или пароль введен неверно/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
	html = AnyBalance.requestPost(baseurl, {
        '__EVENTTARGET': '',
        '__EVENTARGUMENT': '',
        '__CALLBACKID': 'Left1',
        '__CALLBACKPARAM': '9|'
	}, addHeaders({Referer: baseurl}));
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс счета:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'name', /Имя пользователя:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'account', /Номер счета:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'bonus', /Бонусные баллы:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}