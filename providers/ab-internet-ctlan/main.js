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
	var baseurl = 'http://bill.ctlan.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login.xhtml', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var hiddenParam = getParam(html, null, null, /"j_id1:javax.faces.ViewState:0"\s+?value="([^"]+)/i, replaceTagsAndSpaces, html_entity_decode);;
	
	html = AnyBalance.requestPost(baseurl + 'login.xhtml', {
		'login-form': 'login-form',
		'j_username': prefs.login,
		'j_password': prefs.password,
		'javax.faces.ViewState': hiddenParam,
		'login_button': 'login_button'
	}, addHeaders({Referer: baseurl + 'login'}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="alert alert-danger"[^>]*>[\s\S]*?<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неправильный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс[^<]+/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /Баланс[^<]+/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'status', /Статус:([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /Абонент(?:[\s\S](?!<span class="bold">))+[\s\S]<span class="bold">([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}