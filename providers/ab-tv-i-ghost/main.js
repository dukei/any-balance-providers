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
	var baseurl = 'https://www.i-ghost.biz/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestPost(baseurl + 'auth/auth_login', {
		login: prefs.login,
		password: prefs.password
	}, addHeaders({Referer: baseurl + 'login'}));

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	if (html !== "true") {
		var error = html;
		AnyBalance.trace(html);
		throw new AnyBalance.Error(error, null, /Ошибка авторизации/i.test(error));
	}

	var result = {success: true};

	html = AnyBalance.requestGet(baseurl + 'setting/balance?_=' + new Date().getTime(), AB.addHeaders({'X-Requested-With':'XMLHttpRequest', Referer: baseurl}));

	AB.getParam(html, result, 'balance', /Ваш Баланс:(.*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	// html = AnyBalance.requestGet(baseurl + 'packet/show?_=' + new Date().getTime(), addHeaders({'X-Requested-With':'XMLHttpRequest', Referer: baseurl}));
	// 	AnyBalance.trace(html);
	// getParam(html, result, '__tariff', /<h4[^>]*>([\s\S]*?)<\/h4>/i, replaceTagsAndSpaces, html_entity_decode);
	// getParam(html, result, 'daysleft', /<b[^>]+title="До [^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
	// getParam(html, result, 'till', /<b[^>]+title="До ([^"]*)/i, replaceTagsAndSpaces, parseDateISO);

	AnyBalance.setResult(result);
}
