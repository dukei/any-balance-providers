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
	var baseurl = 'https://ip.ums.uz/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер телефона, без кода!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'selfcare/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
    var viewstate = getParam(html, null, null, /"__VIEWSTATE"[^>]*value="([^"]+)/i);
    var viewstate_gen = getParam(html, null, null, /"__VIEWSTATEGENERATOR"[^>]*value="([^"]+)/i);
    
	html = AnyBalance.requestPost(baseurl + 'selfcare/', {
        '__VIEWSTATE': viewstate,
        '__VIEWSTATEGENERATOR': viewstate_gen,
        'ctl00$MainContent$tbPhoneNumber': prefs.login,
        'ctl00$MainContent$tbPassword': prefs.password,
        'ctl00$MainContent$btnEnter': 'Войти'
	}, addHeaders({Referer: baseurl + 'selfcare/'}));
	
	if (!/logoff/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="logon-result-block"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /неизвестный номер телефона|неверный пароль|пароль не установлен или не действителен/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /баланс:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /баланс:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'fio', /<h3>([^]+)<\/h3>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Тарифный план:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'phone', /Номер:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc', /Лицевой счет:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /lock-status(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    
	if(isAvailable(['traffic', 'minutes', 'sms'])) {
		html = AnyBalance.requestGet(baseurl + 'selfcare/account-status.aspx', g_headers);
		
		getParam(html, result, 'traffic', /У Вас осталось([\s\S]*?)mb/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'minutes', /Осталось([^<]+)минут/i, replaceTagsAndSpaces, parseBalance);  
		getParam(html, result, 'sms', /Осталось([^<]+)(?:смс|sms)/i, replaceTagsAndSpaces, parseBalance);  
	}
	
	AnyBalance.setResult(result);
}