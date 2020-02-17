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
	var baseurl = 'https://sosedi.by/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'kupilka/personal/auth/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl + 'kupilka/personal/auth/', {
        kupilka: 'Y',
        backurl: '/kupilka/personal/auth/?t=auth',
        AUTH_FORM: 'Y',
        TYPE: 'AUTH',
        'USER_LOGIN': prefs.login,
        'USER_PASSWORD': prefs.password,
        Login: 'Войти'
	}, addHeaders({Referer: baseurl + 'kupilka/personal/auth/'}));
	
	var data = getParam(html, /data-component="LK"[^>]+data-initial='([^']*)/i, replaceHtmlEntities, getJson);

	if (!data.banner) {
		var error = getParam(html, null, null, /[^>]+class="errortext"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Неправильный логин/пароль?');
	}
	
	var result = {success: true};

	
	getParam(data.banner.cartScore, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(data.banner.cartNumber, result, 'card');
	getParam(data.banner.title, result, 'fio');
	getParam(switchStatusCart(data.banner.cartActive), result, 'status');
	
	AnyBalance.setResult(result);
}

function switchStatusCart(t, by) {
    switch (t) {
    case 0:
        return by ? "Актываваная" : "Активирована";
    case 1:
        return by,
        "Неактивирована";
    case 2:
        return by ? "Заблакаваная" : "Заблокирована";
    case 3:
        return by ? "У архіве" : "В архиве";
    default:
        return by ? "Статус нявызначаных" : "Статус неопределен"
    }
}
