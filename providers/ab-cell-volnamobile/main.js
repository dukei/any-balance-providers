/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept-Encoding': 'identity',
    'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 8.0.0; AUM-L29 Build/HONORAUM-L29)',
    'Connection': 'Keep-Alive',
}

var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function saveTokens(json){
	AnyBalance.setData('accessToken', json.access_token);
	AnyBalance.setData('refreshToken', json.refresh_token);
    AnyBalance.setData('expiresIn', json.expires_in);
	AnyBalance.setData('tokenType', json.token_type);
	AnyBalance.saveData();
}

function callApi(verb, params){
	var accessToken = AnyBalance.getData('accessToken');
	var method = 'GET', headers = g_headers;
	if(params){
		method = 'POST';
		var baseurl = 'https://lk-identity.volnamobile.ru/';
		headers = addHeaders({'Content-Type': 'application/x-www-form-urlencoded'});
	}else{
		var baseurl = 'https://lk-mapi.volnamobile.ru/';
		headers = addHeaders({'Accept': 'application/json', 'Authorization': 'Bearer ' + accessToken});
	}
	
	AnyBalance.trace('Запрос: ' + baseurl + verb);
	var html = AnyBalance.requestPost(baseurl + verb, params, headers, {HTTP_METHOD: method});
	var json = getJson(html);
	AnyBalance.trace('Ответ: ' + JSON.stringify(json));
	if(json.error){
		var error = json.message || json.error;
		if(error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}

	return json;
}

function loginPure(action, params, method){
	var prefs = AnyBalance.getPreferences(), json;
	
    var json = callApi('connect/token', {grant_type: 'password', username: prefs.login, password: prefs.password, scope: 'api offline_access', client_id: 'mobile-app.client'}, 'POST');

    if(!json || !json.access_token){
    	AnyBalance.trace(JSON.stringify(json));
    	throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
    }

	var accessToken = json.access_token;
	AnyBalance.trace('Токен получен: ' + accessToken);
	
	AnyBalance.setData('login', prefs.login);
	AnyBalance.saveData();
	saveTokens(json);
}

function loginAccessToken(){
	var prefs = AnyBalance.getPreferences();
	var accessToken = AnyBalance.getData('accessToken');
	try{
	    AnyBalance.trace('Токен сохранен. Пробуем войти...');
		var json = callApi('api/v1.0/manage/profile/get/' + prefs.login + '?includeMetadata=True&includeContent=True&includeChildContent=False&infoContent=subscriber%2Cdiscounts%2Cconversions%2Ccriteria');
		AnyBalance.trace('Успешно вошли по accessToken');
		return true;
	}catch(e){
		AnyBalance.trace('Не удалось войти по accessToken: ' + e.message);
		return false;
	}
}

function loginRefreshToken(){
	var prefs = AnyBalance.getPreferences();
	var refreshToken = AnyBalance.getData('refreshToken');
	try{
		AnyBalance.trace('Токен устарел. Пробуем обновить...');
		var json = callApi('connect/token', {grant_type: 'refresh_token', username: prefs.login, refresh_token: refreshToken, client_id: 'mobile-app.client'}, 'POST');
		AnyBalance.trace('Успешно вошли по refreshToken');
		saveTokens(json);
		return true;
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
	checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона (10 цифр без пробелов и разделителей)!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var cc={};

	login();

	var result = {success: true};
	
	var json = callApi('api/v1.0/manage/profile/get/' + prefs.login + '?includeMetadata=True&includeContent=True&includeChildContent=False&infoContent=subscriber%2Cdiscounts%2Cconversions%2Ccriteria');
	
	var state = {
		1: 'Активен',
		0: 'Не активен'
	};
	result.balance=json.metadata.subscriberInfo.subscriber.mainBalance;
    result.ls=json.metadata.subscriberInfo.subscriber.accountNumber;
	result.phone=json.metadata.subscriberInfo.subscriber.phone.replace(/(.*)(\d{3})(\d{3})(\d\d)(\d\d)$/, '+7 $2 $3-$4-$5');
    result.__tariff=json.metadata.subscriberInfo.subscriber.tariff+' | '+state[json.metadata.subscriberInfo.subscriber.status]||json.metadata.subscriberInfo.subscriber.status;
    if (json.metadata.subscriberInfo.discounts)
		getCouners(json.metadata.subscriberInfo.discounts);
    if (json.metadata.subscriberInfo.resourceBalances)
		getCouners(json.metadata.subscriberInfo.resourceBalances);
    if (AnyBalance.isAvailable('abon')){
	    var json = callApi('api/v1.0/manage/tariff/current/' + prefs.login);
    	result.__tariff=result.__tariff.replace('|',json.metadata.shortDescription+' |');
	    json=json.metadata.keyFeatures;
	    json.filter(c=>c.key=='Абонентская плата');
	    if (json.length) result.abon=json[0].value;
    }
                                                                         	
    function getCouners(val){
        AnyBalance.trace('Remainders '+ JSON.stringify(val));
        for(var i=0; i<val.length; ++i){
        	var rem = val[i];
        	if(rem.metadata.unitTypeId == 1||rem.metadata.valueTypeId==1)//минуты
        		setCounter(rem,'min')
        	else if(rem.metadata.unitTypeId == 2||rem.metadata.valueTypeId==3)//SMS
        		setCounter(rem,'sms')
// 	    	else if(rem.metadata.unitTypeId == 5)//Баланс
// 	    		setCounter(rem,'traffic')
        	else if(rem.metadata.unitTypeId == 3||rem.metadata.valueTypeId==6)//Мегабайты
        		setCounter(rem,'traffic')
        	else
        		AnyBalance.trace('Unknown remainder: ' + JSON.stringify(rem));
        }
    }

    function setCounter(rem,counter){
       	if (!cc[counter])
    		cc[counter]=1;
    	else 
	    	cc[counter]+=1;
   	    if (rem.metadata.max)
   	    	result[counter+'_left'+cc[counter]]=(rem.metadata.max-rem.metadata.value).toFixed(1);
   	    else
   	    	result[counter+'_left'+cc[counter]]=(rem.metadata.value).toFixed(1);
   	    if (prefs.needPref||!AnyBalance.isAvailable(counter+'_left'+cc[counter]))
   	    	result[counter+'_left_name'+cc[counter]]=(rem.title+': ');
    		
        var dat=getParam(rem.metadata.endDate.replace(/(\d*)-(\d*)-(\d*)(T[\s\S]*)/,'$3.$2.$1'), null, null, null, null, parseDate);
        if (dat&&(!result.dateOfExpire||dat>result.dateOfExpire))
	    	result.dateOfExpire=dat;
    }

    AnyBalance.setResult(result);
}
