﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.101 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите е-мейл для входа в личный кабинет agent.mail.ru!');
    var parts = prefs.login.match(/([\w-\.]+)@((?:[\w]+\.)+[a-zA-Z]{2,4})$/i);
    if(!parts)
         throw new AnyBalance.Error('Вы ввели неправильный е-мейл для входа на agent.mail.ru.', null, true);
	
    var baseurlLogin = "https://auth.mail.ru/cgi-bin/auth";
    var baseurl = "https://agent.mail.ru/";
	
    AnyBalance.setDefaultCharset('utf-8');
	
    var html = AnyBalance.requestPost(baseurlLogin + '?lang=ru_RU&from=authpopup', {
        page:baseurl,
        FailPage:'',
        Login:prefs.login,
        Domain:parts[2].toLowerCase(),
        Password:prefs.password,
        new_auth_form:1
    });
	
	if(AnyBalance.getLastUrl().indexOf(baseurl) != 0){
		var error = getParam(html, null, null, /<div[^>]+login-page__external_error[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error, null, /Неверное имя пользователя или пароль/i.test(error));
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неправильный логин-пароль?');
    }
	
    html = AnyBalance.requestGet(baseurl + 'phonecalls/cabinet/settings');
	
    var result = {success: true};
    getParam(html, result, 'license', /<label[^>]*>Номер счета[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(prefs.login, result, 'login');
    getParam(prefs.login, result, '__tariff');
    getParam(html, result, 'balance', /<label[^>]*>Текущий баланс[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'number', /Номер при вызове(?:[^>]*>){6,14}\s*<option[^>]+value=[^>]*selected[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}