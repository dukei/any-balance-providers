/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': '*/*',
	'Accept-Language': 'ru-RU,ru;q=0.9',
	'Connection': 'keep-alive',
    'Origin': 'https://planeta.tc',
    'Referer': 'https://planeta.tc/',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
};

function callApi(verb, params, method){
	var accessToken = AnyBalance.getData('accessToken');
	var headers = g_headers;
	
	if(params || params == 'null'){
		method = 'POST';
		headers['Content-Type'] = 'application/json';
	}
	
	if(accessToken){
		headers['Authorization'] = 'Bearer ' + accessToken;
	}
	
	AnyBalance.trace('Запрос: ' + (/password=/i.test(verb) ? verb.replace(/password=([\s\S]*?)$/i, 'password=**********') : verb));
	var html = AnyBalance.requestPost('https://api.planeta.tc/' + verb, params ? JSON.stringify(params) : null, headers, {HTTP_METHOD: method || 'GET'});
	var json = getJson(html);
	AnyBalance.trace('Ответ: ' + JSON.stringify(json));
	if(json.Status){
		var error = json.Title;
		if(error)
			throw new AnyBalance.Error(error, null, /договор|парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}

	return json;
}

function loginPure(verb, params, method){
	var prefs = AnyBalance.getPreferences();
	
	var login = prefs.login.replace(/\D/g, '');
	
	var json = callApi('Security/Auth/AuthByPassword?contractName=' + login + '&password=' + prefs.password, null, 'POST');

    if(!json.token){
    	AnyBalance.trace(JSON.stringify(json));
    	throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
    }
	
	AnyBalance.setData('login', prefs.login);
	AnyBalance.setData('pass', prefs.password);
	AnyBalance.setData('accessToken', json.token);
    AnyBalance.setData('contractId', json.contractId);
	AnyBalance.saveData();
}

function loginAccessToken(){
	var prefs = AnyBalance.getPreferences();
	var accessToken = AnyBalance.getData('accessToken');
	try{
	    AnyBalance.trace('Токен сохранен. Пробуем войти...');
		var json = callApi('Security/Auth/CheckAuth');
		AnyBalance.trace('Успешно вошли по accessToken');
		return true;
	}catch(e){
		AnyBalance.trace('Не удалось войти по accessToken: ' + e.message);
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
	
	if(AnyBalance.getData('accessToken') && (AnyBalance.getData('pass') !== prefs.password)){
		AnyBalance.trace('Токен соответствует другому паролю');
		return false;
	}

	if(loginAccessToken()){
		return true;
	}else{
		AnyBalance.trace('Токен устарел. Будем логиниться заново');
		return loginPure();
	}
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

	var result = {success: true};
	
	var json = callApi('Finances/Contract/GetContractInfo');
	
	getParam(json.balance, result, 'balance', null, null, parseBalance);
	getParam(json.contractName, result, 'licschet');
	getParam(json.clientName, result, 'fio');
	
	var address = json.dotConnectionAddress || '';
	
	if(!address && json.dotInfo){
		if(json.dotInfo.streetName)
			address += json.dotInfo.streetName;
		if(json.dotInfo.buildingName)
			address += ', д. ' + json.dotInfo.buildingName;
		if(json.dotInfo.roomName)
			address += ', кв. ' + json.dotInfo.roomName;
	}
	
	getParam(address, result, 'address');
	
	var json = callApi('Finances/Contract/GetBalance');
	
	getParam(json.chatleBudgetSaldo, result, 'chatles', null, null, parseBalance);
	getParam(json.moneyRecommended, result, 'recommended_sum', null, null, parseBalance);
	getParam(json.tariffDayTax, result, 'tariff_day_tax', null, null, parseBalance);
	
	var json = callApi('Tax/Tax/GetContractTariff');
	
	var tariffId = json.tariffId;
	
	var json = callApi('Summary/Summary/GetSummaryByTariffId?tariffId=' + tariffId);
	
	getParam(json.marketingGroupName ? json.seriesName + ' | ' + json.marketingGroupName : json.seriesName, result, '__tariff');
	getParam(json.speedBaseText||0, result, 'tariff_speed', null, null, parseBalance);
	result.speedunit = json.speedBaseText.replace(/\d+|\s*/g, '');
	getParam((json.channelsInfo && json.channelsInfo.channelCount)||0, result, 'tariff_channels', null, null, parseBalance);
	
	if(AnyBalance.isAvailable('devices')){
		var json = callApi('Device/ContractDevice/GetContractDevices');
		if(json && json.length > 0){
			AnyBalance.trace('Найдено подключенных устройств: ' + json.length);
		    for(var i=0; i<json.length; ++i){
			    var dev = json[i];
			    sumParam(dev.modelName, result, 'devices', null, null, null, create_aggregate_join(',\n '));
			}
		}else{
		    AnyBalance.trace('Не удалось получить информацию по устройствам');
		    result.devices = 'Нет устройств';
	    }
	}
	
	if(AnyBalance.isAvailable('ip_address')){
		var json = callApi('Net/Net/GetResourceNetAll');
		if(json && json.length > 0){
			AnyBalance.trace('Найдено IP-адресов: ' + json.length);
		    for(var i=0; i<json.length; ++i){
			    var ip = json[i];
			    sumParam(ip.presentContent, result, 'ip_address', null, null, null, create_aggregate_join(',\n '));
			}
		}else{
		    AnyBalance.trace('Не удалось получить информацию по IP-адресам');
		    result.ip_address = 'Нет данных';
	    }
	}
	
	if(isAvailable(['last_oper_date', 'last_oper_sum', 'last_oper_desc'])){
	    var dt = new Date();
	    var dtPrev = new Date(dt.getFullYear(), dt.getMonth()-3, '01');
	    var dateFrom = dtPrev.getFullYear() + '-' + n2(dtPrev.getMonth()+1) + '-' + n2(dtPrev.getDate());
	    var dateTo = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + n2(dt.getDate());
		
		var json = callApi('Finances/Contract/GetMoneyHistory?fromDate=' + dateFrom + '&trimDate=' + dateTo);
		
		if(json && json.length > 0){
			AnyBalance.trace('Найдено операций: ' + json.length);
			var operType = {'Выписка': 'Пополнение счета', 'Акт': 'Списание по счету'};
			for(var i=0; i<json.length; ++i){
				var info = json[i];
				
				getParam(operType[info.metaDocumentName]||info.metaDocumentName, result, 'last_oper_desc');
				getParam(info.date, result, 'last_oper_date', null, null, parseDateISO);
				getParam(info.moneySum, result, 'last_oper_sum', null, null, parseBalance);
				
				break;
			}
		}else{
			AnyBalance.trace('Не удалось получить историю операций');
		}
    }
    
    AnyBalance.setResult(result);
}
