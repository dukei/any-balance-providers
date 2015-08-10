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
	var baseurl = 'http://www.cravt.by/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'ru', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	var formId = getParam(html, null, null, /"form_build_id"[^>]*value="([^"]+)/i);
	checkEmpty(formId, 'Не удалось найти форму входа, сайт изменен?', true);

	html = AnyBalance.requestPost(baseurl + 'themes/kvart/ajax.php', {
		name: prefs.login,
		pass: prefs.password,
		'act': 'enter'
	}, addHeaders({Referer: baseurl + 'ru'}));
	
	html = AnyBalance.requestPost(baseurl + 'user', {
		name: prefs.login,
		pass: prefs.password,
		'form_build_id': formId,
		'form_id': 'user_login',
	}, addHeaders({Referer: baseurl}));	
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'user/', g_headers);
	
	var card = getParam(html, null, null, /Номер дисконтной карты:<\/p>(?:[^>]*>){10,}\s*<p[^>]*number[^>]*>([\d\s]+)/i);
	checkEmpty(formId, 'Не удалось найти номер карты, сайт изменен?', true);
	
	html = AnyBalance.requestPost(baseurl + 'themes/kvart/ajax.php', {
		act: 'checkCard',
		card_num: card
	}, addHeaders({Referer: baseurl + 'ru'}));
	
	var json = getJson(html);
	
	var result = {success: true};
	
	getParam(json.sum + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.discount + '', result, 'discount', null, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}