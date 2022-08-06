
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'ru,en-US;q=0.9,en;q=0.8,ru-RU;q=0.7',
	'Origin': 'https://backit.me',
	'Referer': 'https://backit.me/',
	'x-api-version': '2',
    'x-client-id': 'web-client',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
};

var baseurl = 'https://app.backit.me/';

function saveTokens(json){
	AnyBalance.setData('access_token', json.data.attributes.access_token);
	AnyBalance.setData('refresh_token', json.data.attributes.refresh_token);
	AnyBalance.setData('token_type', json.data.attributes.token_type);
	AnyBalance.saveData();
}

function loginPure(){
	var prefs = AnyBalance.getPreferences();
	
	clearAllCookies();
	
	var html = AnyBalance.requestGet('https://oauth2.backit.me/ssid', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 500) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if(json.result !== true){
		var error = (json.errors || []).map(function(e) { return e.error_description }).join('\n');
		if(error){
			if(/need captcha/i.test(error)){
				var captchaSiteKey = json.errors[0].captcha.captcha.site_key;
				var captchaPhraseKey = json.errors[0].captcha.captcha_phrase_key;
				var captchaType = json.errors[0].captcha.type;
				
				if(captchaType === 'reCaptcha'){
					var captcha = solveRecaptcha('Пожалуйста, подтвердите, что вы не робот', AnyBalance.getLastUrl(), captchaSiteKey, {USERAGENT: g_headers['User-Agent']});
				    var html = AnyBalance.requestGet('https://oauth2.backit.me/ssid', addHeaders({
						'x-captcha': captcha,
						'x-captcha-phrase-key': captchaPhraseKey
					}));
                    var json = getJson(html);
	                AnyBalance.trace(JSON.stringify(json));
				}else{
			        throw new AnyBalance.Error('Неизвестный тип капчи: ' + captchaType, null, /captcha/i.test(error));
		        }
				
		    }else{
			    AnyBalance.trace(html);
		        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
		    }
		}
	}
	
	var ssid = json.data.attributes.ssid_token;

	html = AnyBalance.requestPost('https://oauth2.backit.me/token', JSON.stringify({
    	"grant_type": "password",
    	"username": prefs.login,
    	"password": prefs.password,
    	"check_ip": false,
    	"client_secret": "60cfb46215e4058f39e69c1f4a103e4c"
	}), addHeaders({
		'Content-Type': 'application/json;charset=UTF-8',
		'x-ssid': ssid,
        'x-user-check-role': true
	}, g_headers));

	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	if(json.result !== true){
		var error = (json.errors || []).map(function(e) { return e.error_description }).join('\n');
		if(error)
			if(/Wrong user role/i.test(error)){
			    throw new AnyBalance.Error(error, null, /user|role/i.test(error));
	        }else{
			    throw new AnyBalance.Error(error, null, /password|парол/i.test(error));
			}
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	saveTokens(json);
	AnyBalance.setData('login', prefs.login);
	AnyBalance.saveCookies();
	AnyBalance.saveData();
}

function loginAccessToken(){
	var accessToken = AnyBalance.getData('access_token');
	AnyBalance.restoreCookies();
	try{
	    AnyBalance.trace('Токен сохранен. Пробуем войти...');
		var html = AnyBalance.requestGet(baseurl + 'purses/balance', addHeaders({
            'x-access-token': accessToken
        }));
	    var json = getJson(html);
		if (json.result !== true){
		    return false;
		}else{
		    AnyBalance.trace('Успешно вошли по accessToken');
		    return true;
		}
	}catch(e){
		AnyBalance.trace('Не удалось войти по accessToken: ' + e.message);
		return false;
	}
}

function loginRefreshToken(){
	var accessToken = AnyBalance.getData('access_token');
	var refreshToken = AnyBalance.getData('refresh_token');
	AnyBalance.restoreCookies();
	try{
		AnyBalance.trace('Токен устарел. Пробуем обновить...');
		var html = AnyBalance.requestPost('https://oauth2.backit.me/token/refresh', JSON.stringify({
			'grant_type': 'refresh_token',
			'refresh_token': refreshToken
		}), addHeaders({
			"Content-Type": "application/json;charset=UTF-8"
		}));
	    var json = getJson(html);
		if (json.result !== true){
		    return false;
		}else{
		    AnyBalance.trace('Успешно вошли по refreshToken');
		    saveTokens(json);
			AnyBalance.saveCookies();
			AnyBalance.saveData();
		    return true;
		}
	}catch(e){
		AnyBalance.trace('Не удалось войти по refreshToken: ' + e.message);
		saveTokens({});
		clearAllCookies();
		AnyBalance.saveData();
		return false;
	}
}

function loginToken(){
	var prefs = AnyBalance.getPreferences();
	
	if(!AnyBalance.getData('access_token')){
		AnyBalance.trace('Токен не сохранен. Будем логиниться');
		return false;
	}
	
	if(AnyBalance.getData('access_token') && (AnyBalance.getData('login') !== prefs.login)){
		AnyBalance.trace('Токен соответствует другому логину');
		return false;
	}

	if(loginAccessToken())
		return true;
	
	return loginRefreshToken();
}

function login(){
	if(!loginToken()){
		loginPure();
	}
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	login();
	
	var accessToken = AnyBalance.getData('access_token');

	var result = {success: true};

    if(isAvailable(['balance', 'balance_hold'])) {
        html = AnyBalance.requestGet(baseurl + 'purses/balance', addHeaders({
          'x-access-token': accessToken
        }));

        var json = getJson(html);
	    AnyBalance.trace(JSON.stringify(json));
		
		var balances = json.data;
	    if(balances && balances.length > 0){
	    	AnyBalance.trace('Найдено балансов: ' + balances.length);
	    	for(var i = 0; i<balances.length; i++){
				if (balances[i].id === 'RUB'){
					getParam(balances[i].attributes.availableAmount, result, 'balance', null, null, parseBalance);
					getParam(balances[i].attributes.holdAmount, result, 'balance_hold', null, null, parseBalance);
					getParam(balances[i].attributes.summaryPayments, result, 'balance_pay', null, null, parseBalance);
				}else if (balances[i].id === 'USD'){
					getParam(balances[i].attributes.availableAmount, result, 'balance_usd', null, null, parseBalance);
					getParam(balances[i].attributes.holdAmount, result, 'balance_hold_usd', null, null, parseBalance);
					getParam(balances[i].attributes.summaryPayments, result, 'balance_pay_usd', null, null, parseBalance);
				}else if (balances[i].id === 'GBP'){
					getParam(balances[i].attributes.availableAmount, result, 'balance_gbp', null, null, parseBalance);
					getParam(balances[i].attributes.holdAmount, result, 'balance_hold_gbp', null, null, parseBalance);
					getParam(balances[i].attributes.summaryPayments, result, 'balance_pay_gbp', null, null, parseBalance);
				}else if (balances[i].id === 'EUR'){
					getParam(balances[i].attributes.availableAmount, result, 'balance_eur', null, null, parseBalance);
					getParam(balances[i].attributes.holdAmount, result, 'balance_hold_eur', null, null, parseBalance);
					getParam(balances[i].attributes.summaryPayments, result, 'balance_pay_eur', null, null, parseBalance);
				}else{
					AnyBalance.trace('Неизвестный тип валюты: ' + balances[i].id);
				}
	    	}
	    }else{
 	    	AnyBalance.trace('Не удалось получить данные по балансам');
 	    }
    }
	
	if(isAvailable(['user_name', 'fio', 'phone'])) {
        html = AnyBalance.requestGet(baseurl + 'user/profile', addHeaders({
          'x-access-token': accessToken,
		  'x-api-version': '2.1'
        }));

        var json = getJson(html);
	    AnyBalance.trace(JSON.stringify(json));
	
        getParam(json.data.attributes.userName, result, 'user_name');
		getParam(json.data.attributes.fullName, result, '__tariff', null, null, capitalFirstLetters);
		getParam(json.data.attributes.fullName, result, 'fio', null, null, capitalFirstLetters);
		getParam(json.data.attributes.phone, result, 'phone');
    }

	AnyBalance.setResult(result);
}
