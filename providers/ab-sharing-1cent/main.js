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
	var baseurl = 'https://1cent.tv/';
	AnyBalance.setOptions({forceCharset:'utf-8'});
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
        
	html = AnyBalance.requestPost(baseurl, {
		'userName': prefs.login,
		'userPass': prefs.password,
		'loginIn': 'ok'
	}, addHeaders({Referer: baseurl}));
    
	if (!/Добро пожаловать/i.test(html)) {
		var error = getParam(html, null, null, /(?:system message[\s\S]*?<td class="head5">){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /неправильно введен логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    html = AnyBalance.requestGet(baseurl + 'dealer.php', g_headers);
    
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс:([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);    
	getParam(html, result, 'dw_key', /Cтоимость одного dw \(ключа\):[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'dw_users', /Сумма dw юзеров[\s:]*?\[([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'sum', /На сумму[\s:]*?\[([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /font\s*?color="#006600">([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}