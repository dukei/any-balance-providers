
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
	var baseurl = 'https://lk.lovit.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	var form = AB.getElement(html, /<form[^>]+auth_form/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'login') {
			return prefs.login;
		} else if (name == 'password') {
			return prefs.password;
		}

		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'login', params, AB.addHeaders({
		Referer: baseurl + 'login'
	}));

	if (!/react-root/i.test(html)) {
		AnyBalance.trace(html);
		if(!/pass-field/i.test(html))
			throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неправильный логин или пароль?');

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	html = AnyBalance.requestGet(baseurl + 'api/user/info', addHeaders({Referer: baseurl}));
	var json = getJson(html);
	if(json.status !== 'ok'){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить информацию о балансе');
	}
		

	AB.getParam(json.data.balance, result, 'balance');
	AB.getParam(+json.data.days_to_off, result, 'days_to_off');
	AB.getParam(json.data.forecast_payment, result, 'abon');
	AB.getParam(json.data.tariff_name, result, '__tariff');
	AB.getParam(json.data.acc_status ? 'Активный' : 'Приостановлен', result, 'status');
	AB.getParam(prefs.login, result, 'agreement');

	AnyBalance.setResult(result);
}
