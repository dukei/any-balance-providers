
var g_headers = {
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Encoding':	'gzip, deflate',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
	'Cache-Control': 'max-age=0',
	Connection: 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:38.0) Gecko/20100101 Firefox/38.0'	
};

function main() {
	var baseurl = "https://lk.whyfly.ru/";
	var baseadd = 'auth/login?next=%252F';

	var prefs = AnyBalance.getPreferences();

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	prefs.login = prefs.login.substr(0, 2) == '+7' ? prefs.login.slice(-10) : prefs.login;
	if (prefs.login.length != 10) AB.checkEmpty(prefs.login, 'Укажите логин корректно: +71234567890');

	AnyBalance.setDefaultCharset('utf-8');

	var html = AnyBalance.requestGet(baseurl + baseadd, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 399) { 
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var xpid = AB.getParam(html, null, null, /xpid:"([^"]+)"/i);
	if (!xpid) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}

	var headers = {
		Accept: 'application/json, text/plain, */*',
		'X-NewRelic-ID': xpid,
		'Content-Type': 'application/json;charset=utf-8',
		Referer: baseurl + baseadd
	};

	html = AnyBalance.requestPost(baseurl + 'api/auth/login/', JSON.stringify({ phone: prefs.login, password: prefs.password }), AB.addHeaders(headers));
	var sesData = getJsonObject(html);
	if (!sesData || !sesData.auth_token) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось авторизоваться на сайте. Сайт изменен?');
	}

	headers.Authorization = "Bearer " + sesData.auth_token;
	headers.Referer = baseurl + '?next=%252F';

	var result = {success: true}, data;

	data = getJsonObject(AnyBalance.requestGet(baseurl + 'api/profile/phone/', headers));
	if (data && 'is_active' in data && AnyBalance.isAvailable('status')) result.status = data.is_active ? 'активен' : 'заблокирован';

	data = getJsonObject(AnyBalance.requestGet(baseurl + 'api/profile/balance/', headers));
	if (data && 'balance' in data && AnyBalance.isAvailable('balance')) result.balance = data.balance;

	data = getJsonObject(AnyBalance.requestGet(baseurl + 'api/tariff/current/', headers));
	if (data) {
		if (data.name) {
			result.__tariff = data.name;
			if (data.provider_name) result.__tariff += ' / ' + data.provider_name;
		}
		if (data.month_fee && AnyBalance.isAvailable('month_fee')) result.month_fee = data.month_fee;
	}

	var keys = {
		'mms и sms': 'sms', 'мобильный интернет': 'internet', 'местные вызовы': 'calls'
	};

	data = getJsonObject(AnyBalance.requestGet(baseurl + 'api/counters/', headers));
	if (data && data.length) {
		data.forEach(function (line) {
			var keyStr = line.description.toLowerCase();
			var key = keys[key];
			if (key) {
				if (!line.is_unlimited && line.counter_max && line.counter_val && AnyBalance.isAvailable(key)) {
					result[key] = line.counter_max - line.counter_val;
				}
			}
		});
	}

	AnyBalance.setResult(result);
}
