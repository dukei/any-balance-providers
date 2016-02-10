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
	var baseurl = 'http://ottclub.cc/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	var html = AnyBalance.requestGet(baseurl + 'auth/login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl + 'auth/login', {
		email: prefs.login,
		password: prefs.password
	}, addHeaders({Referer: baseurl, 'X-Requested-With': 'XMLHttpRequest'}));
    
	if (html != '1') {
		var error = getParam(html, null, null, /<h1>\s*АВТОРИЗАЦИЯ\s*<\/h1>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Ошибка авторизации/i.test(html));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    html = AnyBalance.requestGet(baseurl, g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'partnerBalance', /Статистика[\s\S]*?<tbody>[\s\S]*?<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'charged', /Статистика[\s\S]*?<tbody>[\s\S]*?(?:<td>[\s\S]*?<\/td>[\s\S]*?){3}<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'key', /Ваш ключ:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);

	if(isAvailable('balance')) {
		html = AnyBalance.requestGet(baseurl + 'setting/get_balance?_=' + new Date().getTime(), g_headers);
		getParam(html, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	}
	
	html = AnyBalance.requestPost(baseurl + 'setting/get_plan', {
		'showlist': 'plan'
	}, addHeaders({'Referer': baseurl, 'X-Requested-With': 'XMLHttpRequest'}));
	
	getParam(html, result, '__tariff', /<p>Тарифный план:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}