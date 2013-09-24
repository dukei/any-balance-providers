/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'application/json, text/javascript, */*; q=0.01',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'X-Requested-With':'XMLHttpRequest',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.korablik.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	if(!prefs.login)
		throw new AnyBalance.Error('Введите логин!');
	if(!prefs.password)
		throw new AnyBalance.Error('Введите пароль!');
		
	//var html = AnyBalance.requestGet(baseurl + 'auth/login', g_headers);
	
	var html = AnyBalance.requestPost(baseurl + 'auth/login', {
        login:prefs.login,
        pass:prefs.password,
    }, addHeaders({Referer: baseurl + 'auth/login'}));
	
	if(html != '1') {
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	html = AnyBalance.requestGet(baseurl + 'bk/check_user', g_headers);
	
    var result = {
		success: true,
		balance: parseBalance(html)
	};

    AnyBalance.setResult(result);
}