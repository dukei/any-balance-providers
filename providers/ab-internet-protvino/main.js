﻿/**
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
	var baseurl = 'https://stat.protvino.net/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(AnyBalance.getLastStatusCode() > 400) {
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	}

    if (!/logout/i.test(html)) {
        html = AnyBalance.requestPost(baseurl, {
            'username': prefs.login,
            'password': prefs.password,
            'send': ''
        }, addHeaders({Referer: baseurl}));

        if (!/logout/i.test(html)) {
            var error = getParam(html, null, null, /<div class="alert[^>]*>[\s\S]*?<a[^>]*>[\s\S]*?<\/a>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
            if (error) {
                throw new AnyBalance.Error(error, null, /Ошибка авторизации/i.test(error));
            }

            AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
        }
    }
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /class="well"(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', />\s*Баланс(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'account', />\s*Основной лицевой счёт:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}