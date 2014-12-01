/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

var g_errors = {
	invalidLogin: 'Неверный логин!',
	invalidPassword: 'Неверный пароль!'
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://ostin.com/ru/ru/';
	
    AnyBalance.setDefaultCharset('utf-8'); 
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestPost(baseurl + 'secured/myaccount/login.jsp?login=', {redirect:'',requestForLogin:true}, addHeaders({Referer: baseurl, 'X-Requested-With':'XMLHttpRequest'}));	
	
	if(AnyBalance.getLastStatusCode() > 400 || !html) {
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	}
	
	var form = getParam(html, null, null, /<form class="login_popup-form[\s\S]*?<\/form>/i);
	if(!form) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа, сайт изменен?');
	}
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'atg_store_registerLoginEmailAddress') 
			return prefs.login;
		else if (name == 'atg_store_registerLoginPassword')
			return prefs.password;
			
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'global/json/loginErrors.jsp', params, addHeaders({Referer: baseurl, 'X-Requested-With':'XMLHttpRequest'}));
	
	var json = getJson(html);
	
	if (json.errors.length > 0) {
		var error = '';
		for(var i = 0; i < json.errors.length; i++) {
			var curr = json.errors[i];
			error += g_errors[curr] + ' ';
		}
		
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'secured/myaccount/myAccountMain.jsp?selpage=CLUBCARD', g_headers);
	
	var result = {success: true};
	
    getParam(html, result, 'balance', />\s*Баланс бонусного счета[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'total', />\s*Оборот[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'next_level', />\s*До следующего уровня[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}
