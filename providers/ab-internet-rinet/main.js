/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.111 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences(),
        baseurl = "https://secure.rinet.ru/";
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    var html = AnyBalance.requestGet(baseurl, g_headers);
    
    if(!html || AnyBalance.getLastStatusCode() > 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

	var form = AB.getElement(html, /<form/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'user') {
			return prefs.login;
		} else if (name == 'passwd') {
			return prefs.password;
		}

		return value;
	});

    var html = AnyBalance.requestPost(baseurl, params, addHeaders({Referer: baseurl}));

    if(!/Logout/.test(html)){
        var error = getElement(html, /<[^>]+form-control-comment/, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /парол/i.test(error));
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    //getParam(html, result, '__tariff', /Тарифный план:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(getElement(html, /<div[^>]+col-balance/i), result, 'balance', null, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'abon', /Абонентская плата[\s\S]+?<div[^>]+col-right[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    //getParam(html, result, 'status', /Состояние счета:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
    	html = AnyBalance.requestGet(baseurl + 'history/traf?month=' + getFormattedDate({format: 'YYYY-MM'}), g_headers);

    	var tin = getParam(html, /входящий трафик:[\s\S]*?<table[^>]*>([\s\S]*)<\/table>/i);
    	getParam(tin, result, 'trafficIn', /Всего:[\s\S]*?<td[^>]*>([\s\S]*)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);

    	var tout = getParam(html, /исходящий трафик:[\s\S]*?<table[^>]*>([\s\S]*)<\/table>/i);
    	getParam(tout, result, 'trafficOut', /Всего:[\s\S]*?<td[^>]*>([\s\S]*)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);

    }
    
    AnyBalance.setResult(result);
}