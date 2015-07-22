/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
	'X-Requested-With':'XMLHttpRequest'
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://wog.ua/ua/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestPost(baseurl + 'profile/login/', {
        "data[login]":prefs.login,
        "data[password]":prefs.password,
		func:'GetRemains'
    }, addHeaders({Referer: baseurl + 'profile/login/'}));
	
	var json = getJson(html);
	if(!json || json.status !== true) {
		if(json){
			if(json.status == 'card_not_found')
				throw new AnyBalance.Error('Карта не найдена', null, true);
			if(json.status == 'invalid_password')
				throw new AnyBalance.Error('Неверный пароль', null, true);
			var e = {};
			if(json.errors){
				for(var i in json.errors)
					sumParam(json.errors[i], e, 'e', null, null, null, aggregate_join);
			}
			if(e.e)
				throw new AnyBalance.Error(e);
		}
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

    var result = {success: true};
    sumParam(json.info.FIRSTNAME, result, 'fio', null, null, null, aggregate_join);
    sumParam(json.info.MIDDLENAME, result, 'fio', null, null, null, aggregate_join);
    sumParam(json.info.LASTNAME, result, 'fio', null, null, null, aggregate_join);
    getParam(json.info.BIRTHDAY, result, 'birthday', null, null, parseDate);
    getParam(json.info.TELEPHONE, result, 'phone');
    getParam(json.info.EMAIL, result, 'email');
    getParam(json.info.SEX, result, 'sex', null, null, function(str){return str == 2 ? 'ж' : 'м'});

    html = AnyBalance.requestGet(json.redirectLink, g_headers);
	getParam(html, result, 'balance', /<span[^>]+balance_status[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', />Номер картки<[\s\S]*?<div[^>]+class="right"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}