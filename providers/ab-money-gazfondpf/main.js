/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
	'Accept-Language': 	'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lk.gazfond-pn.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'lk-ops/index.php', g_headers);

	if (!html || (AnyBalance.getLastStatusCode() > 400 && AnyBalance.getLastStatusCode() != 403)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var form = getElement(html, /<form[^>]+form_auth[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}

	var params = AB.createFormParams(html, function(params, str, name, value) {
		if (name == 'USER_LOGIN') {
			return prefs.login;
		} else if (name == 'USER_PASSWORD') {
			return prefs.password;
		}

		return value;
	});
	params['check'] = 'on';

	html = AnyBalance.requestPost(baseurl + 'index.php?login=yes', params, addHeaders({
		Referer: baseurl
	}));


	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<font[^>]+class="errortext"[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces);
		if(error)
			throw new AnyBalance.Error(error, null, /Неверный СНИЛС или пароль/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};
    getParam(html, result, 'balance', /<div[^>]*price left[^>]*>[\s\S]*?<div[^>]+prc[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('dogovor','datestart')){
        html = AnyBalance.requestGet(baseurl + 'lk-ops/', g_headers);

        getParam(html, result, 'dogovor', /номер договора[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        getParam(html, result, 'datestart', /Дата заключения[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
    }

	AnyBalance.setResult(result);
}