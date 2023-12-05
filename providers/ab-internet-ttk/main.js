/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
};

var baseurl = 'https://lk.ttk.ru';
var g_savedData;

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(/^\d{9}$/.test(prefs.login), 'Логин должен состоять только из девяти цифр!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	if(!g_savedData)
		g_savedData = new SavedData('ttk', prefs.login);
	
	var contractId = g_savedData.get('contractId');

	if(contractId)
	    g_savedData.restoreCookies();
	
	var html = AnyBalance.requestPost(baseurl + '/api/user', JSON.stringify({
        'contract_id': contractId
    }), addHeaders({'Content-Type': 'application/json', 'Origin': baseurl, 'Referer': baseurl + '/'}));
	
	if(!html || AnyBalance.getLastStatusCode() > 500) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	
	if(/"unauthorized"/i.test(html) || AnyBalance.getLastStatusCode() == 401){
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
        clearAllCookies();
	
	    var html = AnyBalance.requestPost(baseurl + '/api/auth/loginByAccount', JSON.stringify({
            'login': prefs.login,
            'password': prefs.password,
            'remember': true
        }), addHeaders({'Content-Type': 'application/json', 'Origin': baseurl, 'Referer': baseurl + '/auth'}));
        
		var json = getJson(html);
		
	    if(json.error){
		    var error = json.error;
		    if (error)
			    throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));

		    AnyBalance.trace(html);
		    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }
		
		var currAcc = getCurrAcc(json);
	
	    var contractId = currAcc.contract_id;
		
		html = AnyBalance.requestPost(baseurl + '/api/user', JSON.stringify({
            'contract_id': contractId
        }), addHeaders({'Content-Type': 'application/json', 'Origin': baseurl, 'Referer': baseurl + '/'}));
		
		g_savedData.setCookies();
	    g_savedData.save();
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
	var result = {success: true};
        
	var json = getJson(html);
	
	AnyBalance.trace('Профиль: ' + JSON.stringify(json));
	
	if(!currAcc || !contractId){
	    var currAcc = getCurrAcc(json.contracts);
		var contractId = currAcc.contract_id;
	}
    
	getParam(currAcc.contract + '', result, 'account');
	getParam(currAcc.status + '', result, 'status');
	
	getParam(json.balance && Math.round(json.balance * 100)/100, result, 'balance', null, null, parseBalance);
	getParam(json.bonus && json.bonus.balance, result, 'bonuses', null, null, parseBalance);
	getParam(json.address, result, 'address');
	
	var person = {};
	sumParam(json.first_name, person, '__n', null, null, null, create_aggregate_join(' '));
