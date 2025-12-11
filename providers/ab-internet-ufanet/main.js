/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для уфимского интернет-провайдера Ufanet

Сайт оператора: https://www.ufanet.ru/
Личный кабинет: https://my.ufanet.ru/
*/

var g_headers = {
    'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'rus',
	'Appkey': 'VHCOMpfkso3Ke2YQNOT7',
	'Connection': 'keep-alive',
	'Content-Type': 'application/json',
	'Origin': 'https://my.ufanet.ru',
    'Referer': 'https://my.ufanet.ru/login',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
};

var g_baseurl = 'https://my.ufanet.ru/';

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    if(prefs.num && !/^\d{5,}$/.test(prefs.num))
        throw new AnyBalance.Error('Введите номер лицевого счета!');
	
	AnyBalance.setOptions({
		SSL_ENABLED_PROTOCOLS: ['TLSv1', 'TLSv1.1', 'TLSv1.2']
	});
	
	AnyBalance.trace('Пробуем войти в личный кабинет...');
	
	AnyBalance.restoreCookies();
	
	var token = AnyBalance.getData('token' + prefs.login);
	var resfresh_token = AnyBalance.getData('resfresh_token' + prefs.login);
	
	AnyBalance.setExceptions(false); // Может не пустить с первого раза по SSL, поэтому отключаем Exceptions на время запроса
	
	var tries = 0;
	do {
		var html = AnyBalance.requestGet(g_baseurl + 'api/v0/contract_info/get_all_contract/', addHeaders({
		    'Authorization': 'JWT ' + token
		}));
	    AnyBalance.trace('Попытка ' + (tries+1) + ': ' + (html ? html : AnyBalance.getLastError()));
	} while (!html && ++ tries < 5);
	
	AnyBalance.setExceptions(true); // Теперь можно включить Exceptions
	
	if(!html || AnyBalance.getLastStatusCode() > 500) {
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	
	if(/Error decoding signature/i.test(html) || AnyBalance.getLastStatusCode() == 401){
		if(resfresh_token){
			AnyBalance.trace('Сессия устарела. Пробуем возобновить...');
			
			var html = AnyBalance.requestPost(g_baseurl + 'api/v0/token/refresh/', JSON.stringify({'refresh': resfresh_token}), g_headers);
		    
		    AnyBalance.trace('Авторизация: ' + html);
		    
			var json = getJson(html);
			
			if(json.error_message || (json.status && json.status !== 'ok')){
				var error = json.error_message;
				if(error)
					throw new AnyBalance.Error(error, null, false);
				
				AnyBalance.trace(html);
				throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
			}
			
			if(!json.detail || (json.detail && !json.detail.access)){
				AnyBalance.trace(html);
				throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
			}
			
			token = json.detail.access;
			resfresh_token = json.detail.refresh;
			
			AnyBalance.setData('token' + prefs.login, token);
		    AnyBalance.setData('resfresh_token' + prefs.login, resfresh_token);
			AnyBalance.saveCookies();
		    AnyBalance.saveData();
		}else{
			AnyBalance.trace('Сессия новая. Будем логиниться заново...');
			
			clearAllCookies();
			
			AnyBalance.setExceptions(false); // Может не пустить с первого раза по SSL, поэтому отключаем Exceptions на время запроса
		    
		    var tries = 0;
	        do {
				var html = AnyBalance.requestGet('https://my.ufanet.ru/login', g_headers);
	            AnyBalance.trace('Попытка ' + (tries+1) + ': ' + (html ? html : AnyBalance.getLastError()));
	        } while (!html && ++ tries < 5);
		    
		    AnyBalance.setExceptions(true); // Теперь можно включить Exceptions
			
			var html = AnyBalance.requestPost(g_baseurl + 'api/v0/token/', JSON.stringify({'login': prefs.login, 'password': prefs.password}), g_headers);
		    
		    AnyBalance.trace('Авторизация: ' + html);
		    
			var json = getJson(html);
			
			if(json.error_message || (json.status && json.status !== 'ok')){
				var error = json.error_message;
				if(error){
					if(/login|password|логин|парол/i.test(error))
						throw new AnyBalance.Error('Неверный логин или пароль!', null, true);
					
					throw new AnyBalance.Error(error, null, false);
				}
				
				AnyBalance.trace(html);
				throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
			}
			
			if(!json.detail || (json.detail && !json.detail.access)){
				AnyBalance.trace(html);
				throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
			}
			
			token = json.detail.access;
			resfresh_token = json.detail.refresh;
			
			AnyBalance.setData('token' + prefs.login, token);
		    AnyBalance.setData('resfresh_token' + prefs.login, resfresh_token);
			AnyBalance.saveCookies();
		    AnyBalance.saveData();
		}
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
	var result = {success: true};
	
	var token = AnyBalance.getData('token' + prefs.login);
	
	var html = AnyBalance.requestGet(g_baseurl + 'api/v0/contract_info/get_all_contract/', addHeaders({
		'Authorization': 'JWT ' + token
	}));
	
	AnyBalance.trace('Список договоров: ' + html);
	
	var json = getJson(html);
	
	AnyBalance.trace('Найдено лицевых счетов: ' + json.detail.contracts.length);
	
	if(json.detail.contracts.length < 1)
		throw new AnyBalance.Error('У вас нет ни одного лицевого счета');
    
	var currContract;
    
	for(var i=0; i<json.detail.contracts.length; ++i){
		var contract = json.detail.contracts[i];
		AnyBalance.trace('Найден лицевой счет ' + contract.title);
	    if(!currContract && (!prefs.num || endsWith(contract.title, prefs.num))){
	    	AnyBalance.trace('Выбран лицевой счет ' + contract.title);
	    	currContract = contract;
	    }
	}
    
	if(!currContract)
		throw new AnyBalance.Error('Не удалось найти лицевой счет ' + prefs.num);
	
	var html = AnyBalance.requestPost(g_baseurl + 'api/v0/contract_info/get_contract_info/', JSON.stringify({
		'contracts': [{contract_id: currContract.contract_id, billing_id: currContract.billing_id}]
	}), addHeaders({
		'Authorization': 'JWT ' + token
	}));
	
	AnyBalance.trace('Данные по договору: ' + html);
	
    var json = getJson(html);
	
	var info = json.detail && json.detail[0];
	
	getParam(info.balance.output_saldo, result, 'balance', null, null, parseBalance);
	getParam(info.balance.recommended, result, 'pay', null, null, parseBalance);
	if(info.balance.expiry_date){
		var expDate = getParam(info.balance.expiry_date*1000, result, 'daysleft', null, null, parseBalanceSilent);
		if (expDate){
			if (AnyBalance.isAvailable('expiresdays')){
			    var days = Math.ceil((expDate - (new Date().getTime())) / 86400 / 1000);
			    if (days >= 0){
			        result.expiresdays = days;
			    }else{
			    	AnyBalance.trace('Дата окончания действия уже наступила');
			    	result.expiresdays = 0;
			    }
			}	
 		}else{
 		    AnyBalance.trace('Не удалось получить дату окончания действия');
 		}
	}
	
	if(info.date_from)
		getParam(info.date_from*1000, result, 'contractdate');
	getParam(info.cashback_sum, result, 'bonuses', null, null, parseBalance);
	getParam(info.contract_title, result, 'licschet');
	getParam(info.contract_status, result, 'status');
	getParam(info.autopayment.title, result, 'autopayment', null, null, capitalFirstLetters);
	getParam(info.customer_name, result, 'fio', null, null, capitalFirstLetters);
	
	var tarif = info.services;
	
	function onlyUnique(value, index, self) {return self.indexOf(value) === index};
	
	if(tarif)
		result.__tariff = tarif.filter(function(s) { return s.service_status == 'Активен'}).map(function(s) { return s.tariff.title}).filter(onlyUnique).join(', ');
    
	var add = info.contract_address;
	var address = '';
	
	if(add.city)
		address += add.city;
	if(add.street)
		address += address ? ', ' + add.street : '';
	if(add.house)
		address += address ? ', ' + add.house : '';
	if(add.flat)
		address += address ? ', ' + add.flat : '';
	
	getParam(address, result, 'adress');
	
	if(AnyBalance.isAvailable('last_oper_date', 'last_oper_sum', 'last_oper_type', 'last_oper_desc')){
		var dt = new Date();
	    var dtPrev = new Date(dt.getFullYear()-1, dt.getMonth(), '01', dt.getHours(), dt.getMinutes(), dt.getSeconds());
	    var dateFrom = Math.floor(new Date(dtPrev).getTime() / 1000);
	    var dateTo = Math.floor(new Date(dt).getTime() / 1000);
		
		var html = AnyBalance.requestGet(g_baseurl + 'api/v0/service_management/get_balance_detail/?contract_id=' + currContract.contract_id + '&billing_id=' + currContract.billing_id + '&date_from=' + dateFrom + '&date_to=' + dateTo + '&COUNT_MONTHS=12', addHeaders({
		    'Authorization': 'JWT ' + token
		}));
        
		AnyBalance.trace('Операции с балансом: ' + html);
        
        var json = getJson(html);
		
		if(json.detail && json.detail.balance_detail){
			var obj = json.detail.balance_detail;
			
			for(var key in obj){
    	        var lastMonth = obj[key];
            }
			
			var dir = '', defaultComm = '', defaultType = 'Баланс счета';
			
			if(lastMonth && lastMonth.length && lastMonth.length > 0){
				AnyBalance.trace('Найдено операций за месяц: ' + lastMonth.length);
				
				for(var i=0; i<lastMonth.length; ++i){
		            var operation = lastMonth[i];
					
					if(operation.type == 'start_month'){
						defaultComm = 'На начало месяца';
					}else if(operation.type == 'end_month'){
						defaultComm = 'На конец месяца';
				    }else if(operation.type == 'charge'){
						dir = '-';
				    }
		            
					getParam(operation.date, result, 'last_oper_date');
	                getParam(dir + operation.sum, result, 'last_oper_sum', null, null, parseBalance);
	                getParam(operation.typeTitle ? operation.typeTitle : defaultType, result, 'last_oper_type');
			        getParam(operation.comment ? operation.comment : defaultComm, result, 'last_oper_desc');
					
					break;
	            }
			}else{
			    AnyBalance.trace('Не удалось получить данные по последней операции');
		    }
		}else{
			AnyBalance.trace('Не удалось получить данные по операциям');
		}
	}
	
	var html = AnyBalance.requestGet(g_baseurl + 'bonus/public/api/v0/accounts/', addHeaders({
		'Authorization': 'JWT ' + token
	}));
	
	AnyBalance.trace('Бонусная программа: ' + html);
	
    var json = getJson(html);
	
	getParam(json.balance, result, 'bonuses', null, null, parseBalance);
	getParam(json.title, result, 'fio', null, null, capitalFirstLetters);

    AnyBalance.setResult(result);
}
