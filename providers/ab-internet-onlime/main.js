/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'device-info': 'HUAWEI AUM-L29; Android 8.0.0; Onlime 1.11.11 (1111100)',
    'x-app-versions': '{"version":"3.1.2","bonus":"2.0.0","autopay":"2.0.0"}',
	'android-version': '1111100',
    'content-type': 'application/json',
    'accept-encoding': 'gzip',
    'user-agent': 'okhttp/3.12.13'
};

var baseurl = 'https://mlk.onlime.ru';
var g_savedData;

var g_status = {
	true: 'Активен',
	false: 'Неактивен',
	undefined: ''
};

function callApi(verb, params){
	var sessionId = g_savedData.get('sessionId');
	
	var method = 'GET', headers = g_headers;
	if(params){
		method = 'POST';
		headers['content-type'] = 'application/json; charset=utf-8';
	}
	
	AnyBalance.trace('Запрос: ' + verb);
	var html = AnyBalance.requestPost(baseurl + verb, params ? JSON.stringify(params) : null, headers, {HTTP_METHOD: method});
	var json = getJson(html);
	AnyBalance.trace('Ответ: ' + JSON.stringify(json));
	
	if(json.errorCode && json.errorCode !== 100){ // 100 возвращает с ошибкой "Параметр `device` не указан", но приложение пока не генерирует ни параметр, ни токен, поэтому пропускаем
		var error = json.message || json.errorText;
		if(error)
			throw new AnyBalance.Error(error, null, /логин|парол|код/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}

	return json.result;
}

function main(){
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setDefaultCharset('utf-8');
    
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

    if(!g_savedData)
	    g_savedData = new SavedData('onlime', prefs.login);
	
	var sessionId = g_savedData.get('sessionId');

	g_savedData.restoreCookies();

    AnyBalance.trace ('Пробуем получить данные из мобильного приложения...');
	
	var json;
	
	try{
		json = callApi('/webapi/account/check', {'sessionId': sessionId});
		AnyBalance.trace('Успешно вошли по sessionId');
	}catch(e){
		AnyBalance.trace('Не удалось войти по sessionId: ' + e.message);
		g_savedData.set('sessionId', undefined);
		clearAllCookies();
		
	    AnyBalance.trace('Токен авторизации не сохранен. Логинимся заново...');
	    json = callApi('/webapi/account/login', {'login': prefs.login, 'password': prefs.password});

		var sessionId = json.sessionId;
		
	    json = callApi('/webapi/account/check', {'sessionId': sessionId});
		
		json = callApi('/webapi/notify/device/add', {'device': '', 'token': '', 'type': 1, 'sessionId': sessionId}); // Вероятно, заготовка для привязки устройства
	    
	    g_savedData.set('sessionId', sessionId);
		g_savedData.setCookies();
	    g_savedData.save();
	}

    var result = {success: true};
		
	if(AnyBalance.isAvailable(['balance', 'abon'])){
	    json = callApi('/webapi/account/balance', {'sessionId': sessionId});
	
	    getParam(json.balance, result, 'balance', null, null, parseBalance);
	    getParam(json.monthPayment, result, 'abon', null, null, parseBalance);
		if(json.mvno.cellPhone){
		    getParam(json.mvno.cellPhone, result, 'phone', null, [replaceTagsAndSpaces, /.*(\d{3})(\d{3})(\d{2})(\d{2})/, '+7 $1 $2-$3-$4']);
		    getParam(json.mvno.uniDatePay, result, 'ms_till', null, null, parseDateISO);
		}
	}
	
	if(AnyBalance.isAvailable(['bonus_balance', 'bonus_status', '__tariff'])){
	    json = callApi('/webapi/bonus/balance', {'sessionId': sessionId});
	
	    getParam(json.balance, result, 'bonus_balance', null, null, parseBalance);
	    getParam(json.memberName, result, 'bonus_status');
		getParam(json.memberName, result, '__tariff');
	}
	
	if(AnyBalance.isAvailable(['lock', 'ms_traffic_total', 'ms_traffic_left', 'ms_min_total', 'ms_min_left', 'ms_sms_total', 'ms_sms_left', 'ms_mms_total', 'ms_mms_left'])){
	    json = callApi('/webapi/service/actual', {'sessionId': sessionId});
	    
		getParam(json.daysToLock == 1000 ? 100 : json.daysToLock, result, 'lock', null, null, parseBalance); // Похоже, 1000 используется, как бесконечное значение, в кабинете отображается как 100+
		if(json.daysToLock == 1000){
			result.lockdays = '+ дн';
		}else{
			result.lockdays = ' дн';
		}
		
		var pkgs = json.mvnoPackages && json.mvnoPackages.result;
		
		if(pkgs && pkgs.length>0){
			for(var i = 0; i<pkgs.length; i++){
				var pkg = pkgs[i];
				var name = pkg.name;
				
	        	if (/Интернет|Мегабайт|Гигабайт|Мб|Гб|Mb|Gb/i.test(name)){
					var units = ' Mb';
					getParam(pkg.trafficStart + units, result, 'ms_traffic_total', null, null, parseTraffic);
					getParam(pkg.trafficRemain + units, result, 'ms_traffic_left', null, null, parseTraffic);
		    	}else if (/Минут|Звонки/i.test(name)){
					var units = ' мин';
					getParam(pkg.minutesStart + units, result, 'ms_min_total', null, null, parseMinutes);
					getParam(pkg.minutesRemain + units, result, 'ms_min_left', null, null, parseMinutes);
		    	}else if (/СМС|SMS/i.test(name)){
					var units = ' SMS';
					getParam(pkg.smsStart + units, result, 'ms_sms_total', null, null, parseBalance);
					getParam(pkg.smsRemain + units, result, 'ms_sms_left', null, null, parseBalance);
		    	}else if (/ММС|MMS/i.test(name)){
					var units = ' MMS';
					getParam(pkg.mmsStart + units, result, 'ms_mms_total', null, null, parseBalance);
					getParam(pkg.mmsRemain + units, result, 'ms_mms_left', null, null, parseBalance);
		    	}else{
					AnyBalance.trace('Неизвестный тип услуги: ' + name);
				}
	        }
	    }else{
			AnyBalance.trace('Не удалось получить информацию по мобильной связи');
		}
	}
	
	if(AnyBalance.isAvailable(['license', 'agreement', 'status', 'email', 'phone', 'fio'])){
	    json = callApi('/webapi/account/clientInfo', {'sessionId': sessionId});
	
	    getParam(json.accounts[0].account, result, 'license');
	    getParam(json.accounts[0].contract, result, 'agreement');
	    getParam(g_status[json.accounts[0].active]||json.accounts[0].active, result, 'status');
	    getParam(json.email, result, 'email');
		if(!isset(result.phone))
	        getParam(json.cellPhone, result, 'phone', null, [replaceTagsAndSpaces, /.*(\d{3})(\d{3})(\d{2})(\d{2})/, '+7 $1 $2-$3-$4']);
	    getParam(json.fullname, result, 'fio');
	}
    
	setCountersToNull(result);
	
    AnyBalance.setResult(result);
}