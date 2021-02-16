
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
	var baseurl = 'https://fix-price.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

//	var grc_response = solveRecaptcha('Пожалуйста, подтвердите, что вы не робот', baseurl, '6LcxEwkUAAAAAHluJu_MhGMLI2hbzWPNAATYetWH');
	var html = AnyBalance.requestGet(baseurl + 'personal/', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
                AnyBalance.requestGet(baseurl + 'personal/?logout=yes', g_headers);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	if (!/logout/i.test(html)){
		AnyBalance.trace('Нужно логинится');
		var token=getParam(html,  /CSRF"[\s\S]*?"([^"]*)/i, replaceTagsAndSpaces);
		html = AnyBalance.requestPost(baseurl + 'ajax/auth_user.php', {
			AUTH_FORM:	'Y',
			TYPE:		'AUTH',
			backurl:	'/personal/',
			login: prefs.login,
			password: prefs.password,
	                auth_method: 'email',
	                CSRF:token
		}, AB.addHeaders({
			'X-Requested-With': 'XMLHttpRequest',
			Accept: 'application/json, text/javascript, */*; q=0.01',
			Referer: baseurl + 'bonus'
		}), {HTTP_METHOD: 'POST'});

		var json = AB.getJson(html);

		if (!json.res) {
			var error = json.mess;
			if (error) {
				AnyBalance.requestGet(baseurl + 'personal/?logout=yes', g_headers);
				throw new AnyBalance.Error(error, null, /парол/i.test(error));
			}
			AnyBalance.trace(html);
			AnyBalance.requestGet(baseurl + 'personal/?logout=yes', g_headers);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
		html = AnyBalance.requestGet(baseurl + 'personal/', addHeaders({Referer: baseurl}));
	}
	var result = {
		success: true
	};



	getParam(html, result, 'fio', /<div[^>]+client-name[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /<div[^>]+client-points__active[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance_inactive', /<span[^>]+inactive-points[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	AB.getParam(html, result, 'card', /<div[^>]+personal-card__number[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);

}
