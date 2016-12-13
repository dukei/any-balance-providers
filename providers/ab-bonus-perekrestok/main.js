/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о бонусах на карте Клуба Перекресток.

Сайт магазина: http://www.perekrestok.ru/
Личный кабинет: https://prcab.x5club.ru/cwa/
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = "https://my.perekrestok.ru/"

	checkEmpty(prefs.login, 'Введите номер карты или номер телефона.');
	checkEmpty(prefs.password, 'Введите пароль.');
		
    AnyBalance.trace('Входим в кабинет ' + baseurl);

    var card = /^\d{16}$/.test(prefs.login);

    var html = AnyBalance.requestPost(baseurl + '/api/v1/sessions/card/establish', JSON.stringify({
    	card_no: card ? prefs.login : undefined,
    	phone_no: card ? undefined : prefs.login,
    	password: prefs.password
    }), addHeaders({
    	'Content-Type': 'application/json;charset=UTF-8'
    }));

    var json = getJson(html);
    if(!json.data || !json.data.totp_secret_key){
    	var error = json.error && json.error.description;
    	if(error)
    		throw new AnyBalance.Error(error, null, json.error.code == 'invalid_grant');
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    
    var result = {success: true};

    if(isAvailable(['customer', '__tariff'])){
    	html = AnyBalance.requestGet(baseurl + 'api/v1/users/self', g_headers);
    	json = getJson(html);

    	getParam(json.data.user.name + ' ' + json.data.user.surname, result, 'customer');
    	getParam(json.data.user.card_no, result, '__tariff');
    }

    if(isAvailable(['balance', 'burnInThisMonth', 'burnDate'])){
    	html = AnyBalance.requestGet(baseurl + 'api/v1/balances', g_headers);
    	json = getJson(html);

    	getParam(json.data.balance_list[0].balance_points, result, 'balance');
    	getParam(json.data.expiration_info.value, result, 'burnInThisMonth');
    	getParam(json.data.expiration_info.date*1000, result, 'burnDate');
    }

    AnyBalance.setResult (result);
}
