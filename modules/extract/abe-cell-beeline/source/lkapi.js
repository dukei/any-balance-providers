/*
Бонусы различные
- Баланс SMS-промо: расходуются на SMS внутри России (Билайн и другие операторы);
- Баланс MMS-промо: расходуются на MMS внутри России (Билайн и другие операторы), на международных операторов и в роуминге не расходуются;
- Баланс Voice-промо: бесплатные секунды расходуются при звонках на все местные номера своего города подключения при условии нахождения Вас в пределах своей области подключения или безроуминговой зоне, если подключен "домашний регион" (в роуминге минуты не расходуются);
- Internet-баланс, Кб: баланс расходуется на весь GPRS-трафик при пользовании точками доступа internet.beeline.ru, home.beeline.ru, default.beeline.ru, в роуминге не расходуется.
Бонусы тратятся автоматически при использовании услуг сотовой связи.

*/

var g_baseurlApi = 'https://my.beeline.ru/api/';
var g_apiHeaders = {
//	'Accept': 'application/vnd.beeline.api.v1.mobapp+json',
	'User-Agent': 'okhttp/2.6.0',
	'Client-Type': 'MYBEE/ANDROID/PHONE/2.90',
};

function callAPIProc(url, getParams, postParams, method) {
	url = g_baseurlApi + url;

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

	var html;
	if(!method && !postParams){
		html = AnyBalance.requestGet(url, g_apiHeaders);
	}else{
		html = AnyBalance.requestPost(url, 
			postParams && JSON.stringify(postParams), 
			addHeaders({'Content-Type': postParams && 'application/json; charset=UTF-8'}, g_apiHeaders), 
			{HTTP_METHOD: method || 'POST'}
		);
	}

	var json = getJson(html);
	if(json.meta.status != 'OK'){
		var error = (api_errors[json.meta.message] || json.meta.message || '');
		if(postParams && postParams.password) postParams.password = '**********';
		AnyBalance.trace('Request (' + method + '): ' + url + ', ' + JSON.stringify(postParams) + '\nResponse: ' + html); 
		throw new AnyBalance.Error('Ошибка вызова API! ' + error, null, /парол|логин/i.test(error)) ;
	}
	return json;
}

function apiLogin(baseurl){
	if(baseurl)
		g_baseurlApi = baseurl + 'api/';

	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');

	try{
	    getApiAssocNumbers();
		AnyBalance.trace('Уже залогинены, используем имеющийся вход');
		return;
	}catch(e){
		AnyBalance.trace('Сессия новая, надо логиниться.');
	}


	var json = callAPIProc('2.0/auth/auth', {
			userType: 'Mobile',
			login: prefs.login
		}, {
			password: prefs.password
		}, 'PUT'
	);

	AnyBalance.setCookie(getParam(g_baseurlApi, null, null, /:\/\/([^\/]*)/), 'token', json.token);

	__setLoginSuccessful();
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
				return prefs.phone = s.ctn;
			}
			if(!num && s.ctnDefault){
				AnyBalance.trace('В качестве CTN берем ' + s.ctn + ' по умолчанию');
				prefs.__login = login;
				return prefs.phone = s.ctn;
			}
		}
	    
	    if(!num){
			AnyBalance.trace('В качестве CTN берем ' + subscribers[0].ctn);
			prefs.__login = login;
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
	
	getParam(processApi.payType[prefs.phone], result, 'type');
	
	processApiInfo(result);
	
	if(typeof(processApiPayments) == 'function')
		processApiPayments(result);
	processApiServices(result);

	processApiTariff(result);

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
	var json = callAPIProc('1.0/info/pricePlan', {ctn: prefs.phone});

	getParam(json.pricePlanInfo.entityName, result, 'tariff'); 
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

	if(AnyBalance.isAvailable('balance', 'currency', 'currency_code')){
		var json = callAPIProc('1.0/info/prepaidBalance', {ctn: prefs.phone});
	    
		getParam(json.balance, result, 'balance', null, null, apiParseBalanceRound);
		getParam(json.currency, result, ['currency_code', 'balance']);
		getParam(g_currencys[json.currency], result, ['currency', 'balance']);
	}


	try{
    	processApiRemaindersPrepaid(result);
	}catch(e){
		AnyBalance.trace('Не удалось получить бонусы: ' + e.message);
	}

	if(typeof(processApiDetalizationPrepaid) == 'function')
		processApiDetalizationPrepaid(result);
}

