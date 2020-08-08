
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
	var baseurl = 'https://my.danycom.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите телефон!');
	AB.checkEmpty(/^\d{10}$/i.test(prefs.login), 'Введите 10 цифр телефона без пробелов и разделителей. Например, 9010123456.');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	var phoneFormatted = prefs.login.replace(/(\d{3})(\d{3})(\d\d)(\d\d)/, '+7($1)$2-$3-$4');

	var html = AnyBalance.requestGet(baseurl + 'User/SignIn', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'User/SignIn', {
		phone: phoneFormatted,
		password: prefs.password,
		email: ''
	}, AB.addHeaders({
		Referer: baseurl + 'User/SignIn',
		'X-Requested-With': 'XMLHttpRequest'
	}));

	if (!/^ey/.test(html)) { //Должен быть JSON token
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Неправильный логин-пароль?');
	}

	var result = {
		success: true
	};

	html = AnyBalance.requestGet(baseurl + 'User/GetCurrentTariff/', addHeaders({
		Referer: baseurl,
		'X-Requested-With': 'XMLHttpRequest'
	}));

	var json = getJson(getJson(html));
	AnyBalance.trace(JSON.stringify(json));

	getParam(json.Name, result, '__tariff');

	html = AnyBalance.requestGet(baseurl + 'User/GetRestTraffic/', addHeaders({
		Referer: baseurl,
		'X-Requested-With': 'XMLHttpRequest'
	}));

	json = getJson(getJson(html));
	AnyBalance.trace(JSON.stringify(json));

	getParam(phoneFormatted, result, 'phone');
	getParam(json.Money, result, 'balance');
	getParam(json.CallBalance, result, 'min');
	getParam(json.SmsBalance, result, 'sms');
	getParam(json.InternetBalance, result, 'internet');
	getParam(json.EndPeriodLocal, result, 'till', null, null, parseDate);

	AnyBalance.setResult(result);
}
