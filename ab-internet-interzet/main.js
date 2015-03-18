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
    var baseurl = 'http://bill.interzet.ru/';
    AnyBalance.setDefaultCharset('cp1251'); 

    checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'welcome/login', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
    
	html = AnyBalance.requestPost(baseurl + 'welcome/login', {
        login:prefs.login,
        passwd:prefs.password,
        errors:''
    }, addHeaders({Referer: baseurl + 'login'})); 

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /font color=["']red["']>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));

		error = getParam(html, null, null, /На данный момент производится модернизация Личного кабинета/i);
		if (error)
			throw new AnyBalance.Error(error);		

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'w3_first/account', g_headers);

    var result = {success: true};
	
    getParam(html, result, 'balance', /Баланс:([\s\S]*?)руб/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus', /Бонусные очки:[\s\S]*?">\s*([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'acsess', /Доступ в интернет:[^>]*>\s*[^>]*>[^>]*"internet_state">\s*([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /Состояние счета:[^>]*>\s*[^>]*>[^>]*">\s*([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}