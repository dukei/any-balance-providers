
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Accept-Encoding':  'gzip, deflate, sdch, br',
	'Connection': 		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.186 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://loyalty.azs.a-100.by/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'ru/login', g_headers);
	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	//AnyBalance.setCookie('loyalty.azs.a100.by', '_gat', '1');

	var params = {
		number: prefs.login,
		password: prefs.password
	};

	//AnyBalance.sleep(3000);

	{
		html = AnyBalance.requestPost(baseurl + 'api/v1/auth/login', JSON.stringify(params), AB.addHeaders({
			Referer: baseurl + 'ru/login',
			'Accept': 'application/json, text/plain, */*',
			'X-XSRF-TOKEN': decodeURIComponent(AnyBalance.getCookie('XSRF-TOKEN')),
			'Origin': 'https://loyalty.azs.a-100.by',
			'Content-Type': 'application/json;charset=UTF-8',
			'Accept-Encoding': 'gzip, deflate, br'
		}));

		var json = getJson(html);
	}

	if (json.error) {
		var error = json.response.message;
		if (error) {
			throw new AnyBalance.Error(error, null, /парол|неверно/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	if(json.response && json.response.data) {
		var info = json.response.data;
		var card_statuses = {
			'1': 'Базовый',
			'2': 'Серебряный',
			'3': 'Золотой'
		};

		AB.getParam((info.CurrentAccumulative/10000), 			 result, 'balance');
		AB.getParam(card_statuses[info.Card_CardStatusID], 		 result, 'status');
		AB.getParam(info.HigherStatusNeedAccumulativeSumma + '', result, 'next_status', null, null, AB.parseBalance);
		AB.getParam(info.Card_AnketaDateTime, 					 result, 'date_start',  null, null, AB.parseDate);
	}

	AnyBalance.setResult(result);
}
