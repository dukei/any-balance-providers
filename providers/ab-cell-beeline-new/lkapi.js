/*
Бонусы различные
- Баланс SMS-промо: расходуются на SMS внутри России (Билайн и другие операторы);
- Баланс MMS-промо: расходуются на MMS внутри России (Билайн и другие операторы), на международных операторов и в роуминге не расходуются;
- Баланс Voice-промо: бесплатные секунды расходуются при звонках на все местные номера своего города подключения при условии нахождения Вас в пределах своей области подключения или безроуминговой зоне, если подключен "домашний регион" (в роуминге минуты не расходуются);
- Internet-баланс, Кб: баланс расходуется на весь GPRS-трафик при пользовании точками доступа internet.beeline.ru, home.beeline.ru, default.beeline.ru, в роуминге не расходуется.
Бонусы тратятся автоматически при использовании услуг сотовой связи.

*/

function canUseMobileApp(prefs){
    return (!prefs.phone || prefs.phone == prefs.login) && /^\d{10}$/.test(prefs.login);
}


/** API Мобильного приложения */
function proceedWithMobileAppAPI(baseurl, prefs, failover) {
	AnyBalance.trace('Входим через API мобильного приложения...');
	baseurl +=  'api/1.0/';
	var encodedLogin = encodeURIComponent(prefs.login);
	var encodedPassword = encodeURIComponent(prefs.password);
	
	var json = callAPIProc(baseurl + 'auth?login=' + encodedLogin + '&password=' + encodedPassword);
	
	AnyBalance.setCookie('my.beeline.ru', 'token', json.token);
	AnyBalance.setCookie('my.beeline.kz', 'token', json.token);
	
	json = callAPIProc(baseurl + 'info/payType?ctn=' + encodedLogin);
	
	var payType = json.payType;
	checkEmpty(payType, 'Не удалось узнать тип кабинета, сайт изменен?', true);
	AnyBalance.trace('Тип кабинета: ' + payType);
	
	json = callAPIProc(baseurl + 'info/pricePlan?ctn=' + encodedLogin);
	
	var result = {success: true};
	
	getParam(json.pricePlanInfo.entityName, result, '__tariff', null, replaceTagsAndSpaces, html_entity_decode);
	
	// Предоплата
	if(payType == 'PREPAID') {
		json = callAPIProc(baseurl + 'info/prepaidBalance?ctn=' + encodedLogin);
		
		getParam(json.balance + '', result, 'balance', null, replaceTagsAndSpaces, apiParseBalanceRound);
		getParam(g_currencys[json.currency], result, ['currency', 'balance'], null, replaceTagsAndSpaces);
	} else if(payType == 'POSTPAID') {
		
		if(isAvailable(['balance', 'currency'])) {
			json = callAPIProc(baseurl + 'info/postpaidBalance?ctn=' + encodedLogin);
			
			getParam(json.balance + '', result, 'balance', null, replaceTagsAndSpaces, apiParseBalanceRound);
			getParam(g_currencys[json.currency], result, ['currency', 'balance'], null, replaceTagsAndSpaces);
		}
			
		if(isAvailable('overpay')) {
			json = callAPIProc(baseurl + 'info/postpaidDebt?ctn=' + encodedLogin);
			
			getParam(json.balance + '', result, 'overpay', null, replaceTagsAndSpaces, function (str) {return (apiParseBalanceRound(str) || 0)*-1;});
		}
	} else {
		throw new AnyBalance.Error('Неизвестный тип кабинета: ' + payType);
	}
	
	if(isAvailable('fio')) {
		json = callAPIProc(baseurl + 'sso/contactData?login=' + encodedLogin);
		
		if((isset(json.lastName) && /[A-Za-zА-Яа-я]{2,}/i.test(json.lastName)) && isset(json.firstName) && json.lastName != null) {
			getParam((json.lastName ? json.lastName + ' ' : '') + (json.firstName || ''), result, 'fio', null, replaceTagsAndSpaces);
		} else
			AnyBalance.trace('Фио не указано в настройках...');
	}
	// Номер телефона
	getParam(prefs.login, result, 'phone', /^\d{10}$/, [/(\d{3})(\d{3})(\d{2})(\d{2})/, '+7 $1 $2 $3 $4']);
	// Бонусы
	if(isAvailableBonuses()) {
		try {
			json = callAPIProc(baseurl + 'info/accumulators?ctn=' + encodedLogin);
	
			for(var z = 0; z < json.accumulators.length; z++) {
				var curr = json.accumulators[z];
				
				// Минуты
				if(curr.unit == 'SECONDS') {
					//Приоритет билайна не случаен, их минуты определить сложнее
					if(/номера других|на других|на все номера/i.test(curr.accName)) {
						sumParam(curr.rest + ' ' + curr.unit, result, 'min_local', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
					} else {
						sumParam(curr.rest + ' ' + curr.unit, result, 'min_bi', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
					}
				} else if(curr.unit == 'SMS') {
					sumParam(curr.rest + ' ' + curr.unit, result, 'sms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
				} else if(curr.unit == 'MMS') {
					sumParam(curr.rest + ' ' + curr.unit, result, 'mms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
				} else if(curr.unit == 'KBYTE') {
					
					sumParam(curr.rest + ' ' + curr.unit, result, ['traffic_left', 'traffic_used'], null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
					sumParam(curr.size + ' ' + curr.unit, result, ['traffic_total', 'traffic_used'], null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
					
					if(isset(result.traffic_total) && isset(result.traffic_left)) {
						sumParam(result.traffic_total - result.traffic_left, result, 'traffic_used', null, null, null, aggregate_sum);
					}
				} else {
					AnyBalance.trace('Unknown units: ' + JSON.stringify(curr));
				}
			}
			
			if(payType == 'PREPAID') {
				json = callAPIProc(baseurl + 'info/prepaidAddBalance?ctn=' + encodedLogin);
				
				for(var prop in json){
					if(isArray(json[prop])){
						for(var i = 0; i < json[prop].length; i++) {
							var curr = json[prop][i];
							
							if(/bonusopros/i.test(curr.name)) {
								sumParam(curr.value + '', result, 'rub_opros', null, replaceTagsAndSpaces, apiParseBalanceRound, aggregate_sum);
							}else if(/bonusseconds/i.test(curr.name)) { //Бонус секунд-промо
								sumParam(curr.value + '', result, 'min_left_1', null, replaceTagsAndSpaces, apiParseBalanceRound, aggregate_sum);
							}else if(/seconds/i.test(curr.name)) {
								sumParam(curr.value + '', result, 'min_local', null, replaceTagsAndSpaces, apiParseBalanceRound, aggregate_sum);
							}else if(/internet/i.test(curr.name)) {
								sumParam(curr.value + 'б', result, 'traffic_left', null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
							}else if(/mms/i.test(curr.name)) {
								sumParam(curr.value + '', result, 'mms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
							}else if(/sms/i.test(curr.name)) {
								sumParam(curr.value + '', result, 'sms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
							}else{
								AnyBalance.trace('Unknown option: ' + prop + ' ' + JSON.stringify(curr));
							}
						}
					}
				}
			}
		} catch(e) {
			AnyBalance.trace('Ошибка получения бонусов: ' + e.message);
		}
	}
	
	// У пост-оплаты свои бонусы
	getBonusesPostAPI(baseurl, payType, encodedLogin, result);
	
	 
	 
	
	if(failover)
		setCountersToNull(result);
	
	AnyBalance.setResult(result);
}

function getBonusesPostAPI(baseurl, payType, encodedLogin, result) {
	if(isAvailableBonuses() && payType == 'POSTPAID') {
		try {
			var json = callAPIProc(baseurl + 'info/rests?ctn=' + encodedLogin);
	
			for(var z = 0; z < json.rests.length; z++) {
				var curr = json.rests[z];
				
				// Минуты
				if(curr.unitType == 'VOICE') {
					//Приоритет билайна не случаен, их минуты определить сложнее
					if(/номера других|на других|на все номера|других операторов/i.test(curr.restName)) {
						sumParam(curr.currValue + ' ', result, 'min_local', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
					} else {
						sumParam(curr.currValue + ' ', result, 'min_bi', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
					}
				} else if(curr.unitType == 'SMS_MMS') {
					sumParam(curr.currValue + ' ' + curr.unit, result, 'sms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
				} else if(curr.unitType == 'MMS') {
					sumParam(curr.currValue + ' ' + curr.unit, result, 'mms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
				} else if(curr.unitType == 'INTERNET') {
					sumParam(curr.currValue + ' mb', result, ['traffic_left', 'traffic_used'], null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
					sumParam(curr.initialSize + ' mb', result, ['traffic_total', 'traffic_used'], null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
					
					if(isset(result.traffic_total) && isset(result.traffic_left)) {
						sumParam(result.traffic_total - result.traffic_left, result, 'traffic_used', null, null, null, aggregate_sum);
					}
				} else {
					AnyBalance.trace('Unknown units: ' + JSON.stringify(curr));
				}
			}
		} catch(e) {
			AnyBalance.trace('Ошибка получения постоплатных бонусов: ' + e.message);
		}
	}
}

var errors = {
	AUTH_ERROR:' Ошибка авторизации! Проверьте логин-пароль!',
	
}

function callAPIProc(url) {
	var html = AnyBalance.requestGet(url, g_headers);
	var json = getJson(html);
	if(json.meta.status != 'OK'){
		var error = (errors[json.meta.message] || json.meta.message || '');
		throw new AnyBalance.Error('Ошибка вызова API! ' + error, null, /Ошибка авторизации/i.test(error)) ;
	}
	return json;
}

/** если не найдено число вернет null */
function apiParseBalanceRound(val) {
	var balance = parseBalance(val + '');
	if(!isset(balance))
		return null;
	
	return Math.round(balance*100)/100;
}

