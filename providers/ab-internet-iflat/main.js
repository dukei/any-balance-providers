/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept':           'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Charset':   'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':  'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection':       'keep-alive',
    'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.110 Safari/537.36'
};

function parseTrafficGb(str) {
	var val = parseBalance(str);
	if (isset(val)) 
		return Math.round(val / 1024 * 100) / 100;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	if (prefs.type == 'new') {
        doNew(prefs);
    } else {
        doOld(prefs);
    }
}

function doNew(prefs) {
    AnyBalance.setDefaultCharset('UTF-8');
	
    var baseurl = "http://lk.iflat.ru/";
	
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	function getToken(html) {
		var token = getParam(html, null, null, /"authenticity_token"[^>]*value="([^"]+)"/i);
		checkEmpty(token, 'Не удалось найти токен авторизации, сайт изменен?', true);
		return token;
	}	
	
    html = AnyBalance.requestPost(baseurl + 'login', {
		'utf8':'✓',
		'authenticity_token':getToken(html),
		'user[login]':prefs.login,
		'user[password]':prefs.password,
		'commit':'Войти'
    });
	
	var user = getParam(html, null, null, /HupoApp\(({[\s\S]*?), \{logLevel: "info"\}\);/i);
	var userJson = getJsonEval(user);
	
	if (!/new HupoApp/i.test(html)) {
		var error = getParam(html, null, null, /"error_container"[^>]*>([^<]+)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var data = userJson.data.personal_accounts[0];
	checkEmpty(data, 'Не удалось найти пользователя, сайт изменен?', true);
	
    var result = {success: true};
	
    getParam(data.n_sum_bal+'', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(data.vc_account+'', result, 'licschet', null, replaceTagsAndSpaces);
    getParam(userJson.data.servs[0].vc_name+'', result, '__tariff', null, replaceTagsAndSpaces);
	
    AnyBalance.setResult(result);	
}

function doOld(prefs) {
    AnyBalance.setDefaultCharset('UTF-8');

    var baseurl = "http://91.224.206.6/";

    var html = AnyBalance.requestPost(baseurl, {
        login:prefs.login,
        password:prefs.password,
    });

    if(!/logout/i.test(html)){
        var error = getParam(html, null, null, /<p[^>]+red[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /Неверно указаны логин или пароль/i.test(error));

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /Основной лицевой счет(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'credit', /Кредит(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'nds', /НДС(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /Состояние интернета(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);

    var tariffHREF = getParam(html, null, null, /<a[^>]+href='\/([^']*)[^>]*>Тарифы/i);
    if(!tariffHREF) {
        AnyBalance.trace(html);
        AnyBalance.trace("Не удалось найти ссылку на тарифы.");
    } else {
        html = AnyBalance.requestGet(baseurl + tariffHREF, g_headers);
        getParam(html, result, '__tariff', /текущий ТП(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    }

	AnyBalance.setResult(result);
}