/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'ru-RU,ru;q=0.9',
	'Build': '1.0',
	'Connection': 'keep-alive',
	'Mobile-Brand': 'YOTA-001',
	'Origin': 'https://web.yota.ru',
    'Osversion': 'chrome-115',
    'Platform': '4',
    'Referer': 'https://web.yota.ru/',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
};

var g_status = {
	'ACTIVE': 'Номер не блокирован',
	'INACTIVE': 'Номер не активен',
	'BLOCKED': 'Номер заблокирован',
	undefined: 'Неизвестен'
};
	
var baseurl = 'https://mapi.yota.ru/';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function generateUUID() {
	function s4() {
  		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
  	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function main(){
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
    
	checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона - 10 цифр без пробелов и разделителей!');
	
	AnyBalance.trace('Пробуем войти в личный кабинет...');
		
	var token = AnyBalance.getData(prefs.login + 'token');
		
	AnyBalance.restoreCookies();

    var html = AnyBalance.requestGet(baseurl + 'customer/profile', addHeaders({
		'X-Secure-Authorization': token,
	    'X-Transactionid': generateUUID()
	}));
		
	if(!html || AnyBalance.getLastStatusCode() >= 500){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	AnyBalance.trace('customer/profile: ' + html);
		
	if(AnyBalance.getLastStatusCode() == 403 || /Forbidden/i.test(html) || !/EXISTING_CLIENT/i.test(html)){
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
	
	    var html = AnyBalance.requestPost(baseurl + 'general/otp/auth/generate', JSON.stringify({
            "credentials": {
                "operationId": "iOS_mAPP_Auth_eSim",
                "msisdn": "7" + prefs.login
            },
            "channel": "SMS"
        }), addHeaders({'Content-Type': 'application/json', 'X-Transactionid': generateUUID()}));
		
		AnyBalance.trace('general/otp/auth/generate: ' + html);
	
	    var json = getJson(html);
		
		if(json.code){
	    	var error = json.message;
            if(error){
				if(/Incorrect Msisdn/i.test(error)){
                    throw new AnyBalance.Error('Номер некорректный или еще не зарегистрирован', null, true);
				}else{
					throw new AnyBalance.Error(error, null, /Incorrect/i.test(error));
				}
			}
	    
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }
		
		var formattedLogin = json.credentials.msisdn.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '+7 $1 $2-$3-$4');
		
		var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер ' + formattedLogin, null, {inputType: 'number', time: 300000});
		
		html = AnyBalance.requestPost(baseurl + 'general/otp/auth/check', JSON.stringify({
            "credentials": {
                "operationId": "iOS_mAPP_Auth_eSim",
                "msisdn": "7" + prefs.login
            },
            "password": code,
            "device": g_headers['User-Agent']
        }), addHeaders({'Content-Type': 'application/json', 'X-Transactionid': generateUUID()}));
		
		AnyBalance.trace('general/otp/auth/check: ' + html);
		
		var json = getJson(html);
		
		if(!json.success){
	    	var error = json.message;
            if(error)
                throw new AnyBalance.Error(error, null, /Incorrect|code/i.test(error));
			if(json.remainedAttempts)
				throw new AnyBalance.Error('Неверный код. Осталось попыток: ' + json.remainedAttempts, null, true);
	    
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }
		
		var token = json.token;
		
		if(!token){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
		}
		
		html = AnyBalance.requestGet(baseurl + 'customer/profile', addHeaders({
		    'X-Secure-Authorization': 'Basic ' + token,
			'X-Transactionid': generateUUID()
	    }));
	
	    AnyBalance.trace('customer/profile: ' + html);
		
		AnyBalance.setData(prefs.login + 'token', 'Basic ' + token);
	    AnyBalance.saveCookies();
	    AnyBalance.saveData();
    }else{
	    AnyBalance.trace('Сессия сохранена. Входим автоматически...');
		
		AnyBalance.saveCookies();
	    AnyBalance.saveData();
    }
	
	var result = {success: true};
	
	var json = getJson(html);
	
	var token = AnyBalance.getData(prefs.login + 'token');
	
	getParam(json.carrierProfile && json.carrierProfile.balance, result, 'balance', null, null, parseBalance);
    var status = json.context && json.context.features && json.context.features.carrierClientStatus;
	getParam(g_status[status]||status, result, 'status');
	getParam(json.context && json.context.msisdn, result, '__tariff', null, replaceNumber);
    getParam(json.context && json.context.msisdn, result, 'phone', null, replaceNumber);
	
	
	html = AnyBalance.requestGet(baseurl + 'customer/carrierProductsProfile', addHeaders({
		'X-Secure-Authorization': token,
	    'X-Transactionid': generateUUID()
	}));
	
	var json = getJson(html);
	
	var products = json.currentProductConfiguration && json.currentProductConfiguration.products;
	
	if(products && products.length > 0){
	    AnyBalance.trace('Найдено подключенных продуктов: ' + products.length);

        for(var i=0; i<products.length; ++i){
            var p = products[i];
            AnyBalance.trace('Найден продукт ' + p.offerCode + ' (' + p.productType + '): ' + JSON.stringify(p));
		    
		    if(p.productType == 'BASE'){
			    AnyBalance.trace('Это базовые пакеты без остатков, пропускаем...');
			    continue;
		    }else if(p.productType == 'REGULAR_PRODUCT'){
			    AnyBalance.trace('Это текущие пакеты с остатками, обрабатываем...');
				getParam(p.cost.finalCost, result, 'abon', null, null, parseBalance);
			    for(var j=0; j<p.resources.length; ++j){
                    var r = p.resources[j];
				    AnyBalance.trace('Найден пакет ' + r.productSpecCode + ' (' + r.resourceType + ')');
				    if(r.resourceType == 'DATA'){
					    AnyBalance.trace('Это интернет');
					    for(var k=0; k<r.characteristicsList.length; ++k){
                            var a = r.characteristicsList[k].fixedValue.accumulator;
						    AnyBalance.trace('Остатки по пакету: ' + JSON.stringify(a));
                            if(a.isUnlim){
            	                AnyBalance.trace('Это безлимитный трафик, пропускаем...');
            	                continue;
                            }
                            sumParam(a.value + ' ' + a.unit, result, 'traffic_left', null, null, parseTraffic, aggregate_sum);
						    sumParam(a.capacity + ' ' + a.unit, result, 'traffic_total', null, null, parseTraffic, aggregate_sum);
							sumParam((a.capacity - a.value) + ' ' + a.unit, result, 'traffic_used', null, null, parseTraffic, aggregate_sum);
					    }
				    }else if(r.resourceType == 'VOICE'){
					    AnyBalance.trace('Это минуты');
					    for(var k=0; k<r.characteristicsList.length; ++k){
                            var a = r.characteristicsList[k].fixedValue.accumulator;
						    AnyBalance.trace('Остатки по пакету: ' + JSON.stringify(a));
						    if(a.isUnlim){
            	                AnyBalance.trace('Это безлимитные минуты, пропускаем...');
            	                continue;
                            }
                            sumParam(a.value, result, 'min_left', null, null, parseMinutes, aggregate_sum);
						    sumParam(a.capacity, result, 'min_total', null, null, parseMinutes, aggregate_sum);
							sumParam(a.capacity - a.value, result, 'min_used', null, null, parseMinutes, aggregate_sum);
					    }
				    }else if(r.resourceType == 'SMS'){
					    AnyBalance.trace('Это SMS');
					    for(var k=0; k<r.characteristicsList.length; ++k){
                            var a = r.characteristicsList[k].fixedValue.accumulator;
						    AnyBalance.trace('Остатки по пакету: ' + JSON.stringify(a));
						    if(a.isUnlim){
            	                AnyBalance.trace('Это безлимитные SMS, пропускаем...');
            	                continue;
                            }
                            sumParam(a.value, result, 'sms_left', null, null, parseBalance, aggregate_sum);
						    sumParam(a.capacity, result, 'sms_total', null, null, parseBalance, aggregate_sum);
							sumParam(a.capacity - a.value, result, 'sms_used', null, null, parseBalance, aggregate_sum);
					    }
				    }else{
                        AnyBalance.trace('Неизвестный пакет: ' + JSON.stringify(r));
                    }
                }
				getParam(p.duration.begin, result, 'packet_start', null, null, parseDateISO);
				getParam(p.duration.end, result, 'packet_till', null, null, parseDateISO);
				getParam(p.duration.end, result, 'next_pay_date', null, null, parseDateISO);
		    }else if(p.productType == 'ROAMING_TRAFFIC'){
			    AnyBalance.trace('Это доступные пакеты в роуминге, обрабатываем...');
                for(var j=0; j<p.resources.length; ++j){
                    var r = p.resources[j];
				    AnyBalance.trace('Найден пакет ' + r.productSpecCode + ' (' + r.resourceType + ')');
				    if(r.resourceType == 'DATA'){
					    AnyBalance.trace('Это интернет в роуминге');
					    for(var k=0; k<r.characteristicsList.length; ++k){
                            var a = r.characteristicsList[k].fixedValue.accumulator;
						    AnyBalance.trace('Остатки по пакету: ' + JSON.stringify(a));
                            if(a.isUnlim){
            	                AnyBalance.trace('Это безлимитный трафик, пропускаем...');
            	                continue;
                            }
                            sumParam(a.value + ' ' + a.unit, result, 'traffic_left_roam', null, null, parseTraffic, aggregate_sum);
						    sumParam(a.capacity + ' ' + a.unit, result, 'traffic_total_roam', null, null, parseTraffic, aggregate_sum);
							sumParam((a.capacity - a.value) + ' ' + a.unit, result, 'traffic_used_roam', null, null, parseTraffic, aggregate_sum);
					    }
				    }else{
                        AnyBalance.trace('Неизвестные пакеты: ' + JSON.stringify(r));
                    }
                }
		    }else{
                AnyBalance.trace('Неизвестный продукт: ' + JSON.stringify(p));
            }
        }
	}else{
		AnyBalance.trace('Не удалось получить информацию по продуктам и остаткам');
	}
	
    AnyBalance.setResult(result);
}
