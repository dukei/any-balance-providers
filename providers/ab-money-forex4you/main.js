/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.112 Safari/537.36',
};

function main() {
	var prefs 	= AnyBalance.getPreferences();
	var baseurl = 'https://account.forex4you.org/ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login/', g_headers);

	if(AnyBalance.getLastStatusCode() > 400 || !html) {
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	}

	var cookies = AnyBalance.getCookies();

	for(var i = 0; i<cookies.length; i++) {
		if(cookies[i].name == "XSRF-TOKEN") {
			var XSRF_value = cookies[i].value;
			AnyBalance.trace("Нашли токен.");
			break;
		}
	}

	if(!XSRF_value) {
		throw new AnyBalance.Error("Не удалось найти XSRF токен.");
	}

	html = AnyBalance.requestPost(baseurl + 'authentication', JSON.stringify({
		username: prefs.login,
		password: prefs.password
	}), addHeaders({
		'Content-Type': 'application/json;charset=UTF-8',
		'Accept': 'application/json;version=1.0',
		'X-Requested-With': 'XMLHttpRequest',
		Referer: baseurl+'login/',
		Origin: 'https://account.forex4you.org',
		'X-XSRF-TOKEN': XSRF_value

	}));

	var json = getJson(html);
	if (!json.token) {
		var error = json.message;
		if (error)
			throw new AnyBalance.Error(error, null, /Имя пользователя или пароль введены неверно/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl+'trader-account/start', g_headers);

	if(prefs.digits) {
		var re 		= new RegExp('<a[^>]+id="acc-\\d*' + prefs.digits + '"[^>]+href="([^"]*)', 'i');
		var account = getParam(html, null, null, re, replaceTagsAndSpaces);
		if(!account) {
			throw new AnyBalance.Error("Не удалось найти ссылку на счёт с последними цифрами '" + prefs.digits + "'");
		}

		html = AnyBalance.requestGet(account, addHeaders({
			'Referer': baseurl + 'trader-account/start'
		}))
	}

	var result = {success: true};
	getParam(html, result, 'balance', /<span[^>]+account-balance[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	//getParam(html, result, 'cred', /Кредитные Бонусы(?:[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance', 'cred'], /<span[^>]+account-balance[^>]*>([\s\S]*?)<\/a>/i, [replaceTagsAndSpaces, /\s*центов\s*/i, ''], parseCurrency);
	getParam(html, result, 'server', /<span[^>]+account-terminal[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'account', /<option[^>]+id="acc-(\d+)"[^>]+selected[^>]*>/i, replaceTagsAndSpaces);
	getParam(html, result, 'arm', /<li[^>]+account-leverage[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces);
	getParam(html, result, 'fio', /<a[^>]+user-profile(?:[^>]*>){2}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}