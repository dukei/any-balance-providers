/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lk.etherway.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	try {
		var html = AnyBalance.requestGet(baseurl + 'site/login', g_headers);
	} catch(e){}
	
	if(AnyBalance.getLastStatusCode() > 400 || !html) {
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'site/login', {
		'FormSiteLogin[username]':prefs.login,
		'FormSiteLogin[password]':prefs.password,
		'FormSiteLogin[ajax]':1,
		'FormSiteLogin[authWeb][id]':0,
		'FormSiteLogin[authWeb][type]':''
    }, addHeaders({Referer: baseurl + 'site/login'}));
	
	if(!/"result"\s*:\s*"OK"/i.test(html)) {
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'account', g_headers);
	
    var result = {success: true};
	
	getParam(html, result, 'dogovor', /Договор(?:[^>]*>){3}([^<]*)</i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /ФИО(?:[^>]*>){3}([^<]*)</i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', />Бал?ланс(?:[^>]*>){3}([^<]*)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'discount', /Скидка(?:[^>]*>){3}([^<]*)</i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}