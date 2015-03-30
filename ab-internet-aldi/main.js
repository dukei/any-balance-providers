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
	var baseurl = 'https://prepaidkundenbetreuung.eplus.de/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'content/prepaid/cfi56baf7pgl63d4/de.html', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	res = AnyBalance.requestPost(baseurl + 'content/prepaid/cfi56baf7pgl63d4/de.login.htx', {
		uid: prefs.login,
		pwd: prefs.password,
		myaction: 'login',
		email_verification_code: ''
	}, addHeaders({
		Referer: baseurl + 'content/prepaid/cfi56baf7pgl63d4/de.html',
		'X-Requested-With': 'XMLHttpRequest'
	}));

	var json = getJson(res);

	if(json.errorMessage)
		throw new AnyBalance.Error(json.errorMessage, null, /Die Rufnummer ist unbekannt|Anmeldung nicht erfolgreich/i.test(json.errorMessage));

	var html = AnyBalance.requestGet(json.returnMessage, g_headers);
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /p[^>]*class="amount"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'phone', /p[^>]*class="custname"(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /div[^>]*class="tariff-title"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	sumParam(html, result, 'traff', /noch (\d+) verfügbar von \d+ MB/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	
	AnyBalance.setResult(result);
}