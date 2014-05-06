/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Домашний Интернет и Телевидение Акадо
Сайт оператора: http://www.akado.ru/
Личный кабинет: https://office.akado.ru/login.xml
*/

var g_headers = {
	'Accept': '*/*',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru,en;q=0.8',
	'Connection': 'keep-alive',
	'Origin': 'https://office.akado.ru',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/34.0.1847.131 Safari/537.36',
};

function getId(html) {
	return getParam(html, null, null, /akado-request\s*([\dA-F\-]+)/i);
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var baseurl = 'https://office.akado.ru/';
	
	var html = AnyBalance.requestGet(baseurl + 'user/login.xml?NeedLoggedOn', g_headers);
	
	html = requestPostMultipart(baseurl + 'user/login.xml', {
		login: prefs.login,
		password: prefs.password,
	}, addHeaders({
		Referer: baseurl + 'user/login.xml?NeedLoggedOn',
		'X-Request': 'xml',
		'X-Request-ID':getId(html)
	}));
	
	if(!/Вы успешно вошли в Личный кабинет/i.test(html)){
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

    var result = {success: true};

	getParam(html, result, 'balance', /balance="([^"]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'username', /<account([\s\S]*?)\/>/i, [replaceTagsAndSpaces, /surname="([^"]+)"\s*name="([^"]+)"\s*patronymic="([^"]+)[\s\S]*/i, '$1 $2 $3'], html_entity_decode);
	getParam(html, result, 'agreement', /crc="([^"]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
    if(AnyBalance.isAvailable('payhint')){
		html = AnyBalance.requestGet(baseurl + 'finance/prepay.xml');
		
		getParam(html, result, 'payhint', /prepay amount="([^"]+)/i, replaceTagsAndSpaces, parseBalance);
	}

    html = AnyBalance.requestGet(baseurl + 'services/display.xml');
	
	sumParam(html, result, '__tariff', /<service[^>]*name="([^"]+)[^>]*">/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
	
    AnyBalance.setResult(result);
}