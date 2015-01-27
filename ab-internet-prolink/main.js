/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.66 Safari/537.36'
};

function getLoginParams(html, prefs) {
	return createFormParams(html, function(params, str, name, value){
		if(name == 'ip1')
			return prefs.login;
		else if(name == 'ip2')
			return prefs.password;			
		return value;
	});
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://stat.prolink.ru/';
    AnyBalance.setDefaultCharset('windows-1251');
	
    var html = AnyBalance.requestGet(baseurl + 'stat/index.php', g_headers);
	
	var params = getLoginParams(html, prefs);
	
	if(!params || !params.ip1) {
		AnyBalance.trace('Какая-то тупая промо страница - пропускаем...');
		html = AnyBalance.requestGet(baseurl + 'stat/index.php', g_headers);	
		params = getLoginParams(html, prefs);
	}
	
	html = AnyBalance.requestPost(baseurl + 'stat/', params, addHeaders({Referer: baseurl + 'stat/', Origin: baseurl})); 
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<center>([^>]*>){1}/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Такого договора в системе не существует/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	
    var result = {success: true};
	
    getParam(html, result, 'acc_num', /Номер договора:(?:[\s\S]*?<td[^>]*>)([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /Ф\.И\.О(?:[\s\S]*?<td[^>]*>)([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Тарифный план:(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Баланс на текущий момент времени:(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /Состояние:(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'turbo', /Турбо-режим:(?:[\s\S]*?<td[^>]*>)([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'turbo_traf', /Доступно турбо-трафика:([^>]*>){4}/i, replaceTagsAndSpaces, parseTraffic);
	
    AnyBalance.setResult(result);
}