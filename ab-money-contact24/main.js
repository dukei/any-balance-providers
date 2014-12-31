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
	var baseurl = 'https://www.contact24.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер телефона!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login.action', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
    var csrf = getParam(html, null, null, /name="_csrf"\s*value="([^"]+)/i);
    
	html = AnyBalance.requestPost(baseurl + 'j_spring_security_check', {
		'j_username': prefs.login,
		'j_password': prefs.password,
		'_csrf': csrf
	}, addHeaders({Referer: baseurl + 'login.action'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="transfer__error"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    html = AnyBalance.requestGet(baseurl + 'web/auth/banks/source/info/1', g_headers);
    
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /Баланс(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseCurrency);
    
   if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
    throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");

    var card_num = getParam(html, null, null, new RegExp('\\*\\*' + (prefs.cardnum || '\\d{4}'), 'i'));
    
	if(!card_num) {
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.cardnum ? 'карту с последними цифрами ' + prefs.cardnum : 'ни одной карты!'));
	}
    
	getParam(html, result, 'balance_card', new RegExp('(?:\\*\\*' + (prefs.cardnum || '\\d{4}') + '[^>]*>){1}([\\s\\S]*?)</', 'i'), replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency_card', 'balance_card'], new RegExp('(?:\\*\\*' + (prefs.cardnum || '\\d{4}') + '[^>]*>){1}([\\s\\S]*?)</','i'), replaceTagsAndSpaces, parseCurrency);
	
	AnyBalance.setResult(result);
}