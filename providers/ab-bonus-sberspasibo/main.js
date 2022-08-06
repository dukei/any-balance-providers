
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'ru',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
};

var baseurl = 'https://spasibosberbank.ru';

function saveTokens(json){
	AnyBalance.setData('accessToken', json.data.token);
	AnyBalance.setData('refreshToken', json.data.refreshToken);
    AnyBalance.setData('expiryTime', json.data.expiryTime);
	AnyBalance.saveData();
}

function loginPure(){
	var prefs = AnyBalance.getPreferences();

	var login = '7' + prefs.login;
	
	html = AnyBalance.requestPost(baseurl + '/api/online/auth/phone', JSON.stringify({
		"phone": login.replace(/\+/g, '')
	}), addHeaders({
		"Content-Type": "application/json;charset=UTF-8",
		Referer: baseurl + "/login"
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if (json.data.isSended === true){
	    var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения из SMS, высланного на номер +7' + prefs.login, null, {inputType: 'number', time: 180000});
    }else{
		throw new AnyBalance.Error('Не удалось отправить SMS с кодом подтверждения. Сайт изменен?');
	}

	html = AnyBalance.requestPost(baseurl + '/api/online/auth/phone', JSON.stringify({
		"phone": login.replace(/\+/g, ''),
		"confirmCode": code
	}), addHeaders({
		"Content-Type": "application/json",
		Referer: baseurl + "/login"
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));

	if(json.error){
		var error = json.error.messages[0];
		if(error){
			AnyBalance.trace(html);
		    throw new AnyBalance.Error(error || 'Не удалось войти в личный кабинет. Сайт изменен?', null, /user|pass/i.test(error));
		}
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}

	var authToken = json.data.token;
	var refreshToken = json.data.refreshToken;
	var expiryTime = json.data.expiryTime;

	saveTokens(json);
	AnyBalance.setData('login', prefs.login);
	AnyBalance.saveData();
}

function loginAccessToken(){
	var accessToken = AnyBalance.getData('accessToken');
	g_headers.Authorization = 'Bearer ' + accessToken;
	try{
	    AnyBalance.trace('Токен сохранен. Пробуем войти...');
		var html = AnyBalance.requestGet(baseurl + '/api/online/personal/me', addHeaders({
			Referer: baseurl + "/login"
		}));
	    var json = getJson(html);
		if (json.error){
			AnyBalance.trace(json.error.messages[0]);
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
		var html = AnyBalance.requestPost(baseurl + '/api/online/auth/refresh', JSON.stringify({
			"refreshToken": refreshToken
		}), addHeaders({
			"Content-Type": "application/json;charset=UTF-8",
			Referer: baseurl + "/login"
		}));
	    var json = getJson(html);
		if (json.error){
			AnyBalance.trace(json.error.messages[0]);
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

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(/(^\d{10}$|@)/, 'Введите номер телефона (10 цифр без пробелов и разделителей)!');

	login();

	var result = {success: true};

	g_headers.Authorization = 'Bearer ' + AnyBalance.getData('accessToken');
	
	var html = AnyBalance.requestGet(baseurl + '/api/online/personal/me', addHeaders({Referer: baseurl + "/login"}));
	var json = getJson(html);
	
	getParam(json.data.loyaltySystem.balance, result, 'balance', null, null, parseBalance);
	getParam(json.data.loyaltySystem.levlelName, result, 'level');
	getParam(json.data.loyaltySystem.levlelName, result, '__tariff');
	if (json.data.personal.phone){
	    getParam(json.data.personal.phone.replace(/.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'), result, 'phone');
	}
	if (json.data.loyaltySystem.bon_to_annulment){
	    getParam(json.data.loyaltySystem.bon_to_annulment.value, result, 'annul', null, null, parseBalance);
	    getParam(json.data.loyaltySystem.bon_to_annulment.date, result, 'annuldate', null, null, parseDate);
	}
	
	var html = AnyBalance.requestGet(baseurl + '/api/online/personal/loyalitySystem/level', addHeaders({Referer: baseurl + "/lk_levels"}));
	var json = getJson(html);
	
	if (json.data && json.data.length){
		AnyBalance.trace('Найдено уровней: ' + json.data.length);
		for(var i=0; i<json.data.length; ++i){
	    	var lvl = json.data[i];
			var cur = json.data[i].isCurrent;
			
			if (cur === true){
				getParam(lvl.name, result, 'level');
				getParam(lvl.name, result, '__tariff');
				if (lvl.expDate){
				    getParam(lvl.expDate.replace(/(\d\d\d\d)-(\d\d)-(\d\d).*/, '$3.$2.$1'), result, 'leveltill', null, null, parseDate);
			    }
			}
	    }
	}else{
		AnyBalance.trace('Не удалось получить информацию об уровнях');
	}
	
	var html = AnyBalance.requestGet(baseurl + '/api/online/personal/loyalitySystem/nextLevel', addHeaders({Referer: baseurl + "/lk_levels"}));
	var json = getJson(html);
	
	getParam(json.data.data.nextLevelName, result, 'levelnext');
	
	var html = AnyBalance.requestGet(baseurl + '/api/online/personal/loyalitySystem/transactions?page=1&cnt=100', addHeaders({Referer: baseurl + "/lk_history"}));
	var json = getJson(html);
	
	if (json.data.transactions && json.data.transactions.length){
		AnyBalance.trace('Найдено операций: ' + json.data.transactions.length);
		for(var i=json.data.transactions.length-1; i>=0; i--){
	    	var transaction = json.data.transactions[i];

			getParam(transaction.operationDate, result, 'lastoperdate', null, null, parseDate);
	        getParam(transaction.bonusBalanceChange, result, 'lastopersum', null, null, parseBalance);
	        getParam(transaction.partnerName, result, 'lastoperdesc');
			break;
	    }
	}else{
		AnyBalance.trace('Не удалось получить информацию о последней операции');
	}

	AnyBalance.setResult(result);
}
