
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
Фонд модернизации ЖКХ – Регионального оператора капитального ремонта общего имущества многоквартирных домов, расположенных на территории Новосибирской области.
*/

var g_headers = { 
	'Accept': 'application/json, text/plain, */*',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.103 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://kabinet.fondgkh-nso.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	//AnyBalance.setAuthentication не работает, потому что сервер не возвращает заголовок WWW-Authenticate
	//поэтому устанавливаем заголовок авторизации явно
	g_headers.Authorization = 'Basic ' + Base64.encode(prefs.login + ':' + prefs.password);

	html = AnyBalance.requestGet(baseurl + 'api/auth', AB.addHeaders({
		Referer: baseurl
	}));

	var json = AB.getJson(html);

	if (!json.name) {
		var errorMsg = 'Логин или пароль введены ошибочно.';
		if (json.error == 'Unauthorized' && json.message == 'Bad credentials') {
			throw new AnyBalance.Error(errorMsg, null, true);
		}

		if (json.error !== '') {
			throw new AnyBalance.Error(json.error + ' ' + json.message);
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	html = AnyBalance.requestGet(baseurl + 'api/user/addresses', g_headers);
	json = AB.getJson(html);

	var name = json[0].account.subscriber;

	AB.getParam(name.lastName + ' ' + name.firstName + ' ' + name.middleName, result, 'name');
	AB.getParam(json[0].account.number, result, 'personalAccountNumber');
	AB.getParam(json[0].street + ', ' + 'дом: ' + json[0].buildingNumber + ', квартира: ' + json[0].flatNumber + ', ' +
		json[0].city + ', ' + json[0].region, result, 'address');
	AB.getParam(json[0].account.saldo.value, result, 'saldo');
	AB.getParam(json[0].account.saldo.penalty, result, 'penalty');

	AnyBalance.setResult(result);
}