//	sumParam(json.middle_name, person, '__n', null, null, null, create_aggregate_join(' '));
	sumParam(json.last_name, person, '__n', null, null, null, create_aggregate_join(' '));
	getParam(person.__n, result, 'fio');
	
	if(isAvailable('service', 'serviceabon', 'service2', 'serviceabon2', 'service3', 'serviceabon3', '__tariff', 'abon')){   
		html = AnyBalance.requestPost(baseurl + '/api/services/getServices', JSON.stringify({
            'contract_id': contractId
        }), addHeaders({'Content-Type': 'application/json', 'Origin': baseurl, 'Referer': baseurl + '/'}));
		
		json = getJson(html);
		
		AnyBalance.trace('Подключенные услуги: ' + JSON.stringify(json));
		
		if(json && json.length > 0){
			AnyBalance.trace('Найдено пакетов услуг: ' + json.length);
			for(var i=0; i<json.length; ++i){
				var packet = json[i];
				if(packet.services){ // Услуги внутри пакета, надо обрабатывать по-другому
				    var services = packet.services;
					var servicedesc;
					for(var j=0; j<services.length; j++){
					    var service = services[j];
				        var servicename = (j >= 1 ? 'service' + (j + 1) : 'service');
					    var serviceabonname = (j >= 1 ? 'serviceabon' + (j + 1) : 'serviceabon');
					    
					    if(service.type == 'Интернет'){
						    servicedesc = service.type + ': ' + service.speed + ' Мбит/с';
					    }else if(service.type == 'Телевидение'){
							servicedesc = service.type + ((service.packet && service.packet.count) ? (': ' + service.packet.count + ' кнл') : '');
					    }else{
						    servicedesc = service.type;
					    }
					    
    		            getParam(servicedesc, result, servicename);
    		            getParam(service.price, result, serviceabonname, null, null, parseBalance);
    	            }
				}else{
					var service = packet;
				    var servicename = (i >= 1 ? 'service' + (i + 1) : 'service');
					var serviceabonname = (i >= 1 ? 'serviceabon' + (i + 1) : 'serviceabon');
					
					if(service.type == 'Интернет'){
						servicedesc = service.type + ': ' + service.speed + ' Мбит/с';
					}else if(service.type == 'Телевидение'){
						servicedesc = service.type + ((service.packet && service.packet.count) ? (': ' + service.packet.count + ' кнл') : '');
					}else{
						servicedesc = service.type;
					}
					
    		        getParam(servicedesc, result, servicename);
    		        getParam(service.price, result, serviceabonname, null, null, parseBalance);
    	        }
				
				sumParam(packet.tariff.replace(/\s\([\s\S]*?\)/i, ''), result, '__tariff', null, null, null, create_aggregate_join(' | '));
				sumParam(packet.price, result, 'abon', null, null, parseBalance, aggregate_sum);
			}
		}else{
			AnyBalance.trace('Не удалось получить список пакетов услуг');
		}
	}	
	
	if(isAvailable('spendings', 'refills')){
		var dt = new Date();
		var startDate = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + '01';
		var endDate = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + n2(dt.getDate());
		
		html = AnyBalance.requestPost(baseurl + '/api/payments/getHistory', JSON.stringify({
            'group': true,
            'contract_id': contractId,
            'start_date': startDate,
            'end_date': endDate
        }), addHeaders({'Content-Type': 'application/json', 'Origin': baseurl, 'Referer': baseurl + '/'}));
		
		json = getJson(html);
		
		AnyBalance.trace('Расходы и пополнения: ' + JSON.stringify(json));
		
		var spendings = (json.costs && json.costs.subscription) + (json.costs && json.costs.other);
		var refills = (json.refills && json.refills.top_up) + (json.refills && json.refills.other);
		
		getParam(spendings || 0, result, 'spendings', null, null, parseBalance);
		getParam(refills || 0, result, 'refills', null, null, parseBalance);
	}
	
	if(isAvailable('lastoperationdate', 'lastoperationsum', 'lastoperationtype', 'lastoperationdesc')){
	    var dt = new Date();
		var dtPrev = new Date(dt.getFullYear(), dt.getMonth()-1, dt.getDate());
		var startDate = dtPrev.getFullYear() + '-' + n2(dtPrev.getMonth()+1) + '-' + n2(dt.getDate());
		var endDate = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + n2(dt.getDate());
		
		html = AnyBalance.requestPost(baseurl + '/api/payments/getHistory', JSON.stringify({
            'contract_id': contractId,
            'start_date': startDate,
            'end_date': endDate
        }), addHeaders({'Content-Type': 'application/json', 'Origin': baseurl, 'Referer': baseurl + '/'}));
		
		json = getJson(html);
		
		AnyBalance.trace('История операций: ' + JSON.stringify(json));
		
		if(json && json.length > 0){
			AnyBalance.trace('Найдено операций: ' + json.length)
			for(var i=0; i<json.length; ++i){
				var oper = json[i];
				
				getParam(oper.date, result, 'lastoperationdate', null, null, parseDate);
				getParam(oper.amount && Math.round(oper.amount * 100)/100, result, 'lastoperationsum', null, null, parseBalance);
				getParam(oper.type + '', result, 'lastoperationtype');
				getParam(oper.name + '' || 'Нет комментария', result, 'lastoperationdesc');
				
				break;
			}
		}else{
			AnyBalance.trace('Не удалось получить историю операций');
		}
    }
	
	AnyBalance.setResult(result);
}

function getCurrAcc(obj){
    var prefs = AnyBalance.getPreferences();
	
	AnyBalance.trace('Найдено лицевых счетов: ' + obj.length);

	if(obj.length < 1)
		throw new AnyBalance.Error('У вас нет ни одного лицевого счета');

	var currAcc, contractId;
	for(var i=0; i<obj.length; ++i){
		var acc = obj[i];
		AnyBalance.trace('Найден лицевой счет ' + acc.contract);
		if(!currAcc && (!prefs.num || endsWith(acc.contract, prefs.num))){
			AnyBalance.trace('Выбран лицевой счет ' + acc.contract);
			currAcc = acc;
		}
	}

	if(!currAcc)
		throw new AnyBalance.Error('Не удалось найти лицевой счет с последними цифрами ' + prefs.num);
	
	if(!contractId){
		contractId = currAcc.contract_id;
	    g_savedData.set('contractId', contractId);
	    g_savedData.save();
	}
	
	return currAcc;
}
