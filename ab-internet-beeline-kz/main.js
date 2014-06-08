/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main() {
	AnyBalance.setDefaultCharset('utf-8');
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var baseurl = "https://my.internet.beeline.kz/RU/";
	
	var html = AnyBalance.requestPost(baseurl + 'Account/LogOn', {
		login: '',
		password: '',
		submit: '',
		'AuthData.RememberMe': false,
		'AuthData.ReturnUrl': '',
		'AuthData.Login': prefs.login,
		'AuthData.Password': prefs.password
	}, addHeaders({Referer: baseurl}));
	
	if (!/exit_btn_text/i.test(html)) {
		var error = getParam(html, null, null, /ShowAlert\("[^"]*",\s*"([^"]*)/, replaceSlashes);
		if (error)
			throw new AnyBalance.Error(error);
		
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
    getParam(html, result, 'licschet', /(?:Лицевой счет №)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /(?:Ваш баланс)([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /<div[^>]+class="panel"[\s\S]*?<div[^>]+class="header"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /<div[^>]+class="name"[^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /-/g, '', /\s*$|^\s*/g, ''], html_entity_decode);
    
	if (isAvailable(['trafficIn', 'trafficOut'])) {
    	html = AnyBalance.requestGet(baseurl + 'cabinet/internet/statistic', g_headers);
    	getParam(html, result, 'trafficIn', /(?:Принято:)([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseTrafficGb);
    	getParam(html, result, 'trafficOut', /(?:Передано:)([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseTrafficGb);
    }
    if (isAvailable('balance')) {
    	html = AnyBalance.requestPost(baseurl + 'cabinet/internet/UpdateBalance', '', addHeaders({Referer: baseurl,'X-Requested-With': 'XMLHttpRequest'}));
		
    	getParam(html, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
    }
    AnyBalance.setResult(result);
}