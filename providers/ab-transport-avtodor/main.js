/**
Компания Автодор, занимающаяся оплату за проезд по платным дорогам (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'Origin': 'https://avtodor-ts.ru',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    AnyBalance.setDefaultCharset('utf-8');
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://avtodor-tr.ru/';

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'account', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
    html = requestPostMultipart(baseurl + 'account/login', {
		"email": prefs.login,
		"password": prefs.password,
		"submit0":  "Подождите...",
		"return_url": "https://avtodor-tr.ru/account"
	}, addHeaders({Referer: baseurl + 'account/login'}));

    if(!/account\/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="block_thanks"[^>]*>[\s\S]*?<div[^>]+class="text"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

    var result = {success: true};

    getParam(html, result, 'fio', /<td>Клиент[\s]*<\/td>[\s]*<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<td>Баланс<\/td>[\s\S]*<td>([\s\S]*)<span class="alsrub">i<\/span><\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'number', /<td>Договор[\s]*<\/td>[\s]*<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'email', /<td>Email[\s]*<\/td>[\s]*<td class="word-break">([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    
	var href = getParam(html, null, null, /href="([^"]*loyalty\.[^"]+)/i, replaceTagsAndSpaces);
	if(href) {
		html = AnyBalance.requestGet(href);
		// У тестироуемого акка нету бонусов, поэтому "это" я исправить не могу
		getParam(html, result, 'bonus', /<td><span class="mybonusbalance green-bold-text" style="font-size: 36px">([\s\S]*?)<\/span><\/td>/i, replaceTagsAndSpaces, parseBalance);
	} else {
		AnyBalance.trace('Не удалось найти ссылку на программу лояльности!');
	}
	
    AnyBalance.setResult(result);
}
