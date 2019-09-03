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
	var baseurl = 'https://www.ottclub.cc/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');

	var captcha = solveRecaptcha('Пожалуйста, докажите, что вы не робот', AnyBalance.getLastUrl(), JSON.stringify({SITEKEY: '6Lcdm6IUAAAAALPR2q8slgO3qVh8v68vjWrhpHma', TYPE: 'V3', ACTION: 'logform'}));
	
	html = AnyBalance.requestPost(baseurl + 'auth/login', {
		email: prefs.login,
		password: prefs.password,
		capcha: captcha,
	}, addHeaders({Referer: baseurl, 'X-Requested-With': 'XMLHttpRequest'}));
    
    var json = getJson(html);
	if (json.status !== 'success') {
		var error = json.message;
		if (error)
			throw new AnyBalance.Error(error, null, /не существует|парол/i.test(html));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};

	html = AnyBalance.requestGet(baseurl + 'setting/data_user?_=' + new Date().getTime(), addHeaders({Referer: baseurl}));
	var json = getJson(html);
	
	getParam(json.ref_balance, result, 'partnerBalance', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.balance, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.plan, result, '__tariff', /Тарифный план:([\s\S]*)/i, replaceTagsAndSpaces);
	getParam(json.ottkey, result, 'key', null, replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}