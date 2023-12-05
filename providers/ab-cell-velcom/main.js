/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Language': 'ru-RU,ru;q=0.9',
	'Connection': 'keep-alive',
	'Cache-Control': 'max-age=0',
    'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
};

var velcomOddPeople = 'Не удалось войти в личный кабинет. Сайт изменен?';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d{3})(\d\d)(\d{3})(\d\d)(\d\d)$/, '+$1 ($2) $3-$4-$5'];

var g_club = {
	empty: 'Программа не подключена'
};

var g_status = {
	Active: 'Активный',
	Inactive: 'Неактивный',
	Blocked: 'Заблокирован',
	undefined: 'Не определен'
};

function parseBalanceRK(_text) {
  var text = _text.replace(/\s+/g, '');
  var rub = getParam(text, null, null, /(-?\d[\d\.,]*)руб/i, replaceTagsAndSpaces, parseBalance) || 0;
  var _sign = rub < 0 || /-\d[\d\.,]*руб/i.test(text) ? -1 : 1;
  var kop = getParam(text, null, null, /(-?\d[\d\.,]*)коп/i, replaceTagsAndSpaces, parseBalance) || 0;
  var val = _sign*(Math.abs(rub) + kop / 100);
  AnyBalance.trace('Parsing balance (' + val + ') from: ' + _text);
  return val;
}

function getDomain(url){
	return getParam(url, /^(https?:\/\/[^\/]*)/i);
}

function main(){
	var prefs = AnyBalance.getPreferences();
	
	switch(prefs.source){
	case 'cell':
        var html = mainCell(prefs);
		break;
    case 'internet':
        var html = mainInternet(prefs);
		break;
	default:
        var html = mainCell(prefs);
		break;
	}
}

function saveTokens(json){
	AnyBalance.setData('accessToken', json.access_token);
	AnyBalance.setData('refreshToken', json.refresh_token);
	AnyBalance.setData('idToken', json.id_token);
	AnyBalance.setData('tokenType', json.token_type);
    AnyBalance.setData('expiresIn', json.expires_in);
	AnyBalance.saveData();
}

