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
	var baseurl = 'http://lp-partners.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl + 'cgi-bin/pl/affiliates/index.cgi', {
		login: prefs.login,
		pass: prefs.password
	}, addHeaders({Referer: baseurl + 'cgi-bin/pl/affiliates/index.cgi'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /Ошибка<(?:[^>]*>){2}([\s\S]*?)<br>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
    var href = getParam(html, null, null, /id="substats"[^>]*>[\s\S]*?<li[^>]*><a\shref="([\s\S]*?)"/i);
    html = AnyBalance.requestGet(baseurl + 'cgi-bin/pl/affiliates/' + href, g_headers);

	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс(?:[^>]*>){1}([\s\S]*?)<\//g, replaceTagsAndSpaces, parseBalance);  
	getParam(html, result, 'user_id', /ID:([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'all', /Всего анкет:(?:[\s\S]*?){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'men', /Мужских:(?:[\s\S]*?){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'women', /Женских:(?:[\s\S]*?){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}