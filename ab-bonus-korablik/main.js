/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'application/json, text/javascript, */*; q=0.01',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.korablik.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
		
	var html = AnyBalance.requestPost(baseurl + 'auth/login', {
        login:prefs.login,
        pass:prefs.password,
    }, addHeaders({
		Referer: baseurl + 'auth/login',
		'X-Requested-With':'XMLHttpRequest',
	}));
	
	if(html != '1') {
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	html = AnyBalance.requestGet(baseurl + 'bk/check_user', addHeaders({
		Referer: baseurl + 'auth/login',
		'X-Requested-With':'XMLHttpRequest',
	}));
	
    var result = {success: true};
	
	getParam(html, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	
	html = AnyBalance.requestGet(baseurl + 'detskaya/loyalty/mycards', addHeaders({Referer: baseurl+'detskaya/loyalty/profile'}));
	
	getParam(html, result, 'cardnum', /(\d{5,})(?:<[^<]*){3}номер бонусной карты/i, replaceTagsAndSpaces);
	getParam(html, result, 'cardbalance', />([^<]*)(?:<[^<]*){3}баланс карты/i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}