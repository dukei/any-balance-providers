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
	var baseurl = 'https://client.gazfond-pn.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + '', g_headers);

	if (!html || (AnyBalance.getLastStatusCode() > 400 && AnyBalance.getLastStatusCode() != 403)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var form = getElement(html, /<form[^>]+login-form[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}

	var params = AB.createFormParams(html, function(params, str, name, value) {
		if (name == 'login') {
			return prefs.login;
		} else if (name == 'password') {
			return prefs.password;
		}

		return value;
	});

	
	html = AnyBalance.requestPost(baseurl + '', params, addHeaders({Referer: baseurl + ''}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<span[^>]+form-group-warning[^>]*>((?:[\s\S](?!<\/span>))*?[\s\S]<\/span>){2}\s*<!--\s*Button\s*-->/i, replaceTagsAndSpaces);
		if(error)
			throw new AnyBalance.Error(error, null, /не зарегистрирован|парол/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};
	
	getParam(html, result, 'balance', /<p[^>]+contract-slider-item-sum[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /<a[^>]+link-settings[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
	getParam(html, result, 'dogovor', /<div[^>]*contract-slider-item-ico[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}