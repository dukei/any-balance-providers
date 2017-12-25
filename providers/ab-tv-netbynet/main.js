/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://my.netbynet.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl + 'api/v2/login', JSON.stringify({
        "accountNumber": prefs.login,
        "password": prefs.password,
        "captchaCode":"",
        "save":true
    }), addHeaders({
		Referer: baseurl,
		'X-Requested-With': 'XMLHttpRequest',
		'Accept': 'application/json, text/javascript, */*; q=0.01',
		'Content-Type': 'application/json'
	}));

	var json = getJson(html);

	if (json.resultCode) {
		if(json.resultText) {
            throw new AnyBalance.Error(json.resultText, null, true);
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};

	json = getJson(AnyBalance.requestGet(baseurl + 'api/v1/get-balance', g_headers));
	getParam(json.accountBalance ? json.accountBalance + '': 0, result, 'balance', null, null, parseBalance);
    getParam(json.statusName ? json.statusName : '', result, 'status');

    json = getJson(AnyBalance.requestGet(baseurl + 'api/v1/get-profile-info'), g_headers);
    getParam(json.contacts.fullName ? json.contacts.fullName : '', result, 'fio');
    getParam((json.id ? json.id : prefs.login) + '', result, 'acc');

    json = getJson(AnyBalance.requestGet(baseurl + 'api/v1/get-internet-accounts-details'), g_headers);
    getParam(json.internetAccounts[0].tariffPlan.cost ? json.internetAccounts[0].tariffPlan.cost + '': 0, result, 'payment', null, null, parseBalance);
    getParam(json.internetAccounts[0].tariffPlan.name ? json.internetAccounts[0].tariffPlan.name : '', result, '__tariff');
	
	AnyBalance.setResult(result);
}