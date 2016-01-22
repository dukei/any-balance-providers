/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.111 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://my.epayments.com/';
	var baseAPI = 'https://api.epayments.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseAPI+'token', {
		'grant_type': 'password_otp',
		username: prefs.login,
		password: prefs.password,
		'otpcode': ''
	}, AB.addHeaders({
		Referer: baseurl,
		'Content-Type': 'application/x-www-form-urlencoded',
		'Authorization': 'Basic ZXBheW1lbnRzOm1ZbjZocmtnMElMcXJ0SXA4S1NE'
	}));

	var json = getJson(html);
	if (!json.access_token) {
		var error = json.error_description;
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseAPI+'v1/user/', AB.addHeaders({
		Authorization: json.token_type + ' ' + json.access_token,
		'Content-type': 'application/json'
	}));
	var result = {success: true};

	json = getJson(html);
	if(json.ewallets[0] && json.ewallets[0].balances) {

		AnyBalance.trace("Найдено счётов по кошельку " +(json.ewallets[0].ePid || '')+ ": "+json.ewallets[0].balances.length);
		AB.getParam(json.ewallets[0].ePid || undefined, result, 'ePid');

		for(var i=0; i<json.ewallets[0].balances.length; i++) {

			var counter_name = null;

			if(json.ewallets[0].balances[i].currency == 'usd')
				counter_name = 'e_wal_USD';
			else if(json.ewallets[0].balances[i].currency == 'eur')
				counter_name = 'e_wal_EUR';

			if(!counter_name)
				AnyBalance.trace("Неизвестная опция: "+ json.ewallets[0].balances[i].currency);
			else
				AB.getParam(json.ewallets[0].balances[i].currentBalance, result, counter_name);

		}
	}
	else AnyBalance.trace("Не смогли найти открытые счета по электронному кошельку");
	
	AnyBalance.setResult(result);
}