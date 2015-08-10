/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.111 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://club.prostor.ua/account/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'signin/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var res = AnyBalance.requestPost(baseurl + 'auth/', {
		mobile_phone: prefs.login,
		password: prefs.password,
		remember: 0
	}, addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		'Referer': baseurl + 'signin/'
	}));

	var json = getJson(res),
		errors = [],
		isFatal;

	if(!json.ok && json.errors){
		errors = [];
		isFatal = 'mobile_phone' in json.errors;

		for(var i in json.errors)
			errors.push(json.errors[i]);

		throw new AnyBalance.Error(errors.join('. '), null, isFatal);
	}

	html = AnyBalance.requestGet(baseurl, addHeaders({Referer: baseurl + 'signin/'}));

	if(!/logout/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	getParam(html, result, 'wait', /(<td class="wait">[\s\S]*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance', /(<td class="active">[\s\S]*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'expire', /(<td class="expire">[\s\S]*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cardnum', /(Ваша картка [^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}