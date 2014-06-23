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
	
	var html = AnyBalance.requestGet(baseurl + 'auth/login', g_headers);
	
	if(AnyBalance.getLastStatusCode() > 400) {
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'auth/login', {
		act:'enter',
        login:prefs.login,
        pwd:prefs.password,
    }, addHeaders({
		Referer: baseurl+'auth/login',
		'X-Requested-With':'XMLHttpRequest',
	}));
	
	if(!/^\s*0\s*$/.test(html)) {
		if(/\\u041d\\u0435\\u0432\\u0435\\u0440\\u043d\\u044b\\u0439 \\u043a\\u043e\\u0434 \\u0441 \\u043a\\u0430\\u0440\\u0442\\u0438\\u043d\\u043a\\u0438/i.test(html))
			throw new AnyBalance.Error('Неверный логин или пароль!', false, true);
		
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	/*html = AnyBalance.requestGet(baseurl + 'detskaya/profile', addHeaders({
		Referer: baseurl + 'auth/login',
		'X-Requested-With':'XMLHttpRequest',
	}));*/
	
    var result = {success: true};
	
	//getParam(html, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	
	html = AnyBalance.requestGet(baseurl + 'detskaya/loyalty/mycards', addHeaders({Referer: baseurl+'detskaya/loyalty/profile'}));
	
	getParam(html, result, 'cardnum', /(\d{5,})(?:<[^<]*){3}номер бонусной карты/i, replaceTagsAndSpaces);
	getParam(html, result, 'cardbalance', />([^<]*)(?:<[^<]*){3}баланс карты/i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}