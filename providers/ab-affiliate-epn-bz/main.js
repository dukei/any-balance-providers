
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':           'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':  'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':       'keep-alive',
	'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
};

var g_headersApi = {
	'Accept':           'application/json, text/plain, */*',
	'Accept-Language':  'ru,en-US;q=0.9,en;q=0.8,ru-RU;q=0.7',
	Referer: 'https://epn.bz/app-auth/ru/auth/user',
	'X-API-VERSION': '2',
	Origin: 'https://epn.bz',
	'Connection':       'keep-alive',
	'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://epn.bz/ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet('https://oauth2.epn.bz/ssid?client_id=web-client', g_headersApi);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var json = getJson(html);
	var ssid = json.data.attributes.ssid_token;

	html = AnyBalance.requestPost('https://oauth2.epn.bz/token', JSON.stringify({
	    "ssid_token": ssid,
    	"grant_type": "password",
    	"username": prefs.login,
    	"password": prefs.password,
    	"check_ip": false,
    	"client_id": "web-client",
    	"client_secret": "60cfb46215e4058f39e69c1f4a103e4c"
	}), addHeaders({
		'Content-Type': 'application/json;charset=UTF-8'
	}, g_headersApi));

	var json = getJson(html);
	if(!json.result){
		var error = (json.errors || []).map(function(e) { return e.error_description }).join('\n');
		if(error)
			throw new AnyBalance.Error(error, null, /password|парол/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

  if(isAvailable(['balance', 'balance_hold'])) {
    html = AnyBalance.requestGet(baseurl + 'profile/get-balance', addHeaders({
      'X-Requested-With': 'XMLHttpRequest',
      Referer: baseurl + 'cabinet/'
    }));

    var json = getJson(html);
    getParam(json.balance + '',      result, 'balance',      null, null, parseBalance);
    getParam(json.balance_hold + '', result, 'balance_hold', null, null, parseBalance);

  }

	AnyBalance.setResult(result);
}
