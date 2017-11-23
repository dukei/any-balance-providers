/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'Origin': 'https://my.cleverbonus.ua',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.115 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://my.cleverbonus.ua/';
	var html, res, json, result;
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var form = getElement(html, /<form[^>]+login_check/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == '_username') {
			return prefs.login;
		} else if (name == '_password') {
			return prefs.password;
		}

		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'login_check', params), addHeaders({
		Referer: baseurl + 'login/'
	});

	if(!/logout/i.test(html)){
		var error = getElement(html, /<[^>]+color:\s*red/i, replaceTagsAndSpaces);
		if(error)
			throw new AnyBalance.Error(error, null, /невірні/i.test(error));
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};

	getParam(html, result, 'balance', /<div[^>]+active-points[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /Ви увійшли як:[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
	getParam(html, result, 'num', /<input[^>]+cardNumber[^>]+value="([^"]*)/i, replaceHtmlEntities);

	AnyBalance.setResult(result);
}