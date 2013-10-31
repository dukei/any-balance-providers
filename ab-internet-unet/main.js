/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://my.unet.by/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'login', {
        login:prefs.login,
        pass:prefs.password,
    }, addHeaders({Referer: baseurl + 'login'}));
	
	if(!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if(error && /Неверный логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    var result = {success: true};
	getParam(html, result, 'accnum', /<td>\s*Номер счёта(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /<td>\s*Текущий баланс(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /<td>\s*Тарифный план(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
	getParam(html, result, 'traf_inet', /<td>\s*Трафик Интернет(?:[^>]*>){5}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseTraffic);
	getParam(html, result, 'traf_unet', /<td>\s*Трафик UNET\.BY(?:[^>]*>){5}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseTraffic);
	
    AnyBalance.setResult(result);
}