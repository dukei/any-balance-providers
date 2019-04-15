/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
	'Accept-Language':	'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection':		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
};

var g_errors = {
	invalidLogin: 'Неверный логин!',
	invalidPassword: 'Неверный пароль!'
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://ostin.com/';
	
    AnyBalance.setDefaultCharset('utf-8'); 
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
    var html = AnyBalance.requestPost(baseurl + 'ru/ru/secured/myaccount/login.jsp?requestForLogin=true&closeLink=/index.jsp&redirect=secured/myaccount/myAccountMain.jsp?selpage%3DMY%20PROFILE&_=' + new Date().getTime(), {redirect:'',requestForLogin:true}, addHeaders({Referer: baseurl, 'X-Requested-With':'XMLHttpRequest'}));

	if(AnyBalance.getLastStatusCode() > 400 || !html) {
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	}

    var form = getParam(html, null, null, /<form class="login_popup-form[\s\S]*?<\/form>/i);
    if(!form) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось найти форму входа, сайт изменен?');
    }

    var params = createFormParams(html, function(params, str, name, value) {
        if (name === 'atg_store_registerLoginEmailAddress')
            return prefs.login;
        else if (name === 'atg_store_registerLoginPassword')
            return prefs.password;

        return value;
    });

	html = AnyBalance.requestPost(baseurl + 'ru/ru/global/json/loginErrors.jsp', params, addHeaders({
		'Accept': 'application/json, text/javascript, */*; q=0.01',
		Referer: baseurl,
		'X-Requested-With':'XMLHttpRequest'
	}));
	
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

	html = AnyBalance.requestGet(baseurl + 'ru/ru/secured/myaccount/myAccountMain.jsp?selpage=CLUBCARD', addHeaders({
		Referer: baseurl
	}));

	var result = {success: true};
	
    getParam(html, result, 'balance', />\s*Баланс бонусного сч[её]та[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'total', />\s*Оборот[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'next_level', />\s*До следующего уровня[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'current_level', />\s*Уровень участия[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', />\s*Номер карты[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}
