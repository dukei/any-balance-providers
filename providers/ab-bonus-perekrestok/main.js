/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о бонусах на карте Клуба Перекресток.

Сайт магазина: http://www.perekrestok.ru/
Личный кабинет: https://prcab.x5club.ru/cwa/
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru,en-US;q=0.8,en;q=0.6',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36',
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

	if(json.non_field_errors){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка ' + verb + ': ' + json.non_field_errors.join(', '));
	}

	return json;
}

function passCaptcha(handshake){
    var captcha = handshake.server.features['security/captcha'];
    if(captcha && captcha.enabled_for_resources && /establish/i.test(JSON.stringify(captcha.enabled_for_resources))){
    	AnyBalance.trace('Требуется рекапча, надо показывать');
    	var requestId = String(Math.floor(Math.random() * (9999999999 - 1000000000 + 1)) + 1000000000);
    	html = AnyBalance.requestGet(baseurl + 'api/v3/security/captcha?' + 
    		'request_id=' + requestId + '&' +
    		'resource_id=' + baseurl + 'api/v3/sessions/card/establish' + '&' +
    		'X-Authorization=' + encodeURIComponent(apiHeaders['X-Authorization']
    	), addHeaders({
    		Referer: baseurl + 'login'
    	}));

    	var sitekey = getParam(html, /data-sitekey="([^"]*)/i, replaceHtmlEntities);
    	var csrf = getParam(html, /<input[^>]+csrfmiddlewaretoken[^>]*/i);
    	if(!sitekey || !csrf){
    		AnyBalance.trace(html);
    		throw new AnyBalance.Error('Не удалось получить идентификатор капчи. Сайт изменен?');
    	}
    	var url = AnyBalance.getLastUrl();

    	var response = solveRecaptcha('Пожалуйста, докажите, что вы не робот', url, sitekey);

    	html = AnyBalance.requestPost(url, {
    		csrfmiddlewaretoken: getParam(csrf, /value=['"]([^'"]*)/i, replaceHtmlEntities),
    		'g-recaptcha-response': response
    	}, addHeaders({
    		Referer: url
    	}));

    	if(!/success/i.test(AnyBalance.getLastUrl())){
    		AnyBalance.trace('Captcha redirected to ' + AnyBalance.getLastUrl() + ' with content:\n' + html);
    		throw new AnyBalance.Error('Не удалось проверить капчу. Сайт изменен?');
    	}

    	var captcha_token = getParam(AnyBalance.getLastUrl(), /token=([^&]*)/i, decodeURIComponent);
    	AnyBalance.trace('Капчу преодолели (token: ' + captcha_token + '), идем дальше');
    	return {request_id: requestId, token: captcha_token};
    }

    return {request_id: '', token: ''};
}

function pass2f(handshake){
    var tfa = handshake.server.features['security/2fa'];
    if(tfa && tfa.is_enabled){
    	var factor = tfa.factors[0];
    	var channel = factor.channels[0];
    	AnyBalance.trace('Требуется подтверждение входа по ' + channel.id);
    	if(!channel || channel.id != 'sms'){
    		AnyBalance.trace(JSON.stringify(tfa));
    		throw new AnyBalance.Error('Требуется двухфакторная авторизация по неизвестному каналу. Сайт изменен?');
    	}

    	json = callApi('v3/users/self/phones');
    	if(!json.primary || !json.primary.number){
    		AnyBalance.trace(JSON.stringify(json));
    		throw new AnyBalance.Error('Нет номера телефона для подтверждения! Сайт изменен?');
    	}

    	json = callApi('v3/security/2fa/requests', null, {
    		channel_id: channel.id,
    		factor_id: factor.id,
    		phone_number_raw: json.primary.number
    	});

    	if(AnyBalance.getLastStatusCode() != 201){
    		AnyBalance.trace(JSON.stringify(json));
    		throw new AnyBalance.Error('Не удалось послать смс. Сайт изменен?');
    	}

    	var code = AnyBalance.retrieveCode('Пожалуйста, введите код из СМС, посланной на номер ' + json.phone_number_raw, null, {inputType: 'number', time: 120000});
    	json = callApi('v3/security/2fa/validations', null, {
    		channel_id: channel.id,
    		code: code,
    		factor_id: factor.id,
    		phone_number: json.phone_number_raw
    	});

    	if(json.need3f){
    		AnyBalance.trace(JSON.stringify(json));
    		throw new AnyBalance.Error('Прошли проверку смс, но перекрестку мало. Надо ещё что-то проходить. Попробуйте ещё раз, или обратитесь к разработчикам. Сайт изменен?');
    	}

    	AnyBalance.trace('Проверка 2f пройдена');
    }
}

function handshakeAndEstablish(){
    var prefs = AnyBalance.getPreferences (), html, json;

    var handshake = callApi('v3/startup/handshake', null, {
    	app: {
    		platform: 'web',
    		user_agent: g_headers['User-Agent'],
    		version: 2
    	},
    	version: 1
    });

    apiHeaders['X-Authorization'] = 'Bearer ' + handshake.server.features['security/session'].token.value;
    AnyBalance.setCookie('my.perekrestok.ru', 'token', 'Bearer%20' + handshake.server.features['security/session'].token.value);
    AnyBalance.setCookie('my.perekrestok.ru', 'header_name', 'X-Authorization');

    var params1 = passCaptcha(handshake);

    var card = /^\d{16}$/.test(prefs.login);
    if(card){
        json = callApi('v3/sessions/card/establish', null, joinObjects({
        	card_no: prefs.login,
        	password: prefs.password,
        }, params1));
    }else{
        json = callApi('v3/sessions/phone/establish', null, joinObjects({
        	phone_no: prefs.login,
        	password: prefs.password,
        }, params1));
    }

    if(!json.data || !json.data.totp_secret_key){
    	AnyBalance.trace(JSON.stringify(json));
    	throw new AnyBalance.Error('Не удалось авторизоваться. Сайт изменен?');
    }

    pass2f(handshake);
}

function callApiReestablish(verb){
	var json;
	try{
		json = callApi(verb);
	}catch(e){
		if(!e.fatal && AnyBalance.getLastStatusCode() == 401 || AnyBalance.getLastStatusCode() == 403){
			AnyBalance.trace(verb + ': ' + e.message + ', reestablishing connection');
			handshakeAndEstablish();
			json = callApi(verb);
		}
	}
	return json;
}

function main () {
    var prefs = AnyBalance.getPreferences ();
    AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите номер карты или номер телефона.');
	checkEmpty(prefs.password, 'Введите пароль.');
		
    AnyBalance.trace('Входим в кабинет ' + baseurl);

    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
    if(AnyBalance.getLastStatusCode() >= 400){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Личный кабинет https://my.perekrestok.ru/ временно недоступен. Пожалуйста, попробуйте позже');
    }

    try{
		handshakeAndEstablish();
	}catch(e){
		if(AnyBalance.getLastStatusCode() == 403 || AnyBalance.getLastStatusCode() == 401){
			AnyBalance.trace('Тупой перекресток выдал ошибку в ' + AnyBalance.getLastUrl() + ': ' + AnyBalance.getLastStatusCode() + '. Надо переустановить соединение');
			handshakeAndEstablish();
		}else
			throw e;
	}

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
