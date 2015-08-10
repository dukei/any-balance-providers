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
	var baseurl = 'https://my.domtele.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl, {
		login: prefs.login,
		password: prefs.password
	}, addHeaders({Referer: baseurl}));	
	
	if (!/exit_form/i.test(html)) {
		var error = getParam(html, null, null, /color:red(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неправильно введен логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
	html = AnyBalance.requestPost(baseurl, {
        'where_to': 1
	}, addHeaders({Referer: baseurl}));
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс:(?:[^>]*>){2}([\s\S]*?)грн/i, [replaceTagsAndSpaces, /Долг([\s\d.,]+)/i, '- $1'], parseBalance);
	getParam(html, result, 'fio', /Абонент:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'account', /Номер договора:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'lic_account', /Лицевой Счет:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'connection', /Подключение:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /Статус:(?:[^>]*>){1}([\s\S]*?)<span/i, replaceTagsAndSpaces, html_entity_decode);
     
	html = AnyBalance.requestPost(baseurl, {
        'where_to': 4
	}, addHeaders({Referer: baseurl}));
	   
	getParam(html, result, '__tariff', /<b>\s*Название:(?:[\s\S]*?<td[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}