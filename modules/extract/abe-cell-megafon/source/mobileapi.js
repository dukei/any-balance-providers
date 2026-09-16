var g_headers = {
	'Accept': 'application/json,text/plain,*/*',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Origin': 'https://lk.megafon.ru',
	'User-Agent': 'Mozilla/5.0 (Linux; Android 8.0.0; AUM-L29 Build/HONORAUM-L29; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/106.0.5249.126 Mobile Safari/537.36',
	'X-App-Type': 'webView',
	'X-Requested-With': 'ru.megafon.mlk'
};

var api_url = 'https://api.megafon.ru/mlk/';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function getAdditionalXCabinetHeaders(){
	try{
	    var html = AnyBalance.requestGet('https://lk.megafon.ru/login', g_headers);
	
	    var appId = getParam(html, null, null, /<script[^>]+src=['"]\/public\/rwlk\/app\.([\s\S]*?)\.js['"]/i, replaceHtmlEntities);
	    
	    if(appId){
		    html = AnyBalance.requestGet('https://lk.megafon.ru/public/rwlk/app.' + appId + '.js', g_headers);
		    
		    g_headers['X-Cabinet-Id-Param'] = getParam(html, null, null, /"X-Cabinet-Id-Param":\s*?"([^"]*)/i, replaceHtmlEntities);
		    g_headers['X-Cabinet-Check-Info'] = getParam(html, null, null, /"X-Cabinet-Check-Info":\s*?"([^"]*)/i, replaceHtmlEntities);
	        g_headers['X-Cabinet-Validation-Param'] = getParam(html, null, null, /"X-Cabinet-Validation-Param":\s*?"([^"]*)/i, replaceHtmlEntities);
	    }
	}catch(e){
		AnyBalance.trace('Ошибка получения идентификаторов запросов: ' + e.message);
	}
}

/** API Megafon LK*/
function callAPI(method, url, params, allowerror) {
    var prefs = AnyBalance.getPreferences();
    var html, headers = g_headers, jwtToken = AnyBalance.getData('jwtToken-' + prefs.login);
	
	if(jwtToken)
	    headers['X-Cabinet-Authorization'] = 'Bearer ' + jwtToken;
	
	if(/sessionCheck/i.test(url))
		headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
	
	if(method == 'post'){
        if(typeof(params) == 'string'){
            html = AnyBalance.requestPost(api_url + url, params, addHeaders({'Content-Type': 'application/json; charset=utf-8'}, headers));
        }else{
            html = AnyBalance.requestPost(api_url + url, params, addHeaders({'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'}, headers));
		}
    }else{
        html = AnyBalance.requestGet(api_url + url, headers);
		if(/sessionCheck/i.test(url) && AnyBalance.getLastStatusCode() >= 400){
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Сервер мобильного API временно недоступен. Попробуйте еще раз позже');
        }
	}
	
	var json = {};
    if(html){
        try{
            json = getJson(html);
        }catch(e){
            json = getJsonEval(html);
        }
    }
	
    if(json.code === 'a216'){ //Аккаунт заблокирован, надо явно его разблокировать через ussd или поддержку
    	throw new AnyBalance.Error(json.message, null, true);
    }

    if(json.code && !allowerror) { //Иногда мегафон случайно выдаёт на случайные методы Неавторизованный доступ
        throw new AnyBalance.Error('Ошибка вызова API! ' + json.message, /Неавторизованный доступ/i.test(json.message), /парол/i.test(json.message));
    }
    return json;
}

