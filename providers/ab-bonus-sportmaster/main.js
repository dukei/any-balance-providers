/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function generateUUID() {
	function s4() {
  		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
  	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function saveTokens(json){
	AnyBalance.setData('accessToken', json.token.accessToken);
	AnyBalance.setData('refreshToken', json.token.refreshToken);
    AnyBalance.setData('expiresIn', json.token.expiresIn);
	AnyBalance.saveData();
}

function callApi(action, params, method){
	var prefs = AnyBalance.getPreferences();
	
	var deviceId = AnyBalance.getData('deviceId');
	var userId = AnyBalance.getData('userId');
	var sityId = AnyBalance.getData('sityId');
	var accessToken = AnyBalance.getData('accessToken');
	
	var headers = {
        'user-agent': 'android-4.6.0(29432)',
        'locale': 'ru',
        'country': 'RU',
        'device-id': deviceId,
        'installation-id': 'E08E77B2-1AFC-412B-858A-8AE991A9FD3D',
        'x-request-id': generateUUID(),
    	'sity-id': sityId,
    	'x-user-id': userId,
        'accept-encoding': 'gzip'
    };

    if(accessToken){
    	headers['authorization'] = accessToken;
    }

	if(params){
		headers['Content-Type'] = 'application/json; charset=UTF-8';
	}else{
		headers['Content-Type'] = 'application/json';
	}
	
	AnyBalance.trace ('Запрос: ' + action);
	var html = AnyBalance.requestPost('https://mp4x-api.sportmaster.ru/api/v1/' + action, params ? JSON.stringify(params) : null, headers, {HTTP_METHOD: method || 'GET'});
	var json = getJson(html);
	AnyBalance.trace ('Ответ: ' + JSON.stringify(json));
	if(json.error){
		AnyBalance.trace(html);
		throw new AnyBalance.Error(json.error.message, null, /телефон|код/i.test(json.error.message));
	}
		
	return json.data;
}

function loginPure(action, params, method){
	var prefs = AnyBalance.getPreferences(), json;
	
	var deviceId = AnyBalance.getData('deviceId');
	if(!deviceId){
		deviceId = generateUUID();
		AnyBalance.setData('deviceId', deviceId);
		AnyBalance.saveData();
	}
	
	var userId = AnyBalance.getData('userId');
	var sityId = AnyBalance.getData('sityId');
	if(!userId){
		var prefs = AnyBalance.getPreferences();
		userId = generateUUID();
		AnyBalance.setData('userId', userId);
		AnyBalance.saveData();
	}

	var accessToken = AnyBalance.getData('accessToken');
    var json = callApi('auth/anonym', {device: {id: deviceId, os :'android'}}, 'POST');
	AnyBalance.setData('userId', json.profile.id);
	AnyBalance.setData('sityId', json.profile.city.id);
	AnyBalance.setData('loginType', json.profile.type);
	AnyBalance.saveData();
	saveTokens(json);

    if(!json || !json.token.accessToken){
    	AnyBalance.trace(JSON.stringify(json));
    	throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
    }
	
    var json = callApi('verify/sendSms', {phone: {countryCode: '7', nationalNumber: prefs.login, isoCode: 'RU'}, operation: 'search_account', communicationChannel: 'SMS'}, 'POST');

    var requestId = json.requestId;
	var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер +7' + prefs.login, null, {inputType: 'number', time: 180000});

    var json = callApi('verify/check', {requestId: requestId, code: code}, 'POST');
	var authToken = json.token;

    var json = callApi('auth/isPhoneExists', {token: authToken}, 'POST');
	if(json.isPhoneExists !== true){
    	throw new AnyBalance.Error('Профиль с указанным номером телефона не существует!');
    }
		
	var json = callApi('auth/signInBySms', {token: authToken}, 'POST');
	AnyBalance.setData('login', prefs.login);
	AnyBalance.setData('userId', json.profile.id);
	AnyBalance.setData('loginType', json.profile.type);
	AnyBalance.saveData();
	saveTokens(json);
}

function loginAccessToken(){
	var accessToken = AnyBalance.getData('accessToken');
	try{
	    AnyBalance.trace('Токен сохранен. Пробуем войти...');
		var json = callApi('profile');
		AnyBalance.trace('Успешно вошли по accessToken');
		return true;
	}catch(e){
		AnyBalance.trace('Не удалось войти по accessToken: ' + e.message);
		return false;
	}
}

function loginRefreshToken(){
	var refreshToken = AnyBalance.getData('refreshToken');
	var deviceId = AnyBalance.getData('deviceId');
	try{
		AnyBalance.trace('Токен устарел. Пробуем обновить...');
		AnyBalance.setData('accessToken', undefined);
		AnyBalance.saveData();
		var json = callApi('auth/refresh', {refreshToken: refreshToken, deviceId: deviceId}, 'POST');
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
	
	if(AnyBalance.getData('accessToken') && (AnyBalance.getData('loginType') !== 'registered')){
		AnyBalance.trace('Токен соответствует начальной авторизации');
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

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    AB.checkEmpty(prefs.login, 'Введите номер телефона!');
    AB.checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона - 10 цифр без пробелов и разделителей!');

    var json;
	
	login();

    var result = {success: true};
	
	if(AnyBalance.isAvailable('balance', 'cashback', 'promo', 'currlevel', 'cashlevel', '__tariff', 'cardnum', 'sumtill', 'till')){
		var json = callApi('bonus/shortInfo');
		json = json.info;

		AB.getParam(json.totalAmount, result, 'balance', null, null, parseBalance);
        AB.getParam(json.cashAmount, result, 'cashback', null, null, parseBalance);
		AB.getParam(json.promoAmount, result, 'promo', null, null, parseBalance);
		var curLevel = AB.getParam(json.bonusLevel.name, result, 'currlevel');
		var cashLevel = AB.getParam(json.cashLevel, result, 'cashlevel');
		result.__tariff = curLevel + ' | ' + cashLevel + '%';
	    AB.getParam(json.clubCard.barcode, result, 'cardnum');
		if (json.details.length){
		    AB.getParam(json.details[0].amount, result, 'sumtill', null, null, parseBalance);
		    AB.getParam(json.details[0].dateEnd.replace(/(\d{4})-(\d\d)-(\d\d)/,'$3.$2.$1'), result, 'till', null, null, parseDate);
		}
	}

    if(AnyBalance.isAvailable('buysum', 'nexlevel', 'nextlevel')){
    	var json = callApi('bonus/progress');
        json = json.progress;

        AB.getParam((json.buySumma.value)/100, result, 'buysum', null, null, parseBalance);
	    if (json.nextLevel && json.nextLevel.name){
		    AB.getParam(json.nextLevel.name, result, 'nexlevel');
		}else{
			result.nexlevel = 'Достигнут';
		}
		if (json.toNextLevelSumma && json.toNextLevelSumma.value){
		    AB.getParam((json.toNextLevelSumma.value)/100, result, 'nextlevel', null, null, parseBalance);
		}
    }

    if(AnyBalance.isAvailable('fio', 'phone')){
		var json = callApi('profile');
		json = json.profile;
		
        var fio = json.anketa.firstName;
	    if (json.anketa.lastName)
	    	fio+=' '+json.anketa.lastName;
	    AB.getParam(fio, result, 'fio');
	    AB.getParam(json.phone.nationalNumber, result, 'phone', null, replaceNumber);
	}
	
	if(AnyBalance.isAvailable('last_oper_date', 'last_oper_sum', 'last_oper_desc')){
	    var dt = new Date();
		dtBegin = dt.getFullYear() - 1 + '-' + ('0' + (dt.getMonth() + 1)).slice(-2) + '-' + ('0' + (dt.getDate())).slice(-2);
		dtEnd = dt.getFullYear() + '-' + ('0' + (dt.getMonth() + 1)).slice(-2) + '-' + ('0' + (dt.getDate())).slice(-2);
		
		var json = callApi('bonus/history?dateBegin=' + dtBegin + '&dateEnd=' + dtEnd);
		json = json.list;
		
        if(json.length){
        	var t = json[0];
        	AB.getParam(t.date.replace(/(\d{4})-(\d\d)-(\d\d)/,'$3.$2.$1'), result, 'last_oper_date', null, null, parseDate);
        	AB.getParam(t.summa, result, 'last_oper_sum', null, null, parseBalance);
        	AB.getParam(t.transDesc, result, 'last_oper_desc');
        }else{
			AnyBalance.trace('Последняя операция не найдена');
		}
	}
	
    if(AnyBalance.isAvailable('last_order_date', 'last_order_number', 'last_order_status', 'last_order_sum')){
        var json = callApi('orderHistory');
		json = json.orders;
		
        if(json.length){
        	var o = json[0];
        	AB.getParam(o.date.replace(/(\d{4})-(\d\d)-(\d\d)/,'$3.$2.$1'), result, 'last_order_date', null, null, parseDate);
        	AB.getParam(o.number, result, 'last_order_number');
        	AB.getParam((o.totalSum.value)/100, result, 'last_order_sum', null, null, parseBalance);
        	AB.getParam(o.status.statusText, result, 'last_order_status');
        }else{
			AnyBalance.trace('Последний заказ не найден');
		}
    }

    AnyBalance.setResult(result);
}
