/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://backly.ru';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + '/?with_login_form=true', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var csrf = getParam(html, null, null, /<meta[^>]+name="csrf-token"[^>]*content="([^"]*)/i, null, html_entity_decode);

	html = AnyBalance.requestPost(baseurl + '/users/sign_in', {
		utf8:	'✓',
		'user[email]':	prefs.login,
		'user[password]':	prefs.password,
		'user[remember_me]':	'0',
		commit:	'Войти'
	}, addHeaders({Referer: baseurl + '/?with_login_form=true', 'X-CSRF-Token': csrf, 'X-Requested-With': 'XMLHttpRequest'}));
	
	if (!/redirect_url":"/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="alert"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный пароль или email/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

//	var redirect = getParam(html, null, null, /redirect_url":"([^"]*)/i, replaceSlashes);
	html = AnyBalance.requestGet(baseurl + '/profile/new_cashback', g_headers);

	if (!/sign_out/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось перейти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};
	
	sumParam(html, result, 'balance', /<div[^>]+class=['"]total\b[^>]*>([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'count', /<div[^>]+class=['"]orders-count\b[^>]*>([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	getParam(html, result, 'got', /<span[^>]+class='name'[^>]*>\s*Получено\s*[\s\S]*?<span[^>]+class='count'[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'got4friends', /<span[^>]+class='name'[^>]*>\s*Кешбэк за друзей\s*[\s\S]*?<span[^>]+class='count'[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'friends', /<span[^>]+class='name'[^>]*>\s*Все друзья\s*[\s\S]*?<span[^>]+class='count'[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /<div[^>]+class='personal'[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}