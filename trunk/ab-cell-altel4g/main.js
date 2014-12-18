/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Origin': 'https://cabinet.altel.kz',
	'Referer': 'https://cabinet.altel.kz/',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.162 Safari/535.19'
};

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = "https://cabinet.altel.kz/?lang=ru";
    AnyBalance.setDefaultCharset('utf-8');
	
    var html = AnyBalance.requestPost(baseurl, {
        form_login:prefs.login,
        form_pass:prefs.password,
        x:81,
        y:18
    }, g_headers);
	
	if(!/logout=1/i.test(html)) {
		var error = getParam(html, null, null, /<ul[^>]+class="error"[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};
	
    getParam(html, result, 'fio', /"account-title"[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'phone', /(?:Ваш номер|Сіздің нөміріңіз):([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /"plan-title"[^>]*>([^<]+)[^>]*>[^>]*plan-subtitle/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /"split-title"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'till', /бонусный счет[^>]*>\s*до([^<]+)/i, replaceTagsAndSpaces, parseDate);
	// трафик
	getParam(html, result, 'traffic_used', /counter"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseTraffic);
    getParam(html, result, 'traffic_left', /([\d.,\s]+\s*(?:[^>]*>){2}\s*Мб)/i, replaceTagsAndSpaces, parseTraffic);
	// Минуты внутри сети
	getParam(html, result, 'min_left', /(\d+:\d+)\s*(?:[^>]*>){2}\s*Мин(?:[^>]*>){3}\s*Внутри сети/i, replaceTagsAndSpaces, parseMinutes);
	// Минуты на GSM
	getParam(html, result, 'min_left_gsm', /(\d+:\d+)\s*(?:[^>]*>){2}\s*Мин(?:[^>]*>){3}\s*на GSM/i, replaceTagsAndSpaces, parseMinutes);
	// Минуты на город
	getParam(html, result, 'min_left_city', /(\d+:\d+)\s*(?:[^>]*>){2}\s*Мин(?:[^>]*>){3}\s*на город/i, replaceTagsAndSpaces, parseMinutes);	
	
	// Смс внутри сети
	getParam(html, result, 'sms_left', /(\d+)\s*(?:[^>]*>){2}\s*СМС(?:[^>]*>){3}\s*Внутри сети/i, replaceTagsAndSpaces, parseBalance);
    
    AnyBalance.setResult(result);
}