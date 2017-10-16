﻿/**
Бонусная карта сети магазинов Улыбка Радуги (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.avantageclub.ru/';
    AnyBalance.setDefaultCharset('UTF-8'); 

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + '?login=yes&backurl=%2Fpersonal%2F', g_headers);
/*	Выдают 500 в нормальном режиме
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
*/	
	html = AnyBalance.requestPost(baseurl + '?login=yes&backurl=%2Fpersonal%2F', {
		'auth_submit_button': 'Y',
		'Login': 'Войти',
		'USER_REMEMBER': '',
		'AUTH_FORM': 'Y',
		'TYPE': 'AUTH',
		'backurl': '/personal/',
		'USER_LOGIN': prefs.login,
		'USER_PASSWORD': prefs.password,
	}, addHeaders({Referer: baseurl + '?login=yes&backurl=%2Fpersonal%2F'}));
	
    if(!/logout=yes/i.test(html)){
        if(/auth error/i.test(html))
        	throw new AnyBalance.Error('Неверный логин или пароль', null, true);
        
        AnyBalance.trace(html);
		
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + 'personal/', g_headers);

    var result = {success: true};
	
    getParam(html, result, 'balance', /Баланс Вашей карты:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'fio', /Добро пожаловать,(?:[^>]*>){1}([\s\S]*?)!\s*<\//i, replaceTagsAndSpaces);
    getParam(html, result, 'number', /name="UF_AVANTAGE_CARD"[^>]*value="([^"]+)/i, replaceTagsAndSpaces);
    getParam(html, result, 'phone', /name="PERSONAL_PHONE"[^>]*value="([^"]+)/i, replaceTagsAndSpaces);
    getParam(html, result, 'email', /name="EMAIL"[^>]*value="([^"]+)/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}