function mainCell(html, result){
	var baseurl = 'https://myaccount.a1.by/';
	
    var prefs = AnyBalance.getPreferences();
	
    AnyBalance.setDefaultCharset('utf-8');
	
    checkEmpty(prefs.login, 'Введите номер телефона!');
    checkEmpty(prefs.password, 'Введите пароль!');
	
    var matches;
    if(!(matches = /^\+375(\d\d)(\d{7})$/.exec(prefs.login)))
		throw new AnyBalance.Error('Неверный формат номера телефона. Необходимо ввести номер в международном формате без пробелов и разделителей!', false, true);
	
	var phone = matches[2];
    var prefix = matches[1];
	
	if (prefs.password.length > 20)
		throw new AnyBalance.Error('Неверный формат пароля. Пароль должен содержать не более 20 символов!', false, true);
    
    var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(AnyBalance.getLastStatusCode() >= 500){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	var login = prefs.login.replace(/.*(\d{3})(\d\d)(\d{3})(\d\d)(\d\d)$/, '$1$2$3$4$5');
	
	html = AnyBalance.requestPost('https://asmp.a1.by/communityrest/mobile/checkRegistration', JSON.stringify({
        'msisdn': login,
        'realm': 'a1.by'
    }), addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Content-Type': 'application/json'
	}));
	
	if(/(?:User\s?|Number\s?)?not registered/i.test(html) || AnyBalance.getLastStatusCode == 404){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Указанный номер не зарегистрирован. Пожалуйста, пройдите регистрацию', null, true);
    }
	
	html = AnyBalance.requestPost('https://appopenapi.a1.by/v1new_prod/public/self-registration/mnp/msisdn-check', JSON.stringify({
        'msisdn': login
    }), addHeaders({
		'Accept': '*/*',
		'Authorization': 'Basic dW5kYWJvdDo3ZmhCMHF0Q21EclM5SVpZUHY5SA==',
		'Content-Type': 'application/json',
		'X-Lk': true
	}));
	
	html = AnyBalance.requestPost('https://asmp.a1.by/communityrest/mobile/passwordAuth', JSON.stringify({
        'username': login + '@a1.by',
        'password': prefs.password
    }), addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Content-Type': 'application/json'
	}));
	
	if(/Неверный (?:пароль|номер|телефон)/i.test(html) || AnyBalance.getLastStatusCode == 404){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Неверный пароль или номер телефона', null, true);
    }
	
    var json = getJson(html);
	
	saveTokens(json);
	
	g_headers['X-Sso-Authorization'] = AnyBalance.getData('tokenType') + ' ' + AnyBalance.getData('accessToken');
	
	
	html = AnyBalance.requestGet('https://appopenapi.a1.by/v1new_prod/profile?include=customer,subscriptions,subscriptions.activateSosCredits,subscriptions.addons,subscriptions.pauseInformation,subscriptions.currentChargesSum,subscriptions.units,subscriptions.primaryBillingAccount,subscriptions.tariff,subscriptions.currentCharges,roles,accounts,subscriptions.apns', addHeaders({
		'Accept': '*/*',
		'Authorization': 'Basic dW5kYWJvdDo3ZmhCMHF0Q21EclM5SVpZUHY5SA==',
		'Content-Type': 'application/json',
		'X-Lk': true
	}));
	
	var json = getJson(html);
	
	if(json.errors){
		var error = (json.errors || []).map(function(e) { return e.detail }).join('\n');
    	if(error)
    		throw new AnyBalance.Error(error, null, /телефон|пользовател|абонент/i.test(error));

    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
	
	var cabinetType = json.customer && json.customer.customerType;
	
	if(cabinetType){
		AnyBalance.trace('Тип кабинета: ' + cabinetType);
		if(cabinetType == 'residential')
			AnyBalance.trace('Это кабинет для физических лиц');
		else if(cabinetType == 'enterprise')
			AnyBalance.trace('Это кабинет для юридических лиц');
		else
		    AnyBalance.trace('Неизвестный тип кабинета: ' + cabinetType);
	}else{
		AnyBalance.trace('Не удалось определить тип кабинета');
	}
	
	if(!json.subscriptions.length){
		AnyBalance.trace('Не удалось получить список подключенных номеров');
	}
	
	var result = {success: true};
	
	var account;
    
    var phone = prefs.phone && prefs.phone.replace(/\D/g, '');
    
    AnyBalance.trace('Найдено подключенных номеров: ' + json.subscriptions.length);
            
    for(var i = 0; i < json.subscriptions.length; i++) {
        var curr = json.subscriptions[i];
		var needPhone = curr.msisdn;
		
        if(!phone) {
            account = curr;
            AnyBalance.trace('Номер в настройках не задан, возьмем первый: ' + curr.msisdn);
            break;
        }
            
        if(endsWith(curr.msisdn)) {
            account = curr;
            AnyBalance.trace('Нашли нужный номер: ' + curr.msisdn);
            break;
        }
    }

    if(!account) {
        AnyBalance.trace(JSON.stringify(json));
        throw new AnyBalance.Error('Не удалось найти ' + (prefs.phone ? 'номер телефона с последними цифрами ' + prefs.phone : 'ни одного номера телефона!'));
    }

    AnyBalance.trace('Успешно получили данные по номеру: ' + curr.msisdn);
//  AnyBalance.trace(JSON.stringify(account));
	
	var accountId = account.id;
	
	getParam(account.primaryBillingAccount.primaryBalance.moneyAmount, result, 'balance', null, null, parseBalance);
	getParam((account.spendingSum && account.spendingSum.moneyAmount)||0, result, 'spendingSum', null, null, parseBalance);
	getParam(account.tariff.name, result, '__tariff');
	getParam(account.msisdn, result, 'userNum', null, replaceNumber);
	getParam(account.tariff.contractNumber, result, 'acc');
	getParam(account.primaryBillingAccount.paymentType, result, 'paymentType');
	getParam(g_club[account.club]||account.club, result, 'club');
	getParam(account.monthlyInstallmentsSum, result, 'loan_balance', null, null, parseBalance);
	getParam(g_status[account.primaryBillingAccount.state]||account.primaryBillingAccount.state, result, 'status');
	
	if(AnyBalance.isAvailable('balanceBonus') && account.primaryBillingAccount.secondaryBalances){
		for(var i=0; i<account.primaryBillingAccount.secondaryBalances.length; ++i){
            var bal = account.primaryBillingAccount.secondaryBalances[i];
			AnyBalance.trace('Найден баланс ' + bal.name + ' (' + bal.nameValue + ')');
			
			if(bal.name == 'bonusBalance'){
			    getParam(bal.moneyAmount, result, 'balanceBonus', null, null, parseBalance);
			}else{
				AnyBalance.trace('Неизвестный баланс ' + bal.nameValue + ': ' + JSON.stringify(bal));
			}
		}
	}
	
	var reminders = account.units; // Остатки
	
	if(reminders && reminders.length > 0){
	    AnyBalance.trace('Найдено подключенных опций: ' + reminders.length);

        for(var i=0; i<reminders.length; ++i){
            var r = reminders[i];
            AnyBalance.trace('Найдена опция ' + r.name + ' (' + r.usageType + '): ' + JSON.stringify(r));
		    
	        if(/Voice|Call/i.test(r.usageType)){
				if(r.unitType == 'infinite' || /Безлимит/i.test(r.name)){
            	    AnyBalance.trace('Это безлимитные минуты, пропускаем...');
            	    continue;
                }else{
					AnyBalance.trace('Это минуты, обрабатываем...');
				}
                sumParam(r.amountRemaining, result, 'min_left', null, null, parseMinutes, aggregate_sum);
				sumParam(r.amountTotal, result, 'min_total', null, null, parseMinutes, aggregate_sum);
				sumParam(r.amountSpent, result, 'min_used', null, null, parseMinutes, aggregate_sum);
			}else if(/SMS|Message/i.test(r.usageType)){
				if(r.unitType == 'infinite' || /Безлимит/i.test(r.name)){
            	    AnyBalance.trace('Это безлимитные SMS, пропускаем...');
            	    continue;
                }else{
					AnyBalance.trace('Это SMS, обрабатываем...');
				}
                sumParam(r.amountRemaining, result, 'sms_left', null, null, parseBalance, aggregate_sum);
				sumParam(r.amountTotal, result, 'sms_total', null, null, parseBalance, aggregate_sum);
				sumParam(r.amountSpent, result, 'sms_used', null, null, parseBalance, aggregate_sum);
			}else if(/Data|Internet/i.test(r.usageType)){
				if(r.unitType == 'infinite' || /Безлимит/i.test(r.name)){
            	   AnyBalance.trace('Это безлимитный трафик, пропускаем...');
            	    continue;
                }else{
					AnyBalance.trace('Это трафик, обрабатываем...');
				}
                sumParam(r.amountRemaining + ' ' + r.unitType, result, 'traffic_left', null, null, parseTraffic, aggregate_sum);
				sumParam(r.amountTotal + ' ' + r.unitType, result, 'traffic_total', null, null, parseTraffic, aggregate_sum);
				sumParam(r.amountSpent + ' ' + r.unitType, result, 'traffic_used', null, null, parseTraffic, aggregate_sum);
		    }else{
                AnyBalance.trace('Неизвестная опция ' + r.name + ' (' + r.usageType + '): ' + JSON.stringify(r));
            }
        }
	}else{
		AnyBalance.trace('Не удалось получить информацию по остаткам');
	}
	
	var addons = account.addons; // Подключенные услуги
	
	if(addons && addons.length > 0){
	    AnyBalance.trace('Найдено подключенных услуг: ' + addons.length);
		getParam(addons ? addons.length : 0, result, 'services_count')
	    getParam(0, result, 'services_abon');

        for(var i=0; i<addons.length; ++i){
            var addon = addons[i];
            
			for(var j=0; j<addon.prices.length; ++j){
				var p = addon.prices[j];
			    if(p.recurringChargePeriod == 'OneTime'){ // Это разовая услуга, проверяем на предмет платности
                    var perunit = 'р';
					if(p.value > 0){
					    AnyBalance.trace('Найдена платная разовая услуга ' + addon.name + ': ' + p.value + ' ' + perunit);
					    sumParam(1, result, 'services_paid', null, null, null, aggregate_sum);
					}else{
						continue;
					}
				}else if(p.recurringChargePeriod == 'Month'){ // Ежемесячная услуга
			        var perunit = 'р/мес';
					if(p.value > 0){
					    AnyBalance.trace('Найдена платная услуга ' + addon.name + ': ' + p.value + ' ' + perunit);
					    sumParam(1, result, 'services_paid', null, null, null, aggregate_sum);
						sumParam(p.value, result, 'services_abon_month', null, null, null, aggregate_sum);
					}else{
						AnyBalance.trace('Найдена бесплатная услуга ' + addon.name + ': ' + p.value + ' ' + perunit);
						sumParam(1, result, 'services_free', null, null, null, aggregate_sum);
					}
				}else if(p.recurringChargePeriod == 'Day'){ // Ежесуточная услуга
					var perunit = 'р/сут';
					if(p.value > 0){
					    AnyBalance.trace('Найдена платная услуга ' + addon.name + ': ' + p.value + ' ' + perunit);
					    sumParam(1, result, 'services_paid', null, null, null, aggregate_sum);
						sumParam(p.value, result, 'services_abon_day', null, null, null, aggregate_sum);
					}else{
						AnyBalance.trace('Найдена бесплатная услуга ' + addon.name + ': ' + p.value + ' ' + perunit);
						sumParam(1, result, 'services_free', null, null, null, aggregate_sum);
					}
				}
			}
		}
	}else{
		AnyBalance.trace('Не удалось получить информацию по услугам');
	}
	
	var tariffPraces = account.tariff.prices; // Стоимость услуг
	
	if(tariffPraces && tariffPraces.length > 0){
        for(var i=0; i<tariffPraces.length; ++i){
            var tp = tariffPraces[i];
			if(tp.recurringChargePeriod == 'OneTime'){
				continue;
            }else if(tp.recurringChargePeriod == 'Month'){
				result.perunit = 'р/мес';
				sumParam(tp.value||0, result, 'abon', null, null, parseBalance, aggregate_sum);
			}else if(tp.recurringChargePeriod == 'Day'){
				result.perunit = 'р/сут';
				sumParam(tp.value||0, result, 'abon', null, null, parseBalance, aggregate_sum);
			}
		}
	}else{
		AnyBalance.trace('Не удалось получить информацию по абонплате');
	}
	
	if(AnyBalance.isAvailable('loan_balance', 'loan_next', 'loan_left', 'loan_end')){
	    html = AnyBalance.requestGet('https://appopenapi.a1.by/v1new_prod/installments?filter[subscription-id]=' + accountId, addHeaders({
		    'Accept': '*/*',
		    'Authorization': 'Basic dW5kYWJvdDo3ZmhCMHF0Q21EclM5SVpZUHY5SA==',
		    'Content-Type': 'application/json',
		    'X-Lk': true
	    }));
	    
	    var json = getJson(html);
		
		if(json.length && json.length > 0){
	        AnyBalance.trace('Найдено активных рассрочек: ' + json.length);

            var dates = [];
		    for(var i=0; i<json.length; ++i){
                var installment = json[i];
                AnyBalance.trace('Найдена рассрочка ' + installment.hardwareName + ': ' + JSON.stringify(installment));
			
			    if(!result.loan_balance)
				    sumParam(installment.monthlyAmount, result, 'loan_balance', null, null, parseBalance, aggregate_sum);
			    sumParam(installment.fullPaymentAmount, result, 'loan_left', null, null, parseBalance, aggregate_sum);
				
				var purDate = getParam(installment.purchaseDate, null, null, null, null, parseDateISO);
				var totalMonths = installment.installmentsTotal;
				var newDate = new Date(purDate);
				newDate.setMonth(newDate.getMonth() + totalMonths);
				endDate = n2(newDate.getDate()) + '.' + n2(newDate.getMonth()+1) + '.' + newDate.getFullYear();
			    
			    if(installment.nextAutoPaymentDate && installment.nextAutoPaymentDate !== null){
				    dates.push(getParam(installment.nextAutoPaymentDate, null, null, null, null, parseDateISO));
			    }else{
				    dates.push(getParam(installment.nextAutoPaymentText, null, null, /(\d+\s+[\s\S]*?)*?$/i, replaceTagsAndSpaces, parseSmallDateSilent));
			    }
				
				break; // Пока получаем данные только по первой рассрочке
            }
            
		    result.loan_next = findEarliestDate(dates);
			getParam(endDate, result, 'loan_end', null, null, parseDate);
	    }else{
		    AnyBalance.trace('Не удалось получить информацию по рассрочкам');
	    }
	}
		
	if(AnyBalance.isAvailable('userName', 'orgName')){
	    html = AnyBalance.requestGet('https://appopenapi.a1.by/v1new_prod/profile?include=customer', addHeaders({
		    'Accept': '*/*',
		    'Authorization': 'Basic dW5kYWJvdDo3ZmhCMHF0Q21EclM5SVpZUHY5SA==',
		    'Content-Type': 'application/json',
		    'X-Lk': true
	    }));
	    
	    var json = getJson(html);
	    
	    if(json.customer.customerType == 'enterprise'){
	        getParam(json.customer.name, result, 'orgName');
		    getParam(json.name, result, 'userName');
		}else{
			getParam(json.customer.name, result, 'userName');
		}
	}
	
	AnyBalance.setResult(result);
}

