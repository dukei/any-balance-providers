/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс миль в программе Aeroflot Bonus.

Сайт оператора: http://aeroflotbonus.ru/
Личный кабинет: https://www.aeroflot.ru/personal/
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
	
    checkEmpty(prefs.login, 'Введите логин');
    checkEmpty(prefs.login, 'Введите пароль');

    var baseurl = "https://www.aeroflot.ru/personal/";
    AnyBalance.setDefaultCharset('utf-8');
    
    var html = requestPostMultipart(baseurl + 'login', {
    	login: prefs.login,
    	password: prefs.password,
    	submit0: 'Подождите...',
    	return_url: ''
    }, addHeaders({
    	Origin: "https://www.aeroflot.ru",
    	Referer: baseurl + 'login'
    }));
	if (!/\/personal\/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="[^"]*error[^>]*>([\s\S]*?)(?:<p|<\/div>)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		
		error = getParam(html, null, null, /<!-- :: errors :: -->\s*<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /указали неправильные реквизиты/.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}

    var result = {success: true};
	
    getParam(html, result, 'qmiles', /<td[^>]+id="current_year_miles_value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'segments', /<td[^>]+id="current_year_segments_value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /<div[^>]+class="name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	
	var userInfo = getParam(html, null, null, /var\s+user_info\s*=\s*JSON\.stringify\(([\s\S]*?)\);/i, replaceTagsAndSpaces, getJson);
	if(userInfo) {
		getParam(userInfo.miles + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
		getParam(userInfo.tier_level + '', result, 'level');
	}
	
    AnyBalance.setResult(result);
}
