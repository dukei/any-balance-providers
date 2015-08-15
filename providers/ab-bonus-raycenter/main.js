/**
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
	var logourl = 'http://client.raycenter.ru/Account/LogIn?ReturnUrl=%2f';
	var baseurl = 'http://client.raycenter.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'Login') 
			return prefs.login;
		else if (name == 'Password')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(logourl, params, addHeaders({Referer: logourl}));
	
	if (!/logoff/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="validation-summary-errors"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl, g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /for="balance"[\s\S]+?<strong>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /id="logOff"[\s\S]+?<span>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'cardid', /for="cardID"[\s\S]+?<strong>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'modeinfo', /for="modeInfo"[\s\S]+?<div class="CardInfo_right">([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'datelastbuy', /for="dateLastBuy"[\s\S]+?<div class="CardInfo_right">([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'sumlastbuy', /for="sumLastBuy"[\s\S]+?<div class="CardInfo_right">([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}