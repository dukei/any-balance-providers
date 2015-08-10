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
	var baseurl = 'http://nelimit.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login.php', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl + 'login.php?action=process', {
		'email_address': prefs.login,
		'password': prefs.password,
		'x': '45',
        'y': '15'
	}, addHeaders({Referer: baseurl + 'login.php'}));
	
	if (!/logoff/i.test(html)) {
		var error = getParam(html, null, null, /ОШИБКА:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный 'E-Mail Адрес' и\/или 'Пароль'/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
    html = AnyBalance.requestGet(baseurl + 'account.php', g_headers);
    
    var phone_number = prefs.phone_number || '';
    
    var href_num = getParam(html, null, null, new RegExp('<a href="\\/(account\\.php\\?action=editform&ph_numbers=' + (prefs.phone_number || '\\d{10}') + ')">', 'i'), replaceTagsAndSpaces, html_entity_decode);
    checkEmpty(href_num, 'Не удалось найти ' + (prefs.phone_number ? 'номер телефона ' + prefs.phone_number : 'ни одного номера!'), true);
    
    AnyBalance.trace(href_num);
    
    html = AnyBalance.requestGet(baseurl + href_num, g_headers);
    
	var result = {success: true};
	
	getParam(html, result, 'balance', /СУММА НА БАЛАНСЕ(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'abon_payment', /абонентская плата по тарифному плану(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /тарифный план БЕЗЛИМИТ(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'internet', /безлимитный мобильный интернет(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'messages', /пакет SMS\/MMS(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}