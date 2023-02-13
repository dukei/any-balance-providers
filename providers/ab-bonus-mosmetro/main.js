
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'ru',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
};

function generateCodeVerifier() {
    for (var t = "", e = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_~", n = 0; n < 64; n++)
        t += e.charAt(Math.floor(Math.random() * e.length));
    return t
}

function generateState() {
	return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

var baseurl = 'https://lk.mosmetro.ru';
var baseurlAuth = 'https://auth.mosmetro.ru';

function saveTokens(json){
	AnyBalance.setData('accessToken', json.data.accessToken);
	AnyBalance.setData('refreshToken', json.data.refreshToken);
    AnyBalance.setData('validSeconds', json.data.validSeconds);
	AnyBalance.saveData();
}

function loginPure(){
	var prefs = AnyBalance.getPreferences();
	
	var cv = generateCodeVerifier();
	var state = generateState();
	var hash = CryptoJS.SHA256(cv);
	var challenge = hash.toString(CryptoJS.enc.Base64)
		.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

	var html = AnyBalance.requestGet(baseurl + '/api/externals/v1.0?redirectUri=' + baseurl + '/external-auth&state=' + state + '&codeChallenge=' + challenge + '&codeChallengeMethod=S256', addHeaders({
		Referer: baseurl + '/sign-in',
		'X-API-Variant': 'test'
	}));
	var json = getJson(html);

	var url = json.data.authorizeUrl;
	html = AnyBalance.requestGet(url, addHeaders({Referer: baseurl + '/'}));

	var login = '7' + prefs.login;
	
	var signinurl = AnyBalance.getLastUrl();
	var returnUrl = getParam(signinurl, /ReturnUrl=([^&]*)/i, null, decodeURIComponent);
	
	html = AnyBalance.requestPost(baseurlAuth + '/api/auth/login/sms', JSON.stringify({
		"login": login.replace(/\+/g, ''),
		"returnUrl": returnUrl
	}), addHeaders({
		"Content-Type": "application/json",
		Referer: signinurl
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if (json.isUserRegistered === true){
	    var secret = json.secret;
    }else{
		throw new AnyBalance.Error('Пользователь с таким номером не зарегистрирован');
	}
	
	var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения из SMS, высланного на номер +7' + prefs.login, null, {inputType: 'number', time: 180000});
	
	html = AnyBalance.requestPost(baseurlAuth + '/api/auth/login/sms/confirm', JSON.stringify({
		"secret": secret,
		"token": code
	}), addHeaders({
		"Content-Type": "application/json",
		Referer: signinurl
	}));
	
	AnyBalance.trace(JSON.stringify(json));

	if(/^\{/.test(html)){
		AnyBalance.trace(html);
		json = getJson(html);
		throw new AnyBalance.Error(json.type || 'Не удалось войти в личный кабинет. Сайт изменен?', null, /user|pass/i.test(json.type));
	}
	
	url = html;
	html = AnyBalance.requestGet(joinUrl(baseurlAuth, url), addHeaders({Referer: signinurl}));

	var authlink = AnyBalance.getLastUrl();
	var code = getParam(authlink, /code=([^&]*)/, null, decodeURIComponent);
	var scope = getParam(authlink, /scope=([^&]*)/, null, decodeURIComponent);
	var state = getParam(authlink, /state=([^&]*)/, null, decodeURIComponent);

	html = AnyBalance.requestPost(baseurl + '/api/authorization/v1.0/codeFlow', JSON.stringify({
    	"code": code,
    	"codeVerifier": cv,
    	"redirectUri": baseurl + "/external-auth"
	}), addHeaders({
		"Content-Type": "application/json",
		Referer: AnyBalance.getLastUrl()
	}));

	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	if(!json.success){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет после авторизации. Сайт изменен?');
	}

	saveTokens(json);
	AnyBalance.setData('login', prefs.login);
	AnyBalance.saveData();
}

function loginAccessToken(){
	var accessToken = AnyBalance.getData('accessToken');
	g_headers.Authorization = 'Bearer ' + accessToken;
	try{
	    AnyBalance.trace('Токен сохранен. Пробуем войти...');
		var html = AnyBalance.requestGet(baseurl + '/api/carriers/v1.0/linked', addHeaders({
			Referer: baseurl + '/personal-cabinet'
		}));
	    var json = getJson(html);
		if (json.success !== true){
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
	var accessToken = AnyBalance.getData('accessToken');
	var refreshToken = AnyBalance.getData('refreshToken');
	g_headers.Authorization = 'Bearer ' + accessToken;
	try{
		AnyBalance.trace('Токен устарел. Пробуем обновить...');
		var html = AnyBalance.requestPost(baseurl + '/api/authorization/v1.0/refresh', JSON.stringify({
			"refreshToken": refreshToken
		}), addHeaders({
			"Content-Type": "application/json",
			Referer: baseurl + '/personal-cabinet'
		}));
	    var json = getJson(html);
		if (json.success !== true){
		    return false;
		}else{
		    AnyBalance.trace('Успешно вошли по refreshToken');
		    saveTokens(json);
		    return true;
		}
	}catch(e){
		AnyBalance.trace('Не удалось войти по refreshToken: ' + e.message);
		saveTokens({});
		return false;
	}
}

function loginToken(){
	var prefs = AnyBalance.getPreferences();
	
	if(!AnyBalance.getData('accessToken')){
		AnyBalance.trace('Токен не сохранен. Будем логиниться');
		return false;
	}
	
	if(AnyBalance.getData('accessToken') && (AnyBalance.getData('login') !== prefs.login)){
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

	AB.checkEmpty(prefs.login, 'Введите логин!');
	
	AB.checkEmpty(/(^\d{10}$|@)/, 'Введите номер телефона (10 цифр без пробелов и разделителей)!');

	login();

	var result = {
		success: true,
	};

	g_headers.Authorization = 'Bearer ' + AnyBalance.getData('accessToken');
	var html = AnyBalance.requestGet(baseurl + '/api/carriers/v1.0/linked', addHeaders({Referer: baseurl + '/personal-cabinet'}));
	var json = getJson(html);
	
	AnyBalance.trace("Найдено карт: " + json.data.cards.length);
	var selected;
	var number;

	for(var i=0; i<json.data.cards.length; ++i){
		var card = json.data.cards[i];
		var name = card.card.cardTypeName + '/' + card.card.displayName + ' ' + card.card.cardNumber;
		AnyBalance.trace('Найдена карта ' + name);

		if((prefs.num && endsWith(card.card.cardNumber, prefs.num)) || (!prefs.num && i==0)){
			AnyBalance.trace('Выбираем эту карту');
			getParam(name, result, '__tariff');
			getParam(card.balance.balance, result, 'balance');
			getParam(card.balance.bonus, result, 'bonus');
			number = card.card.cardNumber;
			selected = card;
		}
	}

	if(!selected){
		if(json.data.cards.length)
			throw new AnyBalance.Error('Не найдена карта с последними цифрами ' + prefs.num);
		else
			throw new AnyBalance.Error('В кабинете не прикреплена ни одна карта');
	}
	
	var html = AnyBalance.requestGet(baseurl + '/api/trips/v1.0?size=6', addHeaders({Referer: baseurl + '/trips-history'}));
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if (json.data.items && json.data.items.length){
	    getParam(0, result, 'leftpaytime');
		
		for(var i=0; i<json.data.items.length; ++i){
	    	var item = json.data.items[i];
	    	var cardNum = item.card.cardNumber;
			
			if(cardNum == number){
				getParam(item.trip.date, result, 'lastpaytime');
	            getParam(item.operation.sum, result, 'lastpaysum');
	            getParam(item.displayName, result, 'lastpayname');
				break;
			}
	    }
	
	    var dts = Date.now();
	
	    for(var i=0; i<json.data.items.length; ++i){
	    	var item = json.data.items[i];
	    	var cardNum = item.card.cardNumber;
	    	var operSum = item.operation.sum;

	    	if(cardNum == number && operSum >= 46){
				getParam(item.trip.date, result, 'leftpaydate');
	    		var start = item.trip.date;
	    		var end = start + 5400000;
	    		if (dts < end){
	    			getParam((end - dts) / 1000 / 60, result, 'leftpaytime', null, null, parseMinutes);
	    		}else{
	    			getParam(0, result, 'leftpaytime');
	    		}
	    		break;
	    	}
	    }
	}else{
		AnyBalance.trace('Последний проход не найден');
	}
	
	var html = AnyBalance.requestPost(baseurl + '/api/operations/v1.0?size=6', JSON.stringify({
        "linkedBankCardId": null,
        "linkedCardIds": null,
        "operationTypes": null,
        "periodEndDateUtc": null,
        "periodStartDateUtc": null
    }), addHeaders({'Content-Type': 'application/json', Referer: baseurl + '/operations-history'}));	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if (json.data.items && json.data.items.length){
	    for(var i=0; i<json.data.items.length; ++i){
	    	var item = json.data.items[i];
	    	var cardNum = item.card.cardNumber;

	    	if(cardNum == number){
	    		getParam(item.date, result, 'lastoperdate');
	    		getParam(item.payment.sum, result, 'lastopersum');
	    		getParam(item.displayName, result, 'lastopername');
	    		break;
	    	}
	    }
	}else{
		AnyBalance.trace('Последняя операция не найдена');
	}

	AnyBalance.setResult(result);
}
