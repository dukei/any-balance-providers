/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Cache-Control':'max-age=0',
    'Accept-Encoding':null, //Че-то какой-то битый стрим она получает, ошибка EOFException вываливается. Отменяем сжатие
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.95 Safari/537.36',
	'X-Requested-With':'XMLHttpRequest',
	Referer:'https://pay.khclub.ru/personal/pub/Entrance'
};

function main(){
    var prefs = AnyBalance.getPreferences();
	if(prefs.cabinet == 'new')
		doNewCabinet(prefs);
	else /*if(prefs.cabinet == 'old')*/
		doOldCabinet(prefs);
}

function doNewCabinet(prefs){
	var baseurl = 'https://pay.khclub.ru/';
	var html = AnyBalance.requestGet(baseurl + 'personal/pub/Entrance', g_headers);
	// Это форма где нужно ввести только номер карты, затем ставится кука и можно уже вводить логин и пароль
	var loginForm = getParam(html, null, null, /<form[^>]*>(?!<form[^>]*>)[\s\S]*?b-form-login[\s\S]*?<\/form>/i);
	if(!loginForm)
		throw new AnyBalance.Error("Не удалось найти форму входа, сайт изменен?");
		
	var loginFormSubmit = getParam(loginForm, null, null, /<form[^>]*data-validator-ajax-url="\.\.([\s\S]*?)"/i);

	var params = createFormParams(loginForm, function(params, str, name, value){
		if(name == 'ean')
			return prefs.login;
		else if(name == 'password')
			return prefs.password;
		return value;
	});
	// в итоге должны запрашивать нечто https://pay.i-on.ru/personal/;jsessionid=51927EFF6F83933EE13B1AD5B3B9330B?wicket:interface=:0:loginForm::IBehaviorListener:0:1
    html = AnyBalance.requestPost(baseurl + 'personal' + loginFormSubmit, params, g_headers);
    AnyBalance.sleep(1000);
	// Какой ?#*$%#**%%! делал этот кабинет?! Два Post запроса подряд с одинаковой date, чтобы убедится что мы не роботы? :)
	html = AnyBalance.requestPost(baseurl + 'personal' + loginFormSubmit, params, g_headers);
	
	var json = getJson(html);
	
    if(!json.validated || !json.form){
        var error = getParam(html, null, null, /<div[^>]+class="validation-summary-errors"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Проверьте номер карты и пароль.");
    }

	html = AnyBalance.requestGet(json.form.redirectUrl, g_headers);
	
    var result = {success: true};
    getParam(html, result, 'balance', /personal\/history[^>]*>\s*<span[^>]*b-user-info__balance[^>]*>([\s\S]*?)</i, null, parseBalance);
	getParam(html, result, 'bonuses', /bonus-statement[^>]*>\s*<span[^>]*b-user-info__balance[^>]*>([\s\S]*?)</i, null, parseBalance);
	result.__tariff = prefs.login;

    AnyBalance.setResult(result);
}

function doOldCabinet(prefs) {
	var baseurl = 'http://i-on.ru/';
    var html = AnyBalance.requestPost(baseurl + 'crm/logon', {
        number:prefs.login,
        password:prefs.password,
        remember:false
    }, g_headers);

    if(!/\/crm\/logoff/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="validation-summary-errors"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Проверьте номер карты и пароль.");
    }

    var result = {success: true};
   
    getParam(html, result, 'balance', /Сейчас на вашей карте:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
//    getParam(html, result, 'new', /Будут скоро активированы ещё[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'total', /Всего было накоплено:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
//    getParam(html, result, 'off', /Всего было потрачено[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}