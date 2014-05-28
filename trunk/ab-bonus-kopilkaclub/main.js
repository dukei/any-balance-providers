/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона без +7, 10 цифр!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = 'https://kopilkaclub.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestPost(baseurl + 'account/login', {
		card_no:'+7' + prefs.login,
		pin:prefs.password,
		api:1
	}, addHeaders({'X-Requested-With':'XMLHttpRequest'}));
	
	var json = getJson(html);
	var message = json.message;
	
	if (!/Успешная авторизация/i.test(message)) {
		var error = getParam(message, null, null, null, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверно введен номер телефона или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl, g_headers);
	
    var result = {success: true};
	
    getParam(html, result, 'balance', /"balance"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}