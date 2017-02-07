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

	var add_headers = {
		'Content-Type': 'application/json;charset=UTF-8',
		'Accept': 'application/json;version=1.0',
		'X-Requested-With': 'XMLHttpRequest',
		Referer: baseurl+'login/',
		Origin: 'https://account.forex4you.org',
		'X-XSRF-TOKEN': XSRF_value
	};

	html = AnyBalance.requestPost(baseurl + 'authentication', JSON.stringify({
		username: prefs.login,
		password: prefs.password
	}), addHeaders(add_headers));

	var json = getJson(html);
	if (!json.token) {
		var error = json.message;
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl+'trader-account/dashboard/', g_headers);

	var accounts = AnyBalance.requestGet(baseurl + 'config/accounts.js', addHeaders(add_headers));
	var curaccid = getParam(accounts, null, null, /FxAccountManagerProvider\.\$currentAccountId\s*=\s*(\d+)/);

	accounts = getJsonObject(accounts, /FxAccountManagerProvider\.\$initialData\s*=/i);

	if(prefs.digits || curaccid) {
		for(var i=0; i<accounts.length; ++i){
			var a = accounts[i];
			if(prefs.digits){
				if(endsWith('' + a.user_account_id, prefs.digits)){
					account = a;
					break;
				}
			}else if(curaccid){
				if(endsWith('' + a.id, curaccid)){
					account = a;
					break;
				}
			}
		}
		
		if(i >= accounts.length){
			throw new AnyBalance.Error("Не удалось найти ссылку на счёт с последними цифрами '" + prefs.digits + "'");
		}

		if(account.id != curaccid){
			html = AnyBalance.requestPost(baseurl + 'trader-account/account/' + account.id + '/set-active', '', addHeaders(add_headers));
			html = AnyBalance.requestGet(baseurl+'trader-account/start', g_headers);
		};
	}

	var result = {success: true};
	//getParam(html, result, 'cred', /Кредитные Бонусы(?:[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(account.currency, result, ['currency', 'balance', '']);
	getParam(account.trade_server.terminal_title + account.trade_server.server_suffix, result, 'server');
	getParam('' + account.user_account_id, result, 'account');
	getParam(account.leverage.leverage, result, 'arm');
	getParam(html, result, 'fio', /<a[^>]+user-profile(?:[^>]*>){2}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);

	if(AnyBalance.isAvailable('balance', 'cred')){
		html = AnyBalance.requestGet(baseurl + 'trader-account/account/' + account.id + '/details?filter%5B%5D=Balance&filter%5B%5D=Bonus', addHeaders(add_headers));
		getParam(getJson(html).balance, result, 'balance', null, null, parseBalance);
	}
	
	AnyBalance.setResult(result);
}