function mainInternet(html, result){
	var baseurl = 'https://my.a1.by/';
	
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите номер лицевого счета!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	if (prefs.login.length > 12 || prefs.login.length < 6)
		throw new AnyBalance.Error('Неверный формат номера. Номер лицевого счета должен содержать от 6 до 12 символов!', false, true);
//	if (prefs.password.length > 20)
//		throw new AnyBalance.Error('Неверный формат пароля. Пароль должен содержать не более 20 символов!', false, true);

    AnyBalance.setDefaultCharset('utf-8'); 
	
    var html = AnyBalance.requestGet(baseurl, g_headers);
	
	var sid;
	
	try {
		
		var form = AB.getElement(html, /<form[^>]*name="asmpform"/i);
		if(!form){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
		}
	    
		var params = AB.createFormParams(form, function(params, str, name, value) {
			if (name == 'pinCheck') {
				return 'false';
			}else if (name == 'UserIDFixed') {
				return prefs.login;
			} else if (name == 'fixedPassword') {
				return prefs.password;
			} else if (name == 'fixednet') {
				return 'true';
			}
	    
			return value;
		});

		var action = getParam(form, /action="([^"]*)/i, replaceHtmlEntities);
		var url = joinUrl(AnyBalance.getLastUrl(), action);
	    
		html = AnyBalance.requestPost(url, params, AB.addHeaders({
			Referer: AnyBalance.getLastUrl()
		}));
		
        var kabinetType, personalInfo;
		if(/_root\/PERSONAL_INFO_FISICAL/i.test(html)) {
            personalInfo = 'PERSONAL_INFO_FISICAL';
            kabinetType = 5;		
		} else if(/_root\/PERSONAL_INFO/i.test(html)){
            personalInfo = 'PERSONAL_INFO';
            kabinetType = 2;
        }
		
		AnyBalance.trace('Cabinet type: ' + kabinetType);
		
        if(!kabinetType){
            var error = getElement(html, /<[^>]*p--error/i, replaceTagsAndSpaces);
            if(error)
                throw new AnyBalance.Error(error, null, /не зарегистрирован|Неверно указан номер|номер телефона|парол/i.test(error));
            if(/Сервис временно недоступен/i.test(html))
                throw new AnyBalance.Error('Сервис временно недоступен. Пожалуйста, попробуйте позже.');
            
			AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
        }
		// Иногда сервис недоступен, дальше идти нет смысла
		if (/По техническим причинам работа с сервисами ограничена|Сервис временно недоступен/i.test(html)) {
			var message = getParam(html, null, null, /<div class="BREAK">([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
			if(message) {
				AnyBalance.trace('Сайт ответил: ' + message);
				throw new AnyBalance.Error('Сервис временно недоступен.\n ' + message);
			}
			
			throw new AnyBalance.Error('Сервис временно недоступен. Пожалуйста, попробуйте позже.');
		}	
		
        var result = {success: true};
        
        var sid = getParam(html, /<input[^>]+name="sid3"[^>]*value="([^"]*)/i, replaceHtmlEntities);
        if(!sid){
			if(AnyBalance.getLastStatusCode() >= 400){
				var error = getParam(html, null, null, /<h1[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, html_entity_decode);
				if(error)
					throw new AnyBalance.Error(error);
				throw new AnyBalance.Error('Сервис временно недоступен. Пожалуйста, попробуйте позже.');
			}
			AnyBalance.trace(html);
			throw new AnyBalance.Error(velcomOddPeople);
        }
        
		//Персональная информация
        html = requestPostMultipart(baseurl + 'work.html', {
            sid3: sid,
            user_input_timestamp: new Date().getTime(),
            user_input_0: '_next',
            last_id: '',
            user_input_1: personalInfo,
        }, addHeaders({
        	Referer: baseurl
        }));
		
		getParam(html, result, 'balance', /Баланс:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalanceRK);
		getParam(html, result, 'userName', /Клиент:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		getParam(html, result, 'acc', /Лицевой счет:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        getParam(html, result, 'status', /Статус л\/с:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        
		
		if(isAvailable(['trafic', 'trafic_total'])) {
            html = requestPostMultipart(baseurl + 'work.html', {
                sid3: sid,
                user_input_timestamp: new Date().getTime(),
                user_input_0: '_root/STATISTIC',
                last_id: '',
                user_input_1: '0',
                user_input_2: '',
            }, addHeaders({
            	Referer: baseurl
            }));

            html = requestPostMultipart(baseurl + 'work.html', {
                sid3: sid,
                user_input_timestamp: new Date().getTime(),
                user_input_0: '_next',
                last_id: '',
                user_input_1: 'STATISTIC_OF_TRAFFIC',
            }, addHeaders({
            	Referer: baseurl
            }));

            html = requestPostMultipart(baseurl + 'work.html', {
                sid3: sid,
                user_input_timestamp: new Date().getTime(),
                user_input_0: '_next',
                last_id: '',
                user_input_1: '1',
            }, addHeaders({
            	Referer: baseurl
            }));

            getParam(html, result, 'traffic_total', /ИТОГО[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

            var dt = new Date();
            sumParam(html, result, 'traffic', new RegExp(n2(dt.getMonth() + 1) + '\\.' + dt.getFullYear() + '[\\s\\S]*?<td[^>]*>([\\s\\S]*?)</td>', 'ig'),
                replaceTagsAndSpaces, parseBalance, aggregate_sum);
		}
		
	    try{
	    // Выходим из кабинета, чтобы снизить нагрузку на сервер
		    AnyBalance.trace('Выходим из кабинета, чтобы снизить нагрузку на сервер');
		    html = requestPostMultipart(baseurl + 'work.html', {
			    sid3: sid,
			    user_input_timestamp: new Date().getTime(),
			    user_input_0: '_exit',
			    user_input_1: '',
			    last_id: ''
		    }, g_headers);
	    } catch(e) {
		    AnyBalance.trace('Ошибка при выходе из кабинета: ' + e.message);
	    }

	} catch(e) {
		throw e;
	}
	
	AnyBalance.setResult(result);
}

function safeEval(window, script){
   try{
       var result = new Function('window', 'document', 'self', 'location', 'AnyBalance', 'g_AnyBalanceApiParams', '_AnyBalanceApi', script).call(window, window, window.document, window, window.location);
       return result;
   }catch(e){
       AnyBalance.trace('Bad javascript (' + e.message + '): ' + script);
       throw new AnyBalance.Error(velcomOddPeople);
   }
}

function n2(val){
	val = val + '';
	if(val.length < 2)
		val = '0' + val;
	return val;
}

function findEarliestDate(dates){
    if(dates.length == 0)
		return null;
	
    var earliestDate = dates[0];
	
    for(var i=1; i<dates.length; i++){
        var currentDate = dates[i];
        if(currentDate < earliestDate){
            earliestDate = currentDate;
        }
    }
	
    return earliestDate;
}

function parseSmallDateSilent(str) {
    return parseSmallDate(str, true);
}

function parseSmallDate(str, silent) {
    var dt = parseSmallDateInternal(str);
    if(!silent)
    	AnyBalance.trace('Parsed small date ' + new Date(dt) + ' from ' + str);
    return dt;
}

function parseSmallDateInternal(str) {
	var now = new Date();
	if (/сегодня/i.test(str)) {
		var date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		return date.getTime();
	} else if (/вчера/i.test(str)) {
		var date = new Date(now.getFullYear(), now.getMonth(), now.getDate()-1);
		return date.getTime();
	} else {
		if (!/\d{4}/i.test(str)) { //Если год в строке не указан, значит это текущий год
			str = str + ' '  + now.getFullYear();
		}
        var date = getParam(str, null, null, null, null, parseDateWordSilent);
		return date;
	}
}