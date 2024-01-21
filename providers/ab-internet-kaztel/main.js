
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.7,en;q=0.4',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Origin': 'https://telecom.kz',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

var baseurl = "https://telecom.kz/ru/";
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function generateUUID(){
	function s4() {
  		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
  	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function saveTokens(json){
	AnyBalance.setData('accessToken', json.access_token);
    AnyBalance.setData('expiredAt', json.expired_at);
	AnyBalance.setData('abonentId', json.abonent_id);
	AnyBalance.setData('clientId', json.client_id);
	AnyBalance.saveData();
}

function callApi(verb, params){
	var accessToken = AnyBalance.getData('accessToken');
	var xsrfToken = AnyBalance.getData('xsrfToken');
	
	var method = 'GET', headers = g_headers;
	if(params){
		method = 'POST';
		headers['Content-Type'] = 'application/json';
	}
	
	headers['Accept'] = 'application/json, text/plain, */*';
	headers['X-Xsrf-Token'] = xsrfToken;
	
	if(/\/auth\/|\/account\/login/i.test(verb)){
		headers['Authorization'] = 'Bearer';
		headers['Referer'] = baseurl + 'customer/by-login';
	}else{
		headers['Authorization'] = 'Bearer ' + accessToken;
		headers['Referer'] = baseurl + 'account/main';
	}
	
	AnyBalance.trace('Запрос: ' + baseurl + verb);
	var html = AnyBalance.requestPost(baseurl + verb, JSON.stringify(params), headers, {HTTP_METHOD: method});
	if(!html || AnyBalance.getLastStatusCode() >= 500){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	var json = getJson(html);
	AnyBalance.trace('Ответ: ' + JSON.stringify(json));
	if(json.error || json.errors || json.message || AnyBalance.getLastStatusCode() == 401){
		var error =  json.error || (json.errors.login || json.errors.phone || []).map(function(e) { return e }).join('\n') || json.message;
		if(error)
			throw new AnyBalance.Error(error, null, /логин|телефон|парол/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}

	return json;
}

function loginPure(action, params, method){
	var prefs = AnyBalance.getPreferences(), json;
	
    var veriUserId = AnyBalance.getData('veriUserId');
	if(!veriUserId){
		var veriUserId = generateUUID();
	    AnyBalance.setData('veriUserId', veriUserId);
		AnyBalance.saveData();
    }
	
	AnyBalance.setCookie('telecom.kz', 'veri_user_id', veriUserId, {path: '/', persistent: true});
	
	var html = AnyBalance.requestGet(baseurl + 'customer/auth/login', g_headers);
	
	var xsrfToken = AnyBalance.getCookie('XSRF-TOKEN');
	
	AnyBalance.setData('xsrfToken', xsrfToken);
	AnyBalance.saveData();
	
    var json = callApi('api/v1.0/account/login?filial_id=0&account_id=0&account_local_id=0', {"login": prefs.login, "password": prefs.password, "type": 0});

    if(!json || !json.access_token){
    	AnyBalance.trace(JSON.stringify(json));
    	throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
    }

	var accessToken = json.access_token;
	AnyBalance.trace('Токен авторизации получен');
	
	AnyBalance.setData('login', prefs.login);
	AnyBalance.saveCookies();
	AnyBalance.saveData();
	saveTokens(json);
}

function loginAccessToken(){
	var prefs = AnyBalance.getPreferences();
	try{
	    AnyBalance.trace('Токен сохранен. Пробуем войти...');
		var json = callApi('api/v1.0/account/rest_api/get_abonent_info');
		AnyBalance.trace('Успешно вошли по accessToken');
		return true;
	}catch(e){
		AnyBalance.trace('Не удалось войти по accessToken: ' + e.message);
		return false;
	}
}

function loginRefreshToken(){
	var prefs = AnyBalance.getPreferences();
	try{
		AnyBalance.trace('Токен устарел. Пробуем обновить...');
		var json = callApi('api/v1.0/account/refresh_token');
		AnyBalance.trace('Успешно обновили accessToken');
		AnyBalance.saveCookies();
		saveTokens(json);
		return true;
	}catch(e){
		AnyBalance.trace('Не удалось обновить accessToken: ' + e.message);
		clearAllCookies();
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
	checkEmpty(prefs.password, 'Введите пароль!');

    AnyBalance.restoreCookies();
	
	login();

	var result = {success: true};
	
	var json;
	
	json = callApi('api/v1.0/account/realsoft/register');
	
	getParam(json.balance, result, 'balance', null, null, parseBalance);
	getParam(json.toPay, result, 'topay', null, null, parseBalance);
	getParam(json.abonentId, result, 'licschet');
	var abonentId = json.abonentId || AnyBalance.getData('abonentId');
    
	json = callApi('api/v1.0/account/rest_bittl/get_abonent_device_list?deviceNameList[]=internet');
	
	if(json.internet.length && json.internet.length > 0){
		AnyBalance.trace('Найдено устройств: ' + json.internet.length);
	    for(var i = 0; i<json.internet.length; i++){
			var internet = json.internet[i];
			
			sumParam(internet.packetTypeName, result, '__tariff', null, null, null, create_aggregate_join(', '));
			sumParam(internet.internetLogin, result, 'login', null, null, null, create_aggregate_join(',\n '));
			
			var accountUserId = internet.accountUserId;
			
			if(AnyBalance.isAvailable(['traffic_input', 'traffic_output']) && accountUserId){
				var dt = new Date();
		        var dtReport = dt.getFullYear() + n2(dt.getMonth()+1);
			    var detail = callApi('api/v1.0/account/mongodb/get_traffic_details_by_internet_device?report_date_id=' + dtReport + '&account_usr_id=' + accountUserId);
	            
	            if(detail.length && detail.length > 0){
		            AnyBalance.trace('Найдено записей детализации: ' + detail.length);
	                for(var j = 0; j<detail.length; j++){
			            var d = detail[j];
					    
					    sumParam(d.acctInputOctets + ' Mb', result, 'traffic_input', null, null, parseTraffic, aggregate_sum);
					    sumParam(d.acctOutputOctets + ' Mb', result, 'traffic_output', null, null, parseTraffic, aggregate_sum);
		            }
	            }else{
		            AnyBalance.trace('Не удалось получить информацию по детализации');
	            }
			}
		}
	}else{
		AnyBalance.trace('Не удалось получить информацию по устройствам');
	}
	
	if(AnyBalance.isAvailable('payment_period')){
	    var dt = new Date();
	    var monthes = {0: 'Январь', 1: 'Февраль', 2: 'Март', 3: 'Апрель', 4: 'Май', 5: 'Июнь', 6: 'Июль', 7: 'Август', 8: 'Сентябрь', 9: 'Октябрь', 10: 'Ноябрь', 11: 'Декабрь'};
	    getParam(monthes[dt.getMonth()] + ' ' + dt.getFullYear(), result, 'payment_period');
	}
	
	if(AnyBalance.isAvailable('overpayment', 'accrued', 'paid', 'bill')){
	    json = callApi('api/v1.0/account/rest_bittl/get_bill_list?reportDateId=1');
	    
	    if(json.length && json.length > 0){
		    AnyBalance.trace('Найдено выставленных счетов: ' + json.length);
	        for(var i = 0; i<json.length; i++){
			    var b = json[i];
	            
	            getParam(b.inMoney, result, 'overpayment', null, null, parseBalance);
	            getParam(b.credit, result, 'accrued', null, null, parseBalance);
	            getParam(b.debit, result, 'paid', null, null, parseBalance);
	            getParam(b.billId, result, 'bill');
			    
			    break;
		    }
	    }else{
		    AnyBalance.trace('Не удалось получить информацию по выставленным счетам');
	    }
	}
	
	if(AnyBalance.isAvailable('last_oper_date', 'last_oper_sum', 'last_oper_type')){
	    json = callApi('api/v1.0/account/rest_api/get_payment_list?reportDateId=1');
	    
	    if(json.length && json.length > 0){
		    AnyBalance.trace('Найдено платежей: ' + json.length);
	        for(var i = 0; i<json.length; i++){
			    var p = json[i];
	            
	            getParam(p.orderDate, result, 'last_oper_date', null, null, parseDate);
	            getParam(p.money, result, 'last_oper_sum', null, null, parseBalance);
	            getParam(p.moneyTypeName, result, 'last_oper_type', null, [/\?/g, '"']);
			    
			    break;
		    }
	    }else{
		    AnyBalance.trace('Не удалось получить информацию по платежам');
	    }
	}
    	
	if(AnyBalance.isAvailable('address', 'email', 'phone', 'fio')){
	    json = callApi('api/v1.0/account/rest_api/get_abonent_info');
	
	    getParam(json.address, result, 'address');
		getParam(json.email, result, 'email');
	    getParam(json.mobilePhone, result, 'phone', null, replaceNumber);
	    getParam(json.name, result, 'fio', null, null, capitalFirstLetters);
	}
	
	AnyBalance.setResult(result);
}
