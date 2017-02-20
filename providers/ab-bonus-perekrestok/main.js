/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о бонусах на карте Клуба Перекресток.

Сайт магазина: http://www.perekrestok.ru/
Личный кабинет: https://prcab.x5club.ru/cwa/
*/

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'ru,en-US;q=0.8,en;q=0.6',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
	Origin: "https://my.perekrestok.ru"
};

var baseurl = "https://my.perekrestok.ru/"
var apiHeaders = {
	Referer: baseurl + 'login'
};

function callApi(verb, getParams, postParams){
	var method = 'GET';
	var h = apiHeaders;
	if(isset(postParams)){
		method = 'POST';
		h = addHeaders({'Content-Type': 'application/json;charset=UTF-8'}, apiHeaders);
	}
	
	var html = AnyBalance.requestPost(baseurl + 'api/' + verb, postParams && JSON.stringify(postParams), addHeaders(h), {HTTP_METHOD: method});

	var json = getJson(html);
	if(json.error){
		AnyBalance.trace(html);
		throw new AnyBalance.Error(json.error.description, null, /парол/i.test(json.error.description));
	}

	return json;
}

function handshakeAndEstablish(){
    var prefs = AnyBalance.getPreferences ();

    var card = /^\d{16}$/.test(prefs.login);
    var json = callApi('v3/startup/handshake', null, {
    	app: {
    		platform: 'web',
    		user_agent: g_headers['User-Agent'],
    		version: 1
    	},
    	version: 1
    });

    apiHeaders['X-Authorization'] = 'Bearer ' + json.server.features['security/session'].token.value;
    AnyBalance.setCookie('my.perekrestok.ru', 'token', 'Bearer%20' + json.server.features['security/session'].token.value);
    AnyBalance.setCookie('my.perekrestok.ru', 'header_name', 'X-Authorization');

    json = callApi('v3/sessions/card/establish', null, {
    	card_no: card ? prefs.login : undefined,
    	phone_no: card ? undefined : prefs.login,
    	password: prefs.password,
    	request_id: '',
    	token: ''
    });

    if(!json.data || !json.data.totp_secret_key){
    	AnyBalance.trace(JSON.stringify(json));
    	throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
}

function callApiReestablish(verb){
	var json;
	try{
		json = callApi(verb);
	}catch(e){
		if(!e.fatal && AnyBalance.getLastStatusCode() == 401){
			AnyBalance.trace(verb + ': ' + e.message + ', reestablishing connection');
			handshakeAndEstablish();
			json = callApi(verb);
		}
	}
	return json;
}

function main () {
    var prefs = AnyBalance.getPreferences ();

	checkEmpty(prefs.login, 'Введите номер карты или номер телефона.');
	checkEmpty(prefs.password, 'Введите пароль.');
		
    AnyBalance.trace('Входим в кабинет ' + baseurl);

    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
    if(AnyBalance.getLastStatusCode() >= 400){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Личный кабинет https://my.perekrestok.ru/ временно недоступен. Пожалуйста, попробуйте позже');
    }

	handshakeAndEstablish();

    var result = {success: true};

    if(isAvailable(['customer', '__tariff'])){
    	json = callApiReestablish('v1/users/self');

    	getParam(json.data.user.name + ' ' + json.data.user.surname, result, 'customer');
    	getParam(json.data.user.card_no, result, '__tariff');
    }

    if(isAvailable(['balance', 'burnInThisMonth', 'burnDate'])){
    	json = callApiReestablish('v1/balances');

    	getParam(json.data.balance_list[0].balance_points, result, 'balance');

    	if(json.data.expiration_info){
	    	getParam(json.data.expiration_info.value, result, 'burnInThisMonth');
    		getParam(json.data.expiration_info.date*1000, result, 'burnDate');
    	}
    }

    AnyBalance.setResult (result);
}