function megafonLkAPILogin(options){
    var prefs = AnyBalance.getPreferences();
    options = options || {};

    AnyBalance.setDefaultCharset('utf-8');
	
	var json = callAPI('get', 'api/auth/sessionCheck');

    if(json.authenticated){
        AnyBalance.trace('Уже авторизованы на номер ' + json.phone);
        if(json.phone != prefs.login){
            AnyBalance.trace('Номер неправильный (надо ' + prefs.login + '), придется авторизоваться заново');
            json.authenticated = false;
			AnyBalance.setData('jwtToken-' + prefs.login, undefined);
	        AnyBalance.saveData();
        }else {
            AnyBalance.trace('Номер правильный, используем текущую сессию');
			AnyBalance.setData('jwtToken-' + prefs.login, json.jwtToken);
	        AnyBalance.saveData();
			return;
        }
    }

    if(!json.authenticated){
        var json = callAPI('post', 'login', {'login': prefs.login, 'password': prefs.password}, true);

        if(json.code){
            if(json.code == 'a211' && options.allow_captcha){ //Капча
                var capchaImg = AnyBalance.requestGet(api_url + 'api/captcha/next', g_headers);
                var captcha = AnyBalance.retrieveCode('Мегафон иногда требует подтвердить, что вы не робот. Сейчас как раз такой случай.\n\nЧтобы уменьшить вероятность требования капчи, используйте опцию входа без пароля с однократным вводом кода из SMS при первом обновлении баланса.', capchaImg, {/*inputType: 'number'*/});
                json = callAPI('post', 'login', {'login': prefs.login, 'password': prefs.password, 'captcha': captcha});
            }

            if(json.code){
				AnyBalance.trace(JSON.stringify(json));
			    throw new AnyBalance.Error(json.message, null, /парол/i.test(json.message));
		    }
        }

        AnyBalance.setData('jwtToken-' + prefs.login, json.jwtToken);
	    AnyBalance.saveData();

        __setLoginSuccessful();
    }
}

function megafonLkAPILoginNew(options){
	var prefs = AnyBalance.getPreferences();
    options = options || {};

    AnyBalance.setDefaultCharset('utf-8');
	
	var pin = AnyBalance.getData('pin-' + prefs.login);
	if(pin)
		AnyBalance.setCookie('api.megafon.ru', 'X-Cabinet-Pin-Switcher', 'true', {path: '/'});
	
	var json = callAPI('get', 'api/auth/sessionCheck');

    if(json.authenticated){
        AnyBalance.trace('Уже авторизованы на номер ' + json.phone);
        if(json.phone != prefs.login){
            AnyBalance.trace('Номер неправильный (надо ' + prefs.login + '), придется авторизоваться заново');
            json.authenticated = false;
			AnyBalance.setData('jwtToken-' + prefs.login, undefined);
			AnyBalance.setData('token-' + prefs.login, undefined);
	        AnyBalance.saveData();
        }else{
            AnyBalance.trace('Номер правильный, используем текущую сессию');
			AnyBalance.setData('jwtToken-' + prefs.login, json.jwtToken);
	        AnyBalance.saveData();
			return;
        }
    }
	
	var csrfToken = AnyBalance.getCookie('NEW-CSRF-TOKEN');
    if(csrfToken) // Надо установить хедер X-Csrf-Token, без него не пропустит
        g_headers['X-Csrf-Token'] = csrfToken;

	if(pin){
		AnyBalance.trace('PIN-код сохранен. Входим автоматически');
		var json = callAPI('post', 'api/auth/pin', JSON.stringify({'msisdn': prefs.login, 'pin': pin}), true);
		AnyBalance.setData('jwtToken-' + prefs.login, json.jwtToken);
		AnyBalance.saveData();
		if(json.code){
			AnyBalance.trace(JSON.stringify(json));
			if(/Внутренняя ошибка/i.test(json.message)) //Иногда сервер глючит и не надо присылать смс второй раз
				throw new AnyBalance.Error(json.message + '\nПопробуйте еще раз позже');
            
			pin = null;
		}
	}
	if(!pin){
		AnyBalance.trace('Вход по одноразовому паролю. Привязываем устройство');
		var json = callAPI('post', 'api/auth/otp/request', {'captchaReady': true, 'login': prefs.login}, true);

		if(!json.ok){
			AnyBalance.trace(JSON.stringify(json));
			throw new AnyBalance.Error(json.message || 'Ошибка входа. Неправильный номер?', null, true);
		}

		var code = AnyBalance.retrieveCode('Пожалуйста, введите код входа в Личный Кабинет из СМС для привязки номера к устройству', null, {inputType: 'number', time: 300000});

		json = callAPI('post', 'api/auth/otp/submit', {'login': prefs.login, 'otp': code}, true);

		if(json.code){
			AnyBalance.trace(JSON.stringify(json));
			throw new AnyBalance.Error(json.message || 'Неверный код подтверждения');
		}
		
		AnyBalance.setData('jwtToken-' + prefs.login, json.jwtToken);
	    AnyBalance.saveData();

		var pin = Math.floor(1000 + Math.random()*9000).toString();
		json = callAPI('post', 'api/profile/pin', JSON.stringify({'pin': pin}));

		AnyBalance.setData('pin-' + prefs.login, pin);
		AnyBalance.saveData();
		
		__setLoginSuccessful();
	}
}

