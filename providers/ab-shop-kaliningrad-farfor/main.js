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
	var baseurl = 'http://kaliningrad.farfor.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var params = AB.createFormParams(html, function(params, str, name, value) {
		if (name == 'username')
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});

    if (params.username) {

        var postHeaders = AB.addHeaders({
            'Referer': baseurl,
            'X-Requested-With': 'XMLHttpRequest'
        });

        var res = AnyBalance.requestPost(baseurl + 'login/', params, postHeaders);
        res = AB.getJson(res);

        if (!res.success) {
            throw new AnyBalance.Error('Неверный логин или пароль!', null, true);
        }
    }

    html = AnyBalance.requestGet(baseurl + 'cabinet', g_headers);
	
	if (!/logout/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}


    var result = {success: true};

	AB.getParam(html, result, 'full_name', getRegEx('user">'), AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'phone', getRegEx('phone">'), AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'bonuses', getRegEx('gift">'), AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'orders', getRegEx('justify">'), AB.replaceTagsAndSpaces, AB.parseBalance);
	
	AnyBalance.setResult(result);
}

function getRegEx(searchValue) {
    var str = 'personalInfo[\\s\\S]*?' + searchValue + '([\\s\\S]*?)</li>';
    return new RegExp(str, 'i');
}
