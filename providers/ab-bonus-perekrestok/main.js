/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о бонусах на карте Клуба Перекресток.

Сайт магазина: http://www.perekrestok.ru/
Личный кабинет: https://prcab.x5club.ru/cwa/
*/

var domain = "my.perekrestok.ru"

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'ru,en-US;q=0.9,en;q=0.8,ru-RU;q=0.7',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
	'If-Modified-Since': '0',
	'Content-Type': 'application/json',
	Origin: "https://" + domain
};

var baseurl = "https://" + domain + "/"
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

	var json = html ? getJson(html) : {};

	if(AnyBalance.getLastStatusCode() >= 500 && !html)
		throw new AnyBalance.Error('Ошибка сервера');

	if(AnyBalance.getLastStatusCode() >= 400 && json.code){
		AnyBalance.trace(html);
		throw new AnyBalance.Error(json.title + '\n' + json.message, null, /не привязан|некорректный/i.test(json.message));
	}

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

function setTokensCookies(tokens){
    AnyBalance.setCookie(domain, 'perekrestok.accessToken', "Bearer%20" + tokens.accessToken);
    AnyBalance.setCookie(domain, 'perekrestok.refreshToken', tokens.refreshToken);
    g_headers['X-Authorization'] = "Bearer " + tokens.accessToken;
}

function passCaptcha(info){
    var response = solveRecaptcha('Пожалуйста, докажите, что вы не робот', baseurl, info.captcha_key);

    var json = callApi('..' + info.captcha_url, null, {
    	'g_recaptcha_response': response
    });

    if(!json.is_valid){
    	throw new AnyBalance.Error('Не удалось проверить капчу. Сайт изменен?');
    }
}

function main () {
    var prefs = AnyBalance.getPreferences ();
    AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите номер карты или номер телефона.');
		
    AnyBalance.trace('Входим в кабинет ' + baseurl);

    var html = AnyBalance.requestGet(baseurl + '', g_headers);
    if(AnyBalance.getLastStatusCode() >= 400){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Личный кабинет ' + baseurl + ' временно недоступен. Пожалуйста, попробуйте позже');
    }

    var tokens = AnyBalance.getData('tokens');
    var json;

    var instanceId = hex_md5(prefs.login);
    AnyBalance.setCookie(domain, 'perekrestok.instanceId', instanceId);

    if(!tokens){
        tokens = callApi('v5/auth/signin', null, {
        	"instance_id": instanceId,
        	"device":{"platform":"WEB","version":"2.0"},
        	"grant_type":"DEVICE_TOKEN"
        });
    }
    
    setTokensCookies(tokens);
    json = retryTimes(function(){ return callApi('v5/users/me') }, 5);

    if(AnyBalance.getLastStatusCode() == 401){
    	try{
    		AnyBalance.trace('Unauthorized, trying to refresh');
            tokens = callApi('v5/auth/refresh', null, {
            	"instance_id": instanceId,
            	"refreshToken":tokens.refreshToken
            });
            setTokensCookies(tokens);
            
    		json = retryTimes(function(){ return callApi('v5/users/me') }, 5);
    	}catch(e){
    		AnyBalance.trace("Unable to refresh: " + e.message + ". Need to reauth");
    		AnyBalance.setData("tokens", null);
    		AnyBalance.saveData();
    		throw new AnyBalance.Error(e.message, true);
    	}
    }

    if(AnyBalance.getLastStatusCode() == 401 || forceReAuth){
    	AnyBalance.trace('Still unauthorized, trying to login');
    	AnyBalance.setCookie(domain, 'perekrestok.authorized', 'false');

    	var num = prefs.login.replace(/\D/g, '');
    	var phone = num.length < 16;
    	if(phone)
    		num = '+' + (num.length <= 10 ? '7' : '') + num;

    	do{
        	json = callApi(phone ? 'v5/2fa/phone/requests' : 'v5/2fa/loyalty/requests', null, {
        		"number": num,
        	});
        	
        	if(json.captcha_key){
        		AnyBalance.trace('Потребовалась капча');
        		passCaptcha(json);
        	}else{
        		break;
        	}
        	
        }while(true);

        var code = AnyBalance.retrieveCode('Пожалуйста, введите код из СМС для входа в ЛК Перекресток', null, {inputType: 'number', time: 300000});

        tokens = callApi('v5/auth/signin', null, {
        	"instance_id": instanceId,
        	"grant_type":"IDENTITY_TOKEN",
        	"two_factor": {
        		"code": code,
        		"token": json.token
        	}
        });
        setTokensCookies(tokens);

    	json = retryTimes(function(){ return callApi('v5/users/me') }, 5);
    }

    if(AnyBalance.getLastStatusCode() >= 400){
    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

    AnyBalance.setData('tokens', tokens);
    AnyBalance.saveData();

    var result = {success: true};

    getParam(json.personalData.firstName + ' ' + json.personalData.lastName, result, 'customer');
    getParam(json.loyaltyNo, result, '__tariff');
    getParam(json.balances.points, result, 'balance');
    getParam(json.balances.stickers, result, 'stickers');

    if(isAvailable(['burnInThisMonth', 'burnDate'])){
    	json = callApi('v3/balances');

    	if(json.data.expiration_info){
	    	getParam(json.data.expiration_info.value, result, 'burnInThisMonth');
    		getParam(json.data.expiration_info.date*1000, result, 'burnDate');
    	}
    }

    AnyBalance.setResult (result);
}

function retryTimes(func, times){
	for(var i=0; i<times; ++i){
		try{
			return func();
		}catch(e){
			AnyBalance.trace('Попытка ' + (i+1) + '/' + times + ': ' + e.message);
			if(i === times-1)
				throw e;
        }
    }
}