function megafonLkAPIDo(options, result) {
	var prefs = AnyBalance.getPreferences();

    if (AnyBalance.isAvailable('phone')) {
        getParam(prefs.login, result, 'phone', null, replaceNumber);
    }
     
    if (AnyBalance.isAvailable('balance', 'credit', 'available', 'cashback')) { // Раздел Связь
        try{
			json = callAPI('get', 'api/main/balance');
            const limit = (json.balanceWithLimit || json.limit || 0), cashback = (json.cashback || 0);
            getParam(limit + '', result, 'available', null, replaceTagsAndSpaces, parseBalance);
            getParam(json.balance + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
            getParam((limit - json.balance) + '', result, 'credit', null, replaceTagsAndSpaces, parseBalance);
			getParam(cashback + '', result, 'cashback', null, replaceTagsAndSpaces, parseBalance);
		}catch(e){
    	    AnyBalance.trace('Ошибка получения информации о балансе: ' + e.message);
        }
    }
	
	if (AnyBalance.isAvailable('own')) { // Раздел Финансы
        try{
		    json = callAPI('get', 'api/balance/commercial');
            getParam(json.balance + '', result, 'own', null, replaceTagsAndSpaces, parseBalance);
		}catch(e){
    	    AnyBalance.trace('Ошибка получения информации о собственных средствах: ' + e.message);
        }
    }
	
	if(AnyBalance.isAvailable('tariff', 'sub_smit', 'next_billing_date')){
		try{
    	    json = callAPI('get', 'api/tariff/2019-3/current?includeOptions=false');
    	    getParam(json.name, result, 'tariff', null, replaceTagsAndSpaces);
		    if(json.ratePlanCharges && json.ratePlanCharges.price){
				var per = 1; // Почему-то периоды возвращает по-разному (то за 30 дней, то за день)
				if(/в [день|сутки]/i.test(json.ratePlanCharges.price.unitPeriod))
					per = 30;
		        var tariffPrice = getParam(json.ratePlanCharges.price.value, null, null, null, replaceTagsAndSpaces, parseBalanceSilent);
				getParam(tariffPrice*per + '', result, 'sub_smit', null, replaceTagsAndSpaces, parseBalance);
				if(json.ratePlanCharges.chargeDate)
				    getParam(json.ratePlanCharges.chargeDate, result, 'next_billing_date', null, replaceTagsAndSpaces, parseDate);
		    }
		}catch(e){
    	    AnyBalance.trace('Ошибка получения информации о тарифном плане: ' + e.message);
        }
    }

    if(AnyBalance.isAvailable('bonus_status', 'bonus_burn')){
	    try{
            json = callAPI('get', 'api/bonus/status');
            getParam(json.statusDesc, result, 'bonus_status', null, replaceTagsAndSpaces);
            getParam(null, result, 'bonus_burn');
        }catch(e){
    	    AnyBalance.trace('Ошибка получения информации о бонусной программе: ' + e.message);
        }
	}

	processPersonalOffers(result);
	processServices(result);
    processRemaindersApi(result);
    processMonthExpensesApi(result);

    processPaymentsApi(result);

    if (AnyBalance.isAvailable('month_refill', 'sub_scl')) {
    	try{
            json = callAPI('get', 'api/payments/info');
            getParam(json.income + '', result, 'month_refill', null, replaceTagsAndSpaces, parseBalance);
			getParam(json.outcome + '', result, 'sub_scl', null, replaceTagsAndSpaces, parseBalance);
        }catch(e){
            AnyBalance.trace('Ошибка получения информации о расходах и пополнениях: ' + e.message + '\n' + e.stack);
        }
    }

    processInfoApi(result);
	
	processAddNumApi(result);
	
	processMegaPowersApi(result);

    if(AnyBalance.isAvailable('detalization'))
        processDetalizationApi(result);

    if(!options.dontTurnOffSms)
        processSmsTurnOffApi();
}

function processPaymentsApi(result){
    if (AnyBalance.isAvailable('payments')) {
    	try{
            var json = callAPI('get', 'api/payments/history?offset=0&size=10', true);
            
            if(json.payments) {
                result.payments = [];
            
                for (var i = 0; i < json.payments.length; i++) {
                    var pmnt = json.payments[i];
            
                    var p = {};
                    getParam(pmnt.amount, p, 'payments.sum');
                    getParam(pmnt.date, p, 'payments.date', null, null, parseDate);
                    getParam(pmnt.descr, p, 'payments.descr');
            
                    result.payments.push(p);
                }
            }else{
                AnyBalance.trace('Не удалось получить историю платежей: ' + JSON.stringify(json));
            }
        }catch(e){
            AnyBalance.trace('Ошибка получения истории платежей: ' + e.message + '\n' + e.stack);
        }
    }
}

function processMonthExpensesApi(result){
    if (AnyBalance.isAvailable('month_expenses')) {
    	try{
            var json = callAPI('get', 'api/reports/months', true);
            
            if(json.expenseMonths) {
                result.month_expences = [];
            
                for (var i = 0; i < json.expenseMonths.length; i++) {
                    var exp = json.expenseMonths[i];
            
                    var p = {};
                    getParam(exp.amount, p, 'month_expences.sum');
                    getParam(exp.reportDate, p, 'month_expences.date', null, null, parseDate); //MM/yyyy
                    getParam(exp.percent, p, 'month_expences.pct');
            
                    result.month_expences.push(p);
                }
            }else{
                AnyBalance.trace('Не удалось получить историю месячных трат: ' + JSON.stringify(json));
            }
        }catch(e){
            AnyBalance.trace('Ошибка получения истории месячных трат: ' + e.message + '\n' + e.stack);
        }
    }
}

function processRemaindersApi(result){
    if (AnyBalance.isAvailable('remainders')) {
		var json = callAPI('get', 'api/options/v2/remainders/mini');
		
		if(!json.remainders){
        	AnyBalance.trace('Остатков не обнаружено: ' + JSON.stringify(json));
        	return;
        }
		
		var remainders = result.remainders = {};
        var remaindersArrays = [];
		
		try{
			for(var i=0; i<json.remainders.length; i++) { // Формируем массив из подробных остатков по всем пакетам 
				var remainderType = json.remainders[i].remainderType;
			    var _json = callAPI('get', 'api/options/v2/remainders?remainderType=' + remainderType);
				for(var j=0; j<_json.remainders.length; j++) {
				    var remainder = _json.remainders[j];
				    for(var k=0; k<remainder.remainderDetails.length; k++) {
					    var remainderDetails = remainder.remainderDetails[k];
					    remainderDetails.remainderType = remainderType; // Задаём тип пакета принудительно
						remaindersArrays.push(remainderDetails);
				    }
			    }
			}
		}catch(e){
			AnyBalance.trace('Ошибка получения остатков по пакетам услуг: ' + e.message);
		}
		
		if(!remaindersArrays || (remaindersArrays && remaindersArrays.length < 1)){ // Пробуем получить остатки хотя бы из мини-виджета
			remaindersArrays = json.remainders;
		}
		
		if(remaindersArrays && remaindersArrays.length && remaindersArrays.length > 0) {
			for(var l=0; l<remaindersArrays.length; l++) { // Проверяем на наличие доп. пакетов и еще раз пересобираем основной массив
			    var current = remaindersArrays[l];
				if(current.subRemainders && current.subRemainders.length && current.subRemainders.length > 0) {
					var remainderType = current.remainderType;
					for(var m=0; m<current.subRemainders.length; m++) { // Выносим доп. пакеты из общих в основной массив
				        var subRemainder = current.subRemainders[m];
						subRemainder.remainderType = remainderType; // Задаем тип пакета принудительно
						remaindersArrays.push(subRemainder); // Добавляем доп. пакет в основной массив для пакетной обработки
			        }
					delete remaindersArrays[l]; // Удаляем общий пакет, чтобы не дублировать остатки
				}
			}
			
			for(var n=0; n<remaindersArrays.length; n++) {
				var current = remaindersArrays[n];
				
				// Пропускаем удаленные слоты массива, если они есть
				if(!current || current == undefined)
					continue;
				
				// Игнорируем услуги, для которых отсутствуют подключенные пакеты
				if(current.action && current.action == 'GO_SERVICES') {
                    AnyBalance.trace('Игнорируем услуги без подключенных пакетов... ' + JSON.stringify(current));
                    continue;
                }
				
                var name = (current.packName || current.name) + (current.discountName ? ' (' + current.discountName + ')' : '');
                var availUnits = current.availableValue.unit;
				var totalUnits = current.totalValue.unit;
				var packId = current.packId;
                
                // Игнорируем отрицательные значения пакетов
                if(current.availableValue.value < 0) {
                    AnyBalance.trace('Игнорируем отрицательные остатки... ' + JSON.stringify(current));
                    continue;
                }
				
				if(current.remainderType == 'VOICE' || /минут/i.test(name)){
					AnyBalance.trace('Parsing minutes... ' + JSON.stringify(current));
					if(!availUnits) availUnits = 'минут';
					if(!totalUnits) totalUnits = 'минут';
					var unlim = current.isUnlim || current.unlim || /^9{6,}$/i.test(current.totalValue.value); //Безлимитные значения только из девяток состоят
					if(unlim || +current.totalValue.value > 2600000) {
						AnyBalance.trace('Пропускаем безлимит минут: ' + name + ' ' + (current.availableValue.value + ' ' + availUnits) + '/' + (current.totalValue.value + ' ' + totalUnits));
						continue;
					}
					if(/в сутки/i.test(name)) {
						getParam(current.availableValue.value + ' ' + availUnits, remainders, 'remainders.mins_day', null, replaceTagsAndSpaces, parseMinutes);
                    }else if(/бесплат/i.test(name)) {
                        getParam(current.availableValue.value + ' ' + availUnits, remainders, 'remainders.mins_n_free', null, replaceTagsAndSpaces, parseMinutes);
                    }else if((/\.\s*МегаФон|на мегафон|на МФ/i.test(name) && !/МТС/i.test(name) && !/стационар/i.test(name))
                        || /внутри сети/i.test(name)) {
                        sumParam(current.availableValue.value + ' ' + availUnits, remainders, 'remainders.mins_net_left', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
					}else if(/Безлимитные входящие/i.test(name)) {
						AnyBalance.trace('Бесконечное значение минут (' + name + '), пропускаем...');
						continue;
                    }else{
                        sumParam(current.availableValue.value + ' ' + availUnits, remainders, 'remainders.mins_left', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
                        sumParam(current.totalValue.value + ' ' + totalUnits, remainders, 'remainders.mins_total', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
                    }
				}else if(current.remainderType == 'MESSAGE' || /СМС|SMS|ММС|MMS/i.test(name)){
					if(!availUnits) availUnits = 'штук';
					if(!totalUnits) totalUnits = 'штук';
					var unlim = current.isUnlim || current.unlim || /^9{6,}$/i.test(current.totalValue.value); //Безлимитные значения только из девяток состоят
					if(unlim){
						AnyBalance.trace('Пропускаем безлимит сообщений: ' + name + ' ' + (current.availableValue.value + ' ' + availUnits) + '/' + (current.totalValue.value + ' ' + totalUnits));
						continue;
					}
                    if(/SMS|СМС/i.test(name)){
                        AnyBalance.trace('Parsing sms... ' + JSON.stringify(current));
                        sumParam(current.availableValue.value + ' ' + availUnits, remainders, 'remainders.sms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                        sumParam(current.totalValue.value + ' ' + totalUnits, remainders, 'remainders.sms_total', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                    }else{
                        AnyBalance.trace('Parsing mms... ' + JSON.stringify(current));
                        sumParam(current.availableValue.value + ' ' + availUnits, remainders, 'remainders.mms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                        sumParam(current.totalValue.value + ' ' + totalUnits, remainders, 'remainders.mms_total', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                    }
				}else if(current.remainderType == 'INTERNET' || /интернет/i.test(name)){
					AnyBalance.trace('Parsing data... ' + JSON.stringify(current));
					if(!availUnits) availUnits = 'ГБ';
					if(!totalUnits) totalUnits = 'ГБ';
					if(/Гигабайт в дорогу/i.test(name)) {
                        getParam(current.availableValue.value + ' ' + availUnits, remainders, 'remainders.gb_with_you', null, replaceTagsAndSpaces, parseTraffic);
					}else if(/Интернет в роуминге/i.test(name)) {
						if(/Остальные страны/i.test(name))
							getParam(current.availableValue.value + ' ' + availUnits, remainders, 'remainders.internet_roam_other', null, replaceTagsAndSpaces, parseTraffic);
						else if(/Популярные страны/i.test(name))
							getParam(current.availableValue.value + ' ' + availUnits, remainders, 'remainders.internet_roam_popular', null, replaceTagsAndSpaces, parseTraffic);
						else if(/ЕВРОПА/i.test(name))
							getParam(current.availableValue.value + ' ' + availUnits, remainders, 'remainders.internet_roam_europe', null, replaceTagsAndSpaces, parseTraffic);
					}else if(/Автопродление/i.test(name)) {
						getParam(current.availableValue.value + ' ' + availUnits, remainders, 'remainders.internet_auto_prolong', null, replaceTagsAndSpaces, parseTraffic);
					}else if(/Интернет в (?:Крыму|поездке)/i.test(name)) {
						getParam(current.availableValue.value + ' ' + availUnits, remainders, 'remainders.internet_left_crimea', null, replaceTagsAndSpaces, parseTraffic);
                    }else{
                        var suffix = '';
                        if(/ноч/i.test(name)) suffix = '_night';
                        
                        var unlim = current.isUnlim || current.unlim || /^9{7,}$/i.test(current.totalValue.value); //Безлимитные значения только из девяток состоят
                        
                        var internet_left = getParam(current.availableValue.value + ' ' + availUnits, null, null, null, replaceTagsAndSpaces, parseTraffic);
                        var internet_total = getParam(current.totalValue.value + ' ' + totalUnits, null, null, null, replaceTagsAndSpaces, parseTraffic);
                        
						if(!unlim)
							unlim = (internet_total >= 999000); //Больше 999 ГБ это же явно безлимит
						if(unlim)
							AnyBalance.trace('Пропускаем безлимит трафика: ' + name + ' ' + (current.availableValue.value + ' ' + availUnits) + '/' + (current.totalValue.value + ' ' + totalUnits));
                        
                        if(isset(internet_left) && !unlim)
                            sumParam(internet_left, remainders, 'remainders.internet_left' + suffix, null, null, null, aggregate_sum);
                        if(isset(internet_total) && !unlim)
                            sumParam(internet_total, remainders, 'remainders.internet_total' + suffix, null, null, null, aggregate_sum);
						if(isset(internet_left) && isset(internet_total) && !unlim)
							sumParam(internet_total - internet_left, remainders, 'remainders.internet_cur' + suffix, null, null, null, aggregate_sum);
						if(isset(internet_left) && isset(internet_total)) // Для счетчика Общий расход трафика собираем весь трафик
                            sumParam(internet_total - internet_left, remainders, 'remainders.internet_cur_total', null, null, null, aggregate_sum);

                        if(current.dateTo)
                            sumParam(current.dateTo, remainders, 'remainders.internet_till', null, replaceTagsAndSpaces, parseDate, aggregate_min);
                        else if(current.dateFrom && current.monthly)
                            sumParam(current.dateFrom, remainders, 'remainders.internet_till', null, replaceTagsAndSpaces, function(str) {
                                var time = parseDate(str);
                                if(time){
                                    var dt = new Date(time);
                                    time = new Date(dt.getFullYear(), dt.getMonth()+1, dt.getDate(), dt.getHours(), dt.getMinutes(), dt.getSeconds()).getTime();
                                }
                                return time;
                            }, aggregate_min);
					}
				}else{
					AnyBalance.trace('Неизвестный пакет услуг: ' + name + ' (' + current.remainderType + ') '  + JSON.stringify(current));
				}
			}
		}else{
			AnyBalance.trace('Не удалось получить остатки по пакетам услуг');
		}
    }
}

function processInfoApi(result){
    if(AnyBalance.isAvailable('info')){
        AnyBalance.trace('Получаем инфо');

        try{
		    var json = callAPI('get', 'api/profile/info');
            
            var info = result.info = {};
            
            getParam(json.contractStart, info, 'info.date_start', null, null, parseDate);
            getParam(json.birthdate, info, 'info.birthday', null, null, parseDate);
            getParam(json.email, info, 'info.email');
            getParam(json.name, info, 'info.fio');
		    getParam(json.accountNumber, info, 'info.license');
            getParam(json.region.id, info, 'info.region_id');
            getParam(json.region.name, info, 'info.region_name');
		    var filial = {100: 'nw', 200: 'mos', 300: 'ctr', 400: 'kv', 500: 'vlg', 600: 'url', 700: 'sib', 800: 'dv'};
		    getParam(filial[json.region.id]||json.region.id, info, 'info.filial');
		}catch(e){
    	    AnyBalance.trace('Ошибка получения информации о персональных данных: ' + e.message);
        }
    }
	
	if(AnyBalance.isAvailable('license') && !info.license){
		try{
		    var json = callAPI('get', 'api/profile/accountNumber');
		    
            getParam(json.accountNumber, info, 'info.license');
		}catch(e){
    	    AnyBalance.trace('Ошибка получения информации о лицевом счете: ' + e.message);
        }
    }
}

function processAddNumApi(result){
	if(!AnyBalance.isAvailable('add_num', 'add_num1', 'add_num2'))
        return;
	
	try{
        var json = callAPI('get', 'api/additionalNumbers/list');
		
	    if(json.additionalNumbersList && json.additionalNumbersList.length > 0){
		    AnyBalance.trace('Найдено доп. номеров: ' + json.additionalNumbersList.length);
		    for(var i = 0; i<json.additionalNumbersList.length; i++){
			    var num = (i >= 1 ? 'add_num' + (i + 1) : 'add_num');
			    var prefix = (i >= 1 ? 'add_num_prefix' + (i + 1) : 'add_num_prefix');
			    var charge = (i >= 1 ? 'add_num_charge' + (i + 1) : 'add_num_charge');
		   	    getParam(json.additionalNumbersList[i].number, result, num, null, replaceNumber);
			    getParam(json.additionalNumbersList[i].prefix, result, prefix);
			    getParam(json.additionalNumbersList[i].dailyCharge, result, charge);
		    }
	    }else{
		    AnyBalance.trace('Не удалось получить список доп. номеров: ' + JSON.stringify(json));
	    }
	}catch(e){
    	AnyBalance.trace('Ошибка получения информации о дополнительных номерах: ' + e.message);
    }
}

function processSmsTurnOffApi(){
    try {
        // Проверим включены ли смс-оповещения о входе
        var json = callAPI('get', 'api/profile/info');
        if(json.notifications) {
            AnyBalance.trace('Включено смс оповещение о входе, отключаем...');

            json = callAPI('post', 'api/profile/notifications?status=false');
            AnyBalance.trace('Отключили, проверяем...');
            json = callAPI('get', 'api/profile/info');

            if(!json.notifications)
                AnyBalance.trace('Успешно отключили смс оповещение о входе в кабинет!');
            else
                AnyBalance.trace('Не удалось отключить смс оповещение о входе в кабинет. Свяжитесь с разработчиком.');
        } else {
            AnyBalance.trace('Cмс оповещение о входе в кабинет уже отключено!');
        }
    } catch(e) {
        AnyBalance.trace('Отключение смс не удалось: ' + e.message);
    }
}

function processMegaPowersApi(result){
	if(!AnyBalance.isAvailable('megapowers'))
        return;
	
	var mpOn = 0;
	var mpAvailable = 0;
	
	try{
        var json = callAPI('get', 'api/preconstructor/megapowers');
		
		if(!/[МегаСилы|они] недоступны/i.test(json.description)){
	        if(json.options && json.options.length > 0){
		        for(var i = 0; i<json.options.length; i++){
			        var mpStatus = json.options[i].status;
			        
			        if(mpStatus && mpStatus !== '0') mpOn += 1;
		        }
	        }else{
		        AnyBalance.trace('Не удалось получить список доступных мегасил: ' + JSON.stringify(json));
	        }
	        
	        if(json.badges && json.badges.length > 0){
		        for(var i = 0; i<json.badges.length; i++){
			        mpAvailable += json.badges[i].counterLimit;
		        }
	        }else{
		        AnyBalance.trace('Не удалось получить лимит доступных мегасил: ' + JSON.stringify(json));
	        }
		}else{
		    AnyBalance.trace('Не удалось получить список мегасил: ' + json.description);
	    }
	}catch(e){
    	AnyBalance.trace('Ошибка получения информации о мегасилах: ' + e.message);
    }
	
	getParam(mpOn + '/' + mpAvailable + ' шт', result, 'megapowers');
}

function processPersonalOffers(result){
	if(!AnyBalance.isAvailable('personal_offers'))
		return;

    try{
	    var json = callAPI('get', 'api/personaloffer/summary');
	    getParam(json.count, result, 'personal_offers');
	}catch(e){
    	AnyBalance.trace('Ошибка получения информации о персональных предложениях: ' + e.message);
    }
}

function processServices(result){
	if(!AnyBalance.isAvailable('services_free', 'services_paid', 'services_count', 'services_abon', 'services_abon_day', 'statuslock'))
		return;

    try{
	    var json = callAPI('get', 'api/services/currentServices/list');
		AnyBalance.trace('Найдено услуг: ' + ((json.free ? json.free.length : 0) + (json.paid ? json.paid.length : 0)));
        	    
        getParam(json.free ? json.free.length : 0, result, 'services_free');
        getParam(json.paid ? json.paid.length : 0, result, 'services_paid');
	    getParam((json.free ? json.free.length : 0) + (json.paid ? json.paid.length : 0), result, 'services_count');
	    getParam(0, result, 'services_abon');
		getParam(0, result, 'services_abon_day');
	    getParam('Номер не блокирован', result, 'statuslock');
	    
	    // Добровольная блокировка номера - платная услуга, проверяем её наличие в подключённых платных
		if(json.paid && json.paid.length > 0){
	        for(var i=0; i<json.paid.length; ++i){
	    	    var s = json.paid[i];
				var fees = (s.fees && s.fees[0]) || (s.previewImportantInformation && s.previewImportantInformation[0] && s.previewImportantInformation[0].title);
			    AnyBalance.trace('Платная услуга ' + s.optionName + ': ' + fees);
                
		        var suffix = '';
                
				if(s.rcRate && s.rcRatePeriodText){
				    if(s.monthly !== true) suffix = '_day';
					
					sumParam(s.monthRate, result, 'services_abon' + suffix, null, null, null, aggregate_sum);
				}else if(fees){
					if(/сутки|день/i.test(fees)) suffix = '_day';
                    
					sumParam(fees, result, 'services_abon' + suffix, null, null, parseBalanceSilent, aggregate_sum);
				}
			    
			    if(/Блокировка номера/i.test(s.optionName)){
                    getParam('Номер заблокирован', result, 'statuslock');
                }
	        }
	    }
	}catch(e){
    	AnyBalance.trace('Ошибка получения информации об услугах: ' + e.message);
    }
}
