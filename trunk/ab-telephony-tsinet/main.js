/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.tsinet.ru/';
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
    
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    
	html = AnyBalance.requestPost(baseurl +'stat/?page=156', {
        'login': prefs.login,
        'password': prefs.password,
        'page': '156'
    }, addHeaders({Referer: baseurl +'stat/?page=156'}));
	
	if (!/>Выход</i.test(html)) {
		var error = getParam(html, null, null, /Ошибка авторизации/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Ошибка авторизации/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Состояние счета:(?:[^>]*>){4}([^<]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /(?:Л[\s\S]И[\s\S]Ч[\s\S]Н[\s\S]Ы[\s\S]Й[\s\S]*?К[\s\S]А[\s\S]Б[\s\S]И[\s\S]Н[\s\S]Е[\s\S]Т:)([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'account', /Номер лицевого счета:(?:[^>]*>){3}([^<]*?)</i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'credit', /Кредит:(?:[^>]*>){3}([^<]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'limit', /Порог доступа:(?:[^>]*>){3}([^<]*?)</i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}