/*
Бонусы различные
- Баланс SMS-промо: расходуются на SMS внутри России (Билайн и другие операторы);
- Баланс MMS-промо: расходуются на MMS внутри России (Билайн и другие операторы), на международных операторов и в роуминге не расходуются;
- Баланс Voice-промо: бесплатные секунды расходуются при звонках на все местные номера своего города подключения при условии нахождения Вас в пределах своей области подключения или безроуминговой зоне, если подключен "домашний регион" (в роуминге минуты не расходуются);
- Internet-баланс, Кб: баланс расходуется на весь GPRS-трафик при пользовании точками доступа internet.beeline.ru, home.beeline.ru, default.beeline.ru, в роуминге не расходуется.
Бонусы тратятся автоматически при использовании услуг сотовой связи.

*/

var g_baseurlApi = 'https://my.beeline.ru/api/';
var g_baseurlApiNew = 'https://api.beeline.ru/';

var g_apiHeaders = {
//	'Accept': 'application/vnd.beeline.api.v1.mobapp+json',
	'User-Agent': 'MyBeeline/4.72.0-3913',
	'Connection': 'Keep-Alive',
	'Client-Type': 'MobbApp2',
	'X-AppVersion':'4.72.0',
	'X-AndroidVersion':'26',
	'X-Device':'PHONE',
	'X-Theme':'Light'
};

function callAPIProc(url, getParams, postParams, method) {
	if(/mw\/auth|mobile\/api/i.test(url)){
		url = g_baseurlApiNew + url;
	}else{
	    url = g_baseurlApi + url;
	}

	var api_errors = {
		AUTH_ERROR:' Ошибка авторизации! Проверьте логин-пароль!',
		'for.existent.users.only': 'Неправильный логин'
	};

	if(getParams){
		var amp = url.indexOf('?') < 0 ? '?' : '&';
			
		for(var p in getParams){
			url += amp + encodeURIComponent(p) + '=' + encodeURIComponent(getParams[p]);
			amp = '&';
		}
	}

	var html, maxtries = 5, tries = 0;
	
	do{
	    if(!method && !postParams){
		    html = AnyBalance.requestGet(url, g_apiHeaders);
	    }else{
		    html = AnyBalance.requestPost(url, 
			    postParams && JSON.stringify(postParams), 
			    addHeaders({'Content-Type': postParams ? 'application/json; charset=UTF-8' : undefined}, g_apiHeaders), 
			    {HTTP_METHOD: method || 'POST'}
		    );
	    }
		
		if(/Too Many Requests/i.test(html) || AnyBalance.getLastStatusCode() == 429){
			if(tries < 5){
				AnyBalance.trace('Превышено количество одновременных запросов к серверу. Ждем 2 секунды и пробуем повторить запрос...');
				++tries;
				AnyBalance.sleep(2000);
			}else{
				AnyBalance.trace('Достигнуто максимальное количество одновременных запросов к серверу');
				break;
			}
		}else{
			break;
		}
	}while(true);

	var json = getJson(html);
	
	if(json.offerUrl){
		AnyBalance.trace('Требуется принять условия соглашения. Принимаем...');
		var offerUrl = json.offerUrl;
		g_apiHeaders['X-Offer-Token'] = json.token;
		html = AnyBalance.requestGet(offerUrl, g_apiHeaders);
		delete g_apiHeaders['X-Offer-Token'];
		var json = getJson(html);
	}
    
	if(json.meta && json.meta.status != 'OK'){
		var error = (api_errors[json.meta.message] || json.meta.message || '');
		if(postParams && postParams.password) postParams.password = '**********';
		AnyBalance.trace('Request (' + method + '): ' + url + ', ' + JSON.stringify(postParams) + '\nResponse: ' + html); 
		throw new AnyBalance.Error('Ошибка вызова API! ' + error, null, /парол|логин/i.test(error)) ;
	}
	return json;
}

function generateUUID() {
	function s4() {
  		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
  	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function apiLogin(baseurl){
	if(baseurl)
		g_baseurlApi = baseurl + 'api/';

	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	
	var myBee = AnyBalance.getData('myBee' + prefs.login);
	var adId = AnyBalance.getData('adId' + prefs.login);

	try{
		AnyBalance.restoreCookies();
		g_apiHeaders['X-Auth-Token'] = AnyBalance.getData('authToken' + prefs.login);
		g_apiHeaders['X-AdID'] = AnyBalance.getData('adId' + prefs.login);
	    getApiAssocNumbers();
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
		return;
	}catch(e){
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
		delete g_apiHeaders['X-Auth-Token'];
		delete g_apiHeaders['X-AdID'];
	}

	var newPass;
	if(!prefs.password){
		AnyBalance.trace('Пароль не задан, получаем его по смс');
		newPass = createNewPasswordApi();
	}
	
	if(!myBee)
	    myBee = generateUUID();
	
	if(!adId)
	    adId = generateUUID();
	
	g_apiHeaders['X-AdID'] = adId;
	
	var json = callAPIProc('mw/auth/1/auth', {client_id: 'mybee;' + myBee + ';android_26;4.72.0_3913', login: prefs.login, password: prefs.password || newPass});
	
	g_apiHeaders['X-Auth-Token'] = json.token;
    
	AnyBalance.setData('authToken' + prefs.login, json.token);
	AnyBalance.setData('myBee' + prefs.login, myBee);
	AnyBalance.setData('adId' + prefs.login, adId);
	AnyBalance.setCookie(getParam(g_baseurlApi, null, null, /:\/\/([^\/]*)/), 'token', json.token);
	AnyBalance.saveCookies();
    AnyBalance.saveData();

	__setLoginSuccessful();

	return newPass;
}

function getApiAssocNumbers(){
	if(getApiAssocNumbers.json)
		return getApiAssocNumbers.json;

	var prefs = AnyBalance.getPreferences();

	var json = callAPIProc('1.0/sso/list', {login: prefs.login});
	AnyBalance.trace('Присоединенных номеров: ' + json.ssoAccountList.length);

	return getApiAssocNumbers.json = json;
}

function getApiSubscribers(login){
	if(!getApiSubscribers.json)
		getApiSubscribers.json = {};

	if(getApiSubscribers.json[login])
		return getApiSubscribers.json[login];

	var json = callAPIProc('1.0/sso/subscribers', {login: login});
	AnyBalance.trace('CTN на логине: ' + json.subscribers.length);

	return getApiSubscribers.json[login] = json;
}

function switchToAssocNumber(num){

	var prefs = AnyBalance.getPreferences();

	function findCTNForLogin(login){
		var subscribers = getApiSubscribers(login).subscribers;
		if(!subscribers || !subscribers.length)
			return; //throw new AnyBalance.Error('Не удаётся найти номер телефона для логина!');
		for(var i=0; i<subscribers.length; ++i){
			var s = subscribers[i];
			if(num && endsWith(s.ctn, num)){
				AnyBalance.trace('В качестве CTN берем ' + s.ctn + ' по заданным последним цифрам');
				prefs.__login = login;
				g_apiHeaders['X-CTN'] = s.ctn;
                g_apiHeaders['X-Login'] = login;
				return prefs.phone = s.ctn;
			}
			if(!num && s.ctnDefault){
				AnyBalance.trace('В качестве CTN берем ' + s.ctn + ' по умолчанию');
				prefs.__login = login;
				g_apiHeaders['X-CTN'] = s.ctn;
                g_apiHeaders['X-Login'] = login;
				return prefs.phone = s.ctn;
			}
		}
	    
	    if(!num){
			AnyBalance.trace('В качестве CTN берем ' + subscribers[0].ctn);
			prefs.__login = login;
			g_apiHeaders['X-CTN'] = subscribers[0].ctn;
			g_apiHeaders['X-Login'] = login;
			return prefs.phone = subscribers[0].ctn;
		}
	}

	var assocs = getApiAssocNumbers();
	for(var i=0; i<assocs.ssoAccountList.length; ++i){
		var sso = assocs.ssoAccountList[i];
	    
	    var ctn = findCTNForLogin(sso.name);
	    if(ctn){
			AnyBalance.trace('Используем присоединенный логин ' + sso.name + ' и номер ' + ctn);
			return ctn;
		}
	}

	throw new AnyBalance.Error("Не удалось найти присоединенный номер, оканчивающийся на " + num);
}

function processApi(result){
	var prefs = AnyBalance.getPreferences();
	
	if(!processApi.payType)
		processApi.payType = {};
	
	if(!processApi.payType[prefs.phone]){
		var json = callAPIProc('1.0/info/payType', {ctn: prefs.phone});
		AnyBalance.trace('Тип кабинета: ' + json.payType);
		processApi.payType[prefs.phone] = json.payType;
	}
	
	var type = {
		PREPAID: 'Предоплатный',
		POSTPAID: 'Постоплатный'
	};
	getParam(type[processApi.payType[prefs.phone]]||processApi.payType[prefs.phone], result, 'type');
	
	processApiInfo(result);
	
	if(typeof(processApiPayments) == 'function')
		processApiPayments(result);
	
	processApiServices(result);

	processApiTariff(result);
	
	processApiStatus(result);

	if(processApi.payType[prefs.phone] == 'PREPAID'){
		processApiPrepaid(result);
	}else{
		processApiPostpaid(result);
	}
}

function processApiTariff(result){
	if(!AnyBalance.isAvailable('tariff'))
		return;

	var prefs = AnyBalance.getPreferences();
    var json = callAPIProc('mobile/api/v1/profile/pricePlanLight');
	
	if(json.data && json.data.entityName)
		getParam(json.data.entityName, result, 'tariff');
	
	if(json.data && json.data.rcRate)
		getParam(json.data.rcRate, result, 'abon_tariff', null, null, apiParseBalanceRound);
	
	if(json.data && json.data.name && json.data.tariffType == 'up'){ // Для тарифов линейки UP пробуем получить аппера
		var planName = json.data.name;
		
		try{
			var json = callAPIProc('mobile/api/v1/constructors/list?pricePlanSoc=' + planName + '&isOnlyConnected=true');
			
            if(json.data && json.data.additionalConstructorSocs && json.data.additionalConstructorSocs.length && json.data.additionalConstructorSocs.length > 0){				
				for(var j = 0; j < json.data.additionalConstructorSocs.length; j++) {
					var soc = json.data.additionalConstructorSocs[j];
					if(soc.additionalSocGroup == 'SUPERPOWER' && soc.connectedInd === true){
						AnyBalance.trace('Успешно получили имя аппера: ' + soc.entityName);
						
						result.tariff += ' - ' + soc.entityName;
						
						break;
					}
				}
			}
		}catch(e){
		    AnyBalance.trace('Не удалось получить имя аппера: ' + e.message);
	    }
	}
    
//	if(!result.tariff){ // На случай, если не удалось получить тариф первым способом
	    var json = callAPIProc('1.0/info/pricePlan', {ctn: prefs.phone});
        
	    getParam(json.pricePlanInfo.entityName, result, 'tariff');
	    
	    if(json.pricePlanInfo.rcRate)
	        getParam(json.pricePlanInfo.rcRate, result, 'abon_tariff', null, null, apiParseBalanceRound);
//    }
}

function processApiStatus(result){
	if(!AnyBalance.isAvailable('statuslock'))
		return;
	
	var prefs = AnyBalance.getPreferences();
	var json = callAPIProc('1.0/info/status', {ctn: prefs.phone});
	
	if(json.statusDesc){
		result.statuslock = 'Номер заблокирован';
	}else{
		result.statuslock = 'Номер не блокирован';
	}
}

function processApiUnifiedBalance(result){
	if(!AnyBalance.isAvailable('unified_balance'))
		return;
	
	var json = callAPIProc('mobile/api/v1/ub/balance/unified'); // Общий баланс
	
	if(json.data && json.data.data)
		getParam(json.data.data.balance, result, 'unified_balance', null, null, apiParseBalanceRound);
}

function processApiAddonBalance(result){
	if(!AnyBalance.isAvailable('addon_balance'))
		return;
    
	var json = callAPIProc('mobile/api/v1/profile/sasBalance'); // Баланс для доп. услуг
	
	if(json.data)
		getParam(json.data.sasBalanceValue, result, 'addon_balance', null, null, apiParseBalanceRound);
}

function processApiHoneycomb(result){
	if(!AnyBalance.isAvailable('honeycomb'))
		return;
    
	var json = callAPIProc('mobile/api/gaming/v1/progress/honeycomb/balance'); // Соты
	
	if(json.data && json.data.balance)
	    getParam(json.data.balance, result, 'honeycomb', null, null, apiParseBalanceRound);
}

function processApiInfo(result){
	if(!AnyBalance.isAvailable('info', 'agreement'))
		return;

	var prefs = AnyBalance.getPreferences();
	var json = callAPIProc('1.0/sso/contactData', {login: prefs.login});

    if (!result.info)
        result.info = {};

	var info = result.info;
	var jsp = create_aggregate_join(' ');

	if(json.lastName){
		getParam(json.lastName, info, 'info.name_last');
		sumParam(json.lastName, info, 'info.fio', null, null, null, jsp);
	}
	if(json.firstName && json.firstName != prefs.login){
		getParam(json.firstName, info, 'info.name');
		sumParam(json.firstName, info, 'info.fio', null, null, null, jsp);
	}
	getParam(json.invoiceAddr, info, 'info.address');
	getParam(json.market, info, 'info.region');

	// Номер телефона
	getParam(prefs.phone, info, 'info.phone', /^\d{10}$/, [/(\d{3})(\d{3})(\d{2})(\d{2})/, '+7 $1 $2-$3-$4']);
	
	getParam('' + json.ban, result, 'agreement');
}

function processApiPrepaid(result){
	var prefs = AnyBalance.getPreferences();

	if(AnyBalance.isAvailable('balance', 'currency', 'currency_code', 'next_billing_date')){
		var json = callAPIProc('1.0/info/prepaidBalance', {ctn: prefs.phone});
	    
		getParam(json.balance, result, 'balance', null, null, apiParseBalanceRound);
		getParam(json.currency, result, ['currency_code', 'balance']);
		getParam(g_currencys[json.currency], result, ['currency', 'balance']);
		getParam(json.nextBillingDate || (json.smartPricePlanParams && json.smartPricePlanParams.nextBillingDate), result, 'next_billing_date', null, null, parseDateISO);
	}
	
	try{
	    processApiUnifiedBalance(result);
	}catch(e){
		AnyBalance.trace('Не удалось получить общий баланс: ' + e.message);
	}
	
	try{
	    processApiAddonBalance(result);
	}catch(e){
		AnyBalance.trace('Не удалось получить баланс для доп. услуг: ' + e.message);
	}
	
	try{
		processApiHoneycomb(result)
	}catch(e){
		AnyBalance.trace('Не удалось получить баланс накопленных сот: ' + e.message);
	}

	try{
    	processApiRemaindersPrepaid(result);
	}catch(e){
		AnyBalance.trace('Не удалось получить остатки по пакетам: ' + e.message);
	}
	
	try{
	    processApiExpensesPrepaid(result);
	}catch(e){
		AnyBalance.trace('Не удалось получить детализацию расходов: ' + e.message);
	}

	if(typeof(processApiDetalizationPrepaid) == 'function')
		processApiDetalizationPrepaid(result);
}

function processApiRemaindersPrepaid(result){
	if(!AnyBalance.isAvailable('remainders'))
		return;

	var remainders = result.remainders = {};

	var prefs = AnyBalance.getPreferences();
	
	if(AnyBalance.isAvailable('remainders.traffic_rouming')){ // Трафик в роуминге только старый апи показывает
	    var json = callAPIProc('1.0/info/accumulators', {ctn: prefs.phone});
	    
		if(json.accumulators && json.accumulators.length && json.accumulators.length > 0){
	        for(var z = 0; z < json.accumulators.length; z++) {
		        var curr = json.accumulators[z];
		        
		        if(curr.unit == 'KBYTE' && /ROAMGPRS/i.test(curr.soc))
			        sumParam(curr.rest + ' ' + curr.unit, remainders, 'remainders.traffic_rouming', null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
		    }
		}
		
		if(!result.remainders.traffic_rouming)
			AnyBalance.trace('Не удалось получить трафик в роуминге');
	}
	
	var json = callAPIProc('mobile/api/v2/profile/accumulators');
	
	if(json.data && json.data.list && json.data.list.length && json.data.list.length > 0 ){
	    for(var z = 0; z < json.data.list.length; z++) {
		    var curr = json.data.list[z];
		    
		    if(curr.unit == 'SECONDS') { // Минуты
			    if(/на междугородные номера|на междугородные звонки/i.test(curr.description)){
				    sumParam(curr.rest + ' ' + curr.unit, remainders, 'remainders.min_left_2', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
			    } else if(isLocalMin(curr.description)) {
				    sumParam(curr.rest + ' ' + curr.unit, remainders, 'remainders.min_local', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
			    } else { // Приоритет билайна не случаен, их минуты определить сложнее
				    sumParam(curr.rest + ' ' + curr.unit, remainders, 'remainders.min_bi', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
			    }
		    } else if(curr.unit == 'SMS') {
			    sumParam(curr.rest + ' ' + curr.unit, remainders, 'remainders.sms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
		    } else if(curr.unit == 'MMS') {
			    sumParam(curr.rest + ' ' + curr.unit, remainders, 'remainders.mms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
		    } else if(curr.unit == 'KBYTE') {
			    if (/ROAMGPRS/i.test(curr.soc) && !result.remainders.traffic_rouming){ // Ищем, только если через старый апи трафик в роуминге не получили
				    sumParam(curr.rest + ' ' + curr.unit, remainders, 'remainders.traffic_rouming', null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
			    } else {
				    sumParam(curr.rest + ' ' + curr.unit, remainders, ['remainders.traffic_left', 'remainders.traffic_used'], null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
				    sumParam(curr.size + ' ' + curr.unit, remainders, ['remainders.traffic_total', 'remainders.traffic_used'], null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
			        
			        if(isset(remainders.traffic_total) && isset(remainders.traffic_left))
				        sumParam(Math.round(remainders.traffic_total - remainders.traffic_left, 2), remainders, 'remainders.traffic_used', null, null, null, aggregate_sum);
			    }
		    } else {
			    AnyBalance.trace('Неизвестные единицы: ' + JSON.stringify(curr));
		    }
		}
	}else{
		AnyBalance.trace('Не удалось получить остатки по пакетам');
	}
	
	var json = callAPIProc('1.0/info/prepaidAddBalance', {ctn: prefs.phone}); // Дополнительные пакеты и опции, подключенные к номеру
	
	for(var prop in json){
		if(isArray(json[prop])){
			for(var i = 0; i < json[prop].length; i++) {
				var curr = json[prop][i];
				
				if(/shadow|name\.(?:seconds|internet|mms|sms)/i.test(curr.name)) { // Новый API уже показывает суммы остатков по пакетам, здесь ищем только бонусы
					AnyBalance.trace('Пересекающийся пакет ' + curr.name + ': ' + curr.value + ' ' + curr.unit + '. Пропускаем...');
					continue;
				}else if(/bonusopros/i.test(curr.name)) {
					sumParam(curr.value + '', remainders, 'remainders.rub_opros', null, replaceTagsAndSpaces, apiParseBalanceRound, aggregate_sum);
				}else if(/bonusmoney/i.test(curr.name)) {
					sumParam(curr.value + '', remainders, 'remainders.rub_bonus', null, replaceTagsAndSpaces, apiParseBalanceRound, aggregate_sum);
 				}else if(/bonusbalance17/i.test(curr.name)) { // Денежный бонус
					getParam(curr.value + '', remainders, 'remainders.rub_bonus2', null, replaceTagsAndSpaces, apiParseBalanceRound);
					getParam(curr.dueDate, remainders, 'remainders.rub_bonus2_till', null, replaceTagsAndSpaces, parseDateISO); 
				}else if(/bonusseconds/i.test(curr.name)) { // Бонус секунд-промо
					sumParam(curr.value + '', remainders, 'remainders.min_left_1', null, replaceTagsAndSpaces, apiParseBalanceRound, aggregate_sum);
				}else if(/9seconds/i.test(curr.name)) { // Минуты на звонки в Узбекистан, номера сети Tcell Таджикистан, билайн Кыргызстана и Армении для тарифов UP
					sumParam(curr.value + '', remainders, 'remainders.min_left_3', null, replaceTagsAndSpaces, apiParseBalanceRound, aggregate_sum);
				}else{
					AnyBalance.trace('Неизвестная опция ' + curr.name + ': ' + JSON.stringify(curr));
				}
			}
		}
	}
	
	AnyBalance.trace(JSON.stringify(remainders));
}

function getPostpaidBalanceApi(ctn){
	if(!getPostpaidBalanceApi.json)
		getPostpaidBalanceApi.json = {};
	if(getPostpaidBalanceApi.json[ctn])
		return getPostpaidBalanceApi.json[ctn];

	var prefs = AnyBalance.getPreferences();
	json = callAPIProc('1.0/info/postpaidBalance', {ctn: ctn});

	return getPostpaidBalanceApi.json[ctn] = json;
}

function processApiPostpaid(result){
	var prefs = AnyBalance.getPreferences();

	if(isAvailable(['balance', 'currency', 'currency_code'])) {
		json = getPostpaidBalanceApi(prefs.phone);
		
		getParam(json.balance + '', result, 'balance', null, replaceTagsAndSpaces, apiParseBalanceRound);
		getParam(json.currency, result, ['currency_code', 'balance'], null, replaceTagsAndSpaces);
		getParam(g_currencys[json.currency], result, ['currency', 'balance'], null, replaceTagsAndSpaces);
	}

	if(AnyBalance.isAvailable('prebal')){
		//получаем сумму балансов по выбранному договору
		var subscribers = getApiSubscribers(prefs.__login).subscribers;
		var balance = 0;
		for(var i=0; subscribers && i<subscribers.length; ++i){
			var s = subscribers[i];
			balance += getPostpaidBalanceApi(s.ctn).balance;
		}
		getParam(balance, result, 'prebal');
	}

	if(isAvailable('overpay')) {
		try{
			json = callAPIProc('1.0/info/postpaidDebt', {ctn: prefs.phone});
		
			getParam(json.balance + '', result, 'overpay', null, replaceTagsAndSpaces, function (str) {return (apiParseBalanceRound(str) || 0)*-1});
		}catch(e){
			AnyBalance.trace('Не удалось получить переплату: ' + e.message);
		}
	}
	
	try{
	    processApiUnifiedBalance(result);
	}catch(e){
		AnyBalance.trace('Не удалось получить общий баланс: ' + e.message);
	}
	
	try{
	    processApiAddonBalance(result);
	}catch(e){
		AnyBalance.trace('Не удалось получить баланс для доп. услуг: ' + e.message);
	}
	
	try{
		processApiHoneycomb(result)
	}catch(e){
		AnyBalance.trace('Не удалось получить баланс накопленных сот: ' + e.message);
	}

	try{
		processApiRemaindersPostpaid(result);
	}catch(e){
		AnyBalance.trace('Не удалось получить остатки по пакетам: ' + e.message);
	}
	
	try{
	    processApiExpensesPostpaid(result);
	}catch(e){
		AnyBalance.trace('Не удалось получить детализацию расходов: ' + e.message);
	}
}

function isLocalMin(name){
	return /Минут(?:\D+)? общения|номера других|на других|на все номера|др(?:угих|\.) операторов|всех|любых|местные.*вызовы|любые местные|кроме номеров .?Билайн.?/i.test(name);
}

function processApiRemaindersPostpaid(result){
	if(!AnyBalance.isAvailable('remainders'))
		return;

	var remainders = result.remainders = {};

	var prefs = AnyBalance.getPreferences();
	var json = callAPIProc('1.0/info/rests', {ctn: prefs.phone});
	
	for(var z = 0; z < json.rests.length; z++) {
		var curr = json.rests[z];
		
		// Минуты
		if(curr.unitType == 'VOICE') {
			//Приоритет билайна не случаен, их минуты определить сложнее
			if(isLocalMin(curr.restName || curr.accName)) {
				sumParam(curr.currValue + ' ', remainders, 'remainders.min_local', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
			} else {
				sumParam(curr.currValue + ' ', remainders, 'remainders.min_bi', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
			}
		} else if(curr.unitType == 'SMS_MMS') {
			sumParam(curr.currValue + ' ' + curr.unit, remainders, 'remainders.sms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
		} else if(curr.unitType == 'MMS') {
			sumParam(curr.currValue + ' ' + curr.unit, remainders, 'remainders.mms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
		} else if(curr.unitType == 'INTERNET') {
			sumParam(curr.currValue + ' mb', remainders, ['remainders.traffic_left', 'remainders.traffic_used'], null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
			sumParam(curr.initialSize + ' mb', remainders, ['remainders.traffic_total', 'remainders.traffic_used'], null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
			
			if(isset(remainders.traffic_total) && isset(remainders.traffic_left)) {
				sumParam(remainders.traffic_total - remainders.traffic_left, remainders, 'remainders.traffic_used', null, null, null, aggregate_sum);
			}
		} else {
			AnyBalance.trace('Неизвестные единицы: ' + JSON.stringify(curr));
		}
	}
	
	AnyBalance.trace(JSON.stringify(remainders));
}

/** если не найдено число вернет null */
function apiParseBalanceRound(val) {
	var balance = parseBalance(val + '');
	if(!isset(balance))
		return null;
	
	return Math.round(balance*100)/100;
}

function processApiServices(result){
	if(!AnyBalance.isAvailable('services_paid', 'services_free', 'services_count', 'services_abon', 'services_abon_day'))
		return;

	var prefs = AnyBalance.getPreferences();
	var json = callAPIProc('1.0/info/serviceList', {ctn: prefs.phone});
    
	getParam(0, result, 'services_count');
	getParam(0, result, 'services_abon');
	getParam(0, result, 'services_abon_day');

	for(var i=0; i<json.services.length; ++i){
		var s = json.services[i];
		
		if(s.viewInd == 'N') // Скрытые от пользователя услуги пропускаем, это технические тарифные услуги по умолчанию
			continue;
			
		sumParam(1, result, 'services_count', null, null, null, aggregate_sum);
		
		if(!s.rcRate && (/Пакет|автопродление|Переадресация/i.test(s.entityName) || /\d+[.,\d+]*? (?:руб|₽)/i.test(s.entityDesk))){ // Разовая платная услуга
		    AnyBalance.trace('Платная услуга ' + s.entityName + ': ' + s.rcRate + ' ₽' + (s.rcRatePeriodText ? ' ' + s.rcRatePeriodText : ''));
			sumParam(1, result, 'services_paid', null, null, null, aggregate_sum);
			continue;
		}
		
		if(s.rcRate){ // Услуга с абонплатой
			AnyBalance.trace('Платная услуга ' + s.entityName + ': ' + s.rcRate + ' ₽' + (s.rcRatePeriodText ? ' ' + s.rcRatePeriodText : ''));
			if(!/сутки/i.test(s.rcRatePeriodText)){
				sumParam(s.rcRate, result, 'services_abon', null, null, null, aggregate_sum);
            }else{
				sumParam(s.rcRate, result, 'services_abon_day', null, null, null, aggregate_sum);
            }
			sumParam(1, result, 'services_paid', null, null, null, aggregate_sum);
	    }else{
			AnyBalance.trace('Бесплатная услуга ' + s.entityName);
			sumParam(1, result, 'services_free', null, null, null, aggregate_sum);
		}
	}
}

function processApiExpensesPrepaid(result){
	if(!AnyBalance.isAvailable(['month_refill', 'debet', 'traffic_used_4g', 'traffic_used_total']))
		return;
	
	var prefs = AnyBalance.getPreferences();
	
	var dt = new Date();
	var ym = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-';
	
	var startDate = ym + '01';
	var endDate = ym + n2(dt.getDate());
	
	var json = callAPIProc('mobile/api/v1/billing/details', {startDate: startDate, endDate: endDate, combinedSessions: true});
    
	if(AnyBalance.isAvailable('month_refill', 'debet')) {
	    var main_balance = json.data.balanceAndBonuses.filter(function (b) { return (b.title && /Личный баланс/i.test(b.title)) });
        
	    if (main_balance.length>0) {
		    getParam(aggregate_max([0, main_balance[0].addedBonuses.value, AnyBalance.getData('addedBonuses' + ym)]), result, 'month_refill', null, null, apiParseBalanceRound);
            AnyBalance.setData('addedBonuses' + ym, result.month_refill);
    	    getParam(aggregate_max([0, main_balance[0].spentBonuses.value, AnyBalance.getData('spentBonuses' + ym)]), result, 'debet', null, null, apiParseBalanceRound);
            AnyBalance.setData('spentBonuses' + ym, result.debet);
            AnyBalance.saveData();
        }
	    
	    if(!result.month_refill)
		    result.month_refill = 0;
	    
	    if(!result.debet)
		    result.debet = 0;
	}
	
	if(AnyBalance.isAvailable('traffic_used_4g', 'traffic_used_total')) {
	    var category_unlim4g = json.data.transactions.filter(function (t) { return ((t.expence && t.expence.type && t.expence.type == 'mobileInternet') && (t.expence && t.expence.operation && /Безлимит в 4G/i.test(t.expence.operation))) });
	    var category_traff = json.data.transactions.filter(function (t) { return ((t.expence && t.expence.type && t.expence.type == 'mobileInternet') || (t.expence && t.expence.operation && /интернет/i.test(t.expence.operation))) });
		
	    if (category_unlim4g.length>0) {
			category_unlim4g.forEach(function (cat){
    			sumParam(cat.expence.volume + ' ' + cat.expence.unit, result, 'traffic_used_4g', null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
    		})
	    }
		
		if (category_traff.length>0) {
    	    category_traff.forEach(function (cat){
    			sumParam(cat.expence.volume + ' ' + cat.expence.unit, result, 'traffic_used_total', null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
    		})
	    }
		
		if(!result.traffic_used_4g)
		    result.traffic_used_4g = 0;
	    
	    if(!result.traffic_used_total)
		    result.traffic_used_total = 0;
	}
}

function processApiExpensesPostpaid(result){
	if(!AnyBalance.isAvailable('month_refill', 'debet'))
		return;
	
	var prefs = AnyBalance.getPreferences();
	
	var dt = new Date();
	var ym = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-';
	
	var startDate = ym + '01';
	var endDate = ym + n2(dt.getDate());
	
	var json = callAPIProc('mobile/api/v1/billing/details', {startDate: '', endDate: '', ctnFor: prefs.phone, combinedSessions: true});
    
	var main_balance = json.data.balanceAndBonuses.filter(function (b) { return (b.title && /Личный баланс/i.test(b.title)) });
    
	if (main_balance.length>0) {
		getParam(aggregate_max([0, main_balance[0].addedBonuses.value, AnyBalance.getData('addedBonuses' + ym)]), result, 'month_refill', null, null, apiParseBalanceRound);
        AnyBalance.setData('addedBonuses' + ym, result.month_refill);
    	getParam(aggregate_max([0, main_balance[0].spentBonuses.value, AnyBalance.getData('spentBonuses' + ym)]), result, 'debet', null, null, apiParseBalanceRound);
        AnyBalance.setData('spentBonuses' + ym, result.debet);
        AnyBalance.saveData();
    }
	
	if(!result.month_refill)
		result.month_refill = 0;
	
	if(!result.debet)
		result.debet = 0;
}

function createNewPasswordApi(){
	var prefs = AnyBalance.getPreferences();

    checkEmpty(prefs.login, 'Введите 10 цифр вашего номера телефона в формате 9031234567');
    checkEmpty(!prefs.password || prefs.password.length >= 6, 'Введите не менее 6 символов желаемого пароля. Или оставьте поле пустым, чтобы автоматически сгенерировать пароль.');

	var json = callAPIProc('1.0/passReset', {login: prefs.login, channelType: 'CTN'});
    var tempPass = AnyBalance.retrieveCode('Пожалуйста, введите временный пароль, который направлен вам по ' + json.channel, null, {inputType: 'number'});

    var newPass = tempPass;
	json = callAPIProc('2.0/auth/auth', {userType: 'Mobile', login: prefs.login}, {password: tempPass}, 'PUT');
	AnyBalance.setCookie(getParam(g_baseurlApi, null, null, /:\/\/([^\/]*)/), 'token', json.token);

	if(json.tempPassInd){
		newPass = prefs.password || generatePassword();
		json = callAPIProc('1.0/setting/changePassword', {login: prefs.login, newPassword: newPass}, '', 'PUT');
//		json = callAPIProc('2.0/auth/auth', {userType: 'Mobile', login: prefs.login}, {password: newPass}, 'PUT');;
	}

	createNewPasswordApi.password = newPass;
	prefs.password = newPass; //Обязательно в настройки запишем новый пароль
	AnyBalance.trace('Generated new password: ' + newPass);
	return newPass;
}

function processPaymentsPost(baseurl, html, result){
    var button = getElements(html, [/<a[^>]*payments_form[^>]*>/ig, /Выгрузить в Excel/i])[0];
    var bid = getParam(button, null, null, /mojarra.jsfcljs[^"]*'([^']*:payments_form:[^'\\]*)/i);
    var formid = getParam(bid, null, null, /.*payments_form/i);

    var form = getElement(html, new RegExp('<form[^>]+name="' + formid + '"[^>]*>', 'i'));
    if(!form) {
        AnyBalance.trace(html);
        AnyBalance.trace('Не найдена форма получения платежей, сайт изменен?');
        return;
    }

    var dt = new Date();
    var dt2 = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()-90);
    var params = createFormParams(form, function(params, str, name, value) {
        if (/DateFrom/.test(name))
            return fmtDate(dt2).replace(/\d\d(\d\d)/, '$1');
        else if (/DateTo/.test(name))
            return fmtDate(dt).replace(/\d\d(\d\d)/, '$1');

        return value;
    });

    params[bid] = bid;
    var xls = AnyBalance.requestPost(baseurl + 'c/post/fininfo/index.xhtml', params, addHeaders({Referer: baseurl}), {options: {FORCE_CHARSET: 'base64'}});
    var wb = XLS.read(xls, {type: 'base64'});
    var arr = sheet_to_array(wb.Sheets[wb.SheetNames[0]]);

    AnyBalance.trace('Найдено ' + arr.length + ' строк платежей');
    var payments = result.payments = [];

    var colsDef = {
        date: {
            re: /Дата/i,
            result_func: parseDate
        },
        type: {
            re: /Тип/i,
            result_func: null //Наличный платеж
        },
        sum: {
            re: /Сумма/i
        }
    };

    var cols = initCols(colsDef, arr[0]);

    for (var i = 1; i < arr.length; i++) {
        var row = arr[i];

        var d = {};
        fillColsResult(colsDef, cols, row, d, 'payments.');

        payments.push(d);
    }
}

function processDetailsAndPaymentsPre(baseurl, phone, result){
    var dt = new Date();
    var dtPrev = new Date(dt.getFullYear(), dt.getMonth()-1, dt.getDate());
    var dts = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + n2(dt.getDate());// + 'T00:00:00.000Z';
    var dtPrevs = dtPrev.getFullYear() + '-' + n2(dtPrev.getMonth()+1) + '-' + n2(dtPrev.getDate());// + 'T00:00:00.000Z';

//	var html = AnyBalance.requestGet(baseurl + 'c/pre/fininfo/index.xhtml?startDate=' + dtPrevs + '&endDate=' + dts, g_headers);
    phone = replaceAll(phone, [/\+\s*7/, '', /\D/g, '']);

    if(AnyBalance.isAvailable('payments'))
        processPaymentsPre(baseurl, phone, dtPrevs, dts, result)

    if(AnyBalance.isAvailable('detalization', 'info.date_start'))
        processDetalizationPre(baseurl, phone, dtPrevs, dts, result)
}

function processPaymentsPre(baseurl, phone, from, to, result){
    var json = callSiteApi(baseurl, 'info/payments/history?ctn=' + phone + '&periodStart=' + from + '&periodEnd=' + to);

    processApiPayments0(json, result);
}

function processApiPayments(result){
	if(!AnyBalance.isAvailable('payments'))
		return;

	try{
		var prefs = AnyBalance.getPreferences();
		var json = callAPIProc('1.0/info/payments/history', {ctn: prefs.phone});

		processApiPayments0(json, result);
	}catch(e){
		AnyBalance.trace('Не удалось получить историю платежей: ' + e.message);
	}
}

function processApiPayments0(json, result){
	result.payments = [];
	AnyBalance.trace('Найдено платежей: ' + json.paymentsHistory.length);
	for(var i=0; i<json.paymentsHistory.length; ++i){
		var payment = json.paymentsHistory[i];
		var p = {};
		getParam(payment.dateStart, p, 'payments.date', null, null, parseDateISO);
		getParam(payment.value, p, 'payments.sum', null, null, parseBalance);
		getParam(payment.paymentType, p, 'payments.type_code');
		getParam(payment.paymentStatus, p, 'payments.status_code');
		getParam(payment.payTypeName, p, 'payments.type');
		if(!payment.payPoint || (payment.payPoint && /Проверить баланс в приложении/i.test(payment.payPoint))){
			getParam(payment.payTypeName, p, 'payments.place');
		}else{
			getParam(payment.payPoint, p, 'payments.place');
		}

		result.payments.push(p);
	}
}