function processApiRemaindersPrepaid(result){
	if(!AnyBalance.isAvailable('remainders'))
		return;

	var remainders = result.remainders = {};

	var prefs = AnyBalance.getPreferences();
	var json = callAPIProc('1.0/info/accumulators', {ctn: prefs.phone});
	
	for(var z = 0; z < json.accumulators.length; z++) {
		var curr = json.accumulators[z];
		
		// Минуты
		if(curr.unit == 'SECONDS') {
			if(/на междугородные номера/i.test(curr.restName || curr.accName)){
				sumParam(curr.rest + ' ' + curr.unit, remainders, 'remainders.min_left_2', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
			} else if(isLocalMin(curr.restName || curr.accName)) { 
				sumParam(curr.rest + ' ' + curr.unit, remainders, 'remainders.min_local', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
			} else { 	//Приоритет билайна не случаен, их минуты определить сложнее
				sumParam(curr.rest + ' ' + curr.unit, remainders, 'remainders.min_bi', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
			}
		} else if(curr.unit == 'SMS') {
			sumParam(curr.rest + ' ' + curr.unit, remainders, 'remainders.sms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
		} else if(curr.unit == 'MMS') {
			sumParam(curr.rest + ' ' + curr.unit, remainders, 'remainders.mms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
		} else if(curr.unit == 'KBYTE') {
			
			sumParam(curr.rest + ' ' + curr.unit, remainders, ['remainders.traffic_left', 'remainders.traffic_used'], null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
			sumParam(curr.size + ' ' + curr.unit, remainders, ['remainders.traffic_total', 'remainders.traffic_used'], null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
			
			if(isset(remainders.traffic_total) && isset(remainders.traffic_left)) {
				sumParam(remainders.traffic_total - remainders.traffic_left, remainders, 'remainders.traffic_used', null, null, null, aggregate_sum);
			}
		} else {
			AnyBalance.trace('Unknown units: ' + JSON.stringify(curr));
		}
	}
	
	json = callAPIProc('1.0/info/prepaidAddBalance', {ctn: prefs.phone});
	
	for(var prop in json){
		if(isArray(json[prop])){
			for(var i = 0; i < json[prop].length; i++) {
				var curr = json[prop][i];
				
				if(/bonusopros/i.test(curr.name)) {
					sumParam(curr.value + '', remainders, 'remainders.rub_opros', null, replaceTagsAndSpaces, apiParseBalanceRound, aggregate_sum);
				}else if(/bonusmoney/i.test(curr.name)) {
					sumParam(curr.value + '', remainders, 'remainders.rub_bonus', null, replaceTagsAndSpaces, apiParseBalanceRound, aggregate_sum);
				}else if(/bonusseconds/i.test(curr.name)) { //Бонус секунд-промо
					sumParam(curr.value + '', remainders, 'remainders.min_left_1', null, replaceTagsAndSpaces, apiParseBalanceRound, aggregate_sum);
				}else if(/seconds/i.test(curr.name)) {
					sumParam(curr.value + '', remainders, 'remainders.min_local', null, replaceTagsAndSpaces, apiParseBalanceRound, aggregate_sum);
				}else if(/internet/i.test(curr.name)) {
					sumParam(curr.value + 'б', remainders, 'remainders.traffic_left', null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
				}else if(/mms/i.test(curr.name)) {
					sumParam(curr.value + '', remainders, 'remainders.mms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
				}else if(/sms/i.test(curr.name)) {
					sumParam(curr.value + '', remainders, 'remainders.sms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
				}else{
					AnyBalance.trace('Unknown option: ' + prop + ' ' + JSON.stringify(curr));
				}
			}
		}
	}
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
		processApiRemaindersPostpaid(result);
	}catch(e){
		AnyBalance.trace('Не удалось получить постоплатные бонусы: ' + e.message);
	}
}

function isLocalMin(name){
	return /номера других|на других|на все номера|др(?:угих|\.) операторов|всех|любых|местные.*вызовы|любые местные|кроме номеров .?Билайн.?/i.test(name);
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
			AnyBalance.trace('Unknown units: ' + JSON.stringify(curr));
		}
	}
}

/** если не найдено число вернет null */
function apiParseBalanceRound(val) {
	var balance = parseBalance(val + '');
	if(!isset(balance))
		return null;
	
	return Math.round(balance*100)/100;
}


function processApiServices(result){
	if(!AnyBalance.isAvailable('services_count', 'services_abon'))
		return;

	var prefs = AnyBalance.getPreferences();
	var json = callAPIProc('1.0/info/serviceList', {ctn: prefs.phone});

	getParam(0, result, 'services_abon');
	getParam(0, result, 'services_count');

	for(var i=0; i<json.services.length; ++i){
		var s = json.services[i];
		if(s.rcRate){
			AnyBalance.trace('Платная услуга ' + s.entityName + ' ' + s.rcRate + ' ' + s.rcRatePeriodText);
			sumParam(s.rcRate, result, 'services_abon', null, null, null, aggregate_sum);
		}
	   	if(s.viewInd == 'Y')
			sumParam(1, result, 'services_count', null, null, null, aggregate_sum);
	}
}
