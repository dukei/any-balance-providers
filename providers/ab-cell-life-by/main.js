/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'ru-RU,ru;q=0.9',
	'Content-Type': 'application/json;charset=UTF-8',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36'
};

var g_status = {
	ACTIVE: 'Активный',
	INACTIVE: 'Неактивный',
	BLOCKED: 'Заблокирован',
	undefined: 'Не определен'
};

var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d{3})(\d\d)(\d{3})(\d\d)(\d\d)$/, '+$1 ($2) $3-$4-$5'];

function generateCodeVerifier(){
    for(var t = "", e = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", n = 0; n < 64; n++)
        t += e.charAt(Math.floor(Math.random() * e.length));
    return t.substring(2, 11) + '-' + t.substring(16, 21) + '-' + t.substring(26, 32);
}

function saveTokens(json){
	AnyBalance.setData('accessToken', json.access_token);
	AnyBalance.setData('refreshToken', json.refresh_token);
    AnyBalance.setData('expiresIn', json.expires_in);
	AnyBalance.setData('tokenType', json.token_type);
	AnyBalance.setData('sessionState', json.session_state);
	AnyBalance.saveData();
}

function main(){
	var prefs = AnyBalance.getPreferences();
	
/*	switch(prefs.source){
    case 'site':
        mainWeb();
		break;
	case 'app':
        mainApi();
		break;
    case 'auto':
    default:
        try{*/
		    mainApi();
/*	    }catch(e){
		    AnyBalance.trace('Ошибка при получении данных через API');
		    if(/номер|парол/.test(e.message))
			    throw new AnyBalance.Error(e.message, false, true);
            if(/заблокирован/.test(e.message))
			    throw new AnyBalance.Error(e.message, false, true);
		    AnyBalance.trace(e.message);
            mainWeb();
	    }
        break;
	}*/
}

function callApi(verb, params){
	var headers = {
        'Accept-Language': 'ru',
		'Connection': 'Keep-Alive',
        'Version': 'Android App 1.0.251',
        'Accept-Encoding': 'gzip',
        'User-Agent': 'okhttp/4.12.0'
    };
	
	var accessToken = AnyBalance.getData('accessToken');
	
	var method = 'GET';
	if(params){
		method = 'POST';
		headers['Content-Type'] = 'application/x-www-form-urlencoded';
	}else{
		headers['Content-Type'] = 'application/json';
	}
	
	if(/otp\/send|oauth\/token/i.test(verb)){
		var baseurl = 'https://oauth.life.com.by/';
		headers['Connection'] = 'Keep-Alive';
	}else{
		var baseurl = 'https://lifegoapi.life.com.by/';
		if(accessToken)
		    headers['Authorization'] = 'Bearer ' + accessToken;
		headers['Connection'] = 'close';
	}
	
	AnyBalance.trace('Запрос: ' + baseurl + verb);
	var html = AnyBalance.requestPost(baseurl + verb, params, headers, {HTTP_METHOD: method});
	if(AnyBalance.getLastStatusCode() >= 500)
        throw new AnyBalance.Error('Сервер мобильного API временно недоступен. Попробуйте еще раз позже');
	var json = getJson(html);
	AnyBalance.trace('Ответ: ' + JSON.stringify(json));
	if(json.error){
		var error = json.message || json.error_description || json.error;
		if(error)
			throw new AnyBalance.Error(error, null, /номер|парол/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}

	return json;
}

function loginPure(verb, params){
	var prefs = AnyBalance.getPreferences();
	
    var deviceId = AnyBalance.getData('deviceId');
	if(!deviceId){
	    deviceId = generateCodeVerifier();
		AnyBalance.setData('deviceId', deviceId);
	    AnyBalance.saveData();
	}
	
	var json = callApi('api/v1/otp/send', {'user': '375' + prefs.login, 'channel': 'sms', 'app': 'lifego_andr', 'lang': 'ru'});
	
	var formattedLogin = prefs.login.replace(/.*(\d\d)(\d{3})(\d\d)(\d\d)$/, '+375 ($1) $2-$3-$4');
	
	var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения из SMS, высланного на номер ' + formattedLogin, null, {inputType: 'number', time: 300000});
    
	var json = callApi('oauth/token', {'username': '375' + prefs.login, 'password': code, 'Authorization-id': deviceId, 'grant_type': 'password', 'client_id': 'lifego_android', 'client_secret': 'hummed-Z$rSiDf958z*@VA'});
	
    if(!json.access_token){
    	AnyBalance.trace(JSON.stringify(json));
    	throw new AnyBalance.Error('Не удалось получить токен авторизации');
    }else{
		AnyBalance.trace('Токен авторизации получен');
	}
	
	AnyBalance.setData('login', prefs.login);
	AnyBalance.saveData();
	saveTokens(json);
}

function loginAccessToken(){
	var prefs = AnyBalance.getPreferences();
	var accessToken = AnyBalance.getData('accessToken');
	try{
	    AnyBalance.trace('Токен сохранен. Пробуем войти...');
		var json = callApi('profile-subscriber');
		AnyBalance.trace('Успешно вошли по accessToken');
		return true;
	}catch(e){
		AnyBalance.trace('Не удалось войти по accessToken: ' + e.message);
		return false;
	}
}

function loginRefreshToken(){
	var prefs = AnyBalance.getPreferences();
	var deviceId = AnyBalance.getData('deviceId');
	var refreshToken = AnyBalance.getData('refreshToken');
	try{
		AnyBalance.trace('Токен устарел. Пробуем обновить...');
		var json = callApi('oauth/token', {'refresh_token': refreshToken, 'Authorization-id': deviceId, 'grant_type': 'refresh_token', 'client_id': 'lifego_android', 'client_secret': 'hummed-Z$rSiDf958z*@VA', 'device-name': 'HONOR AUM-L29', 'version': 'Мой life:) Android 1.1.53'});
		AnyBalance.trace('Успешно вошли по refreshToken');
		saveTokens(json);
		return true;
	}catch(e){
		AnyBalance.trace('Не удалось войти по refreshToken: ' + e.message);
		if(/Token.*?expired|Invalid/i.test(e.message)){
    		saveTokens({});
		    return false;
    	}else{
    		throw e;
    	}
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

function mainApi() {
    var prefs = AnyBalance.getPreferences();

    checkEmpty(prefs.login, 'Введите номер телефона!');
//    checkEmpty(prefs.password, 'Введите пароль!');
	
	var matches = prefs.login.match(/^(\d{2})(\d{7})$/);
    if (!matches)
        throw new AnyBalance.Error('Введите 9 последних цифр номера телефона (без префикса +375) без пробелов и разделителей!');
	
	login();

	var result = {success: true, balance: null};
	
	var json;
	
	if(AnyBalance.isAvailable('balance')){
  	    json = callApi('balance/myBalances');
  	    getParam(json.content.balance, result, 'balance', null, null, parseBalance);
    }
	
    json = callApi('tariff/tariffTop');
	
	if(AnyBalance.isAvailable('__tariff', 'paid_to', 'abon', 'phone')){
  	    json = callApi('tariff/tariffTop');
		getParam(json.content.tariff.title, result, '__tariff');
  	    getParam(json.content.paidTo, result, 'paid_to', null, null, parseDate);
	    getParam(json.content.tariff.price, result, 'abon', null, null, parseBalance);
	    result.perunit = getParam(json.content.tariff.price, null, null, null, null, parseCurrency);
		result.phone = prefs.login.replace(/.*(\d\d)(\d{3})(\d\d)(\d\d)$/, '+375 ($1) $2-$3-$4');
    }
	
	if(AnyBalance.isAvailable('bonuses', 'bonuses_burn', 'bonuses_burn_date')){
  	    json = callApi('balance/additionalBalances');
		if(json.content.items && json.content.items.length > 0){
            for(var i=0; i<json.content.items.length; ++i){
				var item = json.content.items[i];
				if(/Бонусный сч[её]т/i.test(item.name)){
					getParam(Math.round(item.cost*100)/100, result, 'bonuses', null, null, parseBalance);
					for(var j=item.detailed.length-1; j>=0; j--){
						var detail = item.detailed[j];
				        getParam(detail.cost, result, 'bonuses_burn', null, null, parseBalance);
		                getParam(detail.date, result, 'bonuses_burn_date', null, null, parseDate);
						
						break;
					}
				}else{
					AnyBalance.trace('Неизвестный счет: ' + item.name);
				}
		    }
	    }else{
		    AnyBalance.trace('Не удалось получить информацию по бонусному счету');
	    }
    }
	
	if(AnyBalance.isAvailable('traffic_left', 'min_left', 'min_left_other', 'sms_left', 'sms_left_other')){
  	    json = callApi('balance/nonmonetary');
        var items = json.content.nonmonetary_items;
  	    for(var i=0; i<items.length; ++i){
  		    var item = items[i];
  		    if(item.code === 'GPRS'){
  			    getParam(item.title_value, result, 'traffic_left', null, null, parseTraffic);
  		    }else if(item.code === 'MOC'){
  			    getParam(item.additional_value, result, 'min_left', null, null, parseBalance);
  			    getParam(item.title_value, result, 'min_left_other', null, null, parseBalance);
  		    }else if(item.code === 'SMS'){
  			    getParam(item.additional_value, result, 'sms_left', null, null, parseBalance);
  			    getParam(item.title_value, result, 'sms_left_other', null, null, parseBalance);
  		    }else{
  			    AnyBalance.trace('Неизвестный остаток: ' + JSON.stringify(item));
  		    }
  	    }
    }
	
	if(AnyBalance.isAvailable('services_total', 'services_paid', 'services_free', 'services_abon')){
  	    json = callApi('service/groups');
		getParam(0, result, 'services_total');
	    getParam(0, result, 'services_paid');
		getParam(0, result, 'services_free');
		getParam(0, result, 'services_abon');
		if(json.content.service_items && json.content.service_items && json.content.service_items.length > 0){
            AnyBalance.trace('Найдено услуг: ' + json.content.service_items.length);
			for(var i=0; i<json.content.service_items.length; ++i){
				var service = json.content.service_items[i];
                sumParam(1, result, 'services_total', null, null, parseBalanceSilent, aggregate_sum);
		        if(service.s_cost_value == 0 || service.s_cost_value == 'Бесплатно' || service.s_cost_value == null){
					AnyBalance.trace('Бесплатная услуга ' + service.s_name);
			        sumParam(1, result, 'services_free', null, null, parseBalanceSilent, aggregate_sum);
		        }else{
					AnyBalance.trace('Платная услуга ' + service.s_name + ': ' + service.s_cost_value + ' ' + service.s_cost_label);
			        var dt = new Date();
			        sumParam(1, result, 'services_paid', null, null, parseBalanceSilent, aggregate_sum);
                    
		            if(/\/сут[ки]*|\/день/i.test(service.s_cost_label)){
                        var cp = new Date(dt.getFullYear(), dt.getMonth()+1, 0).getDate(); // Дней в этом месяце
                    }else{
                        var cp = 1;
                    }
		            sumParam(service.s_cost_value*cp, result, 'services_abon', null, null, parseBalanceSilent, aggregate_sum);
		        }
		    }
	    }else{
		    AnyBalance.trace('Не удалось получить информацию по подключенным услугам');
	    }
    }
	
	if(AnyBalance.isAvailable('month_expenses')){
  	    var dt = new Date();
		var endDate = n2(dt.getMonth()+1) + '.' + dt.getFullYear();
		var dtPrev = new Date(dt.getFullYear(), dt.getMonth()-1, dt.getDate());
        var startDate = n2(dtPrev.getMonth()+1) + '.' + dtPrev.getFullYear();
		json = callApi('balance/paymentCosts?startDate=' + startDate + '&endDate=' + endDate);
		if(json.content && json.content.length && json.content.length > 0){
            AnyBalance.trace('Найдено расходов в текущем месяце: ' + json.content.length);
			for(var i=0; i<json.content.length; ++i){
				var expense = json.content[i];
				sumParam(expense.sum, result, 'month_expenses', null, null, parseBalanceSilent, aggregate_sum);
		    }
	    }else{
			AnyBalance.trace('Не удалось получить информацию по расходам в текущем месяце');
		}
    }
	
	if(AnyBalance.isAvailable('month_refill', 'last_payment_sum', 'last_payment_date', 'last_payment_descr')){
  	    var dt = new Date();
		var endDate = n2(dt.getMonth()+1) + '.' + dt.getFullYear();
		
		var dtPrev = new Date(dt.getFullYear(), dt.getMonth()-1, dt.getDate());
        var startDate = n2(dtPrev.getMonth()+1) + '.' + dtPrev.getFullYear();
		json = callApi('balance/paymentHistory?startDate=' + startDate + '&endDate=' + endDate);
		var content = json.content && json.content[0];
		if(content && content.items && content.items.length && content.items.length > 0){
            AnyBalance.trace('Найдено платежей в текущем месяце: ' + content.items.length);
			getParam(content.items[0].count, result, 'last_payment_sum', null, null, parseBalance);
		    getParam(content.items[0].date, result, 'last_payment_date', null, null, parseDate);
			getParam(content.items[0].name, result, 'last_payment_descr');
			for(var i=0; i<content.items.length; ++i){
				var payment = content.items[i];
				sumParam(payment.count, result, 'month_refill', null, null, parseBalanceSilent, aggregate_sum);
		    }
	    }else{
		    AnyBalance.trace('Не удалось получить информацию по платежам в текущем месяце. Пробуем получить платежи за последние 3 месяца');
		    var dtPrev = new Date(dt.getFullYear(), dt.getMonth()-3, dt.getDate());
		    var startDate = n2(dtPrev.getMonth()+1) + '.' + dtPrev.getFullYear();
		    
		    json = callApi('balance/paymentHistory?startDate=' + startDate + '&endDate=' + endDate);
		    var allContent = [];
	        
	        if(AnyBalance.isAvailable('month_refill')) result.month_refill = 0;
			if(json.content && json.content.length && json.content.length > 0){
				for(var i=0; i<json.content.length; ++i){
					var content = json.content[i];
					if(content && content.items && content.items.length && content.items.length > 0){
				        for(var j=0; j<content.items.length; ++j){
							allContent = allContent.concat(content.items[j]);
				        }
					}
				}
			}
			AnyBalance.trace('allContent: ' + JSON.stringify(allContent));
		    if(allContent && allContent.length && allContent.length > 0){
                AnyBalance.trace('Найдено платежей за последние 3 месяца: ' + allContent.length);
			    for(var i=0; i<allContent.length; ++i){
				    var payment = allContent[i];
					getParam(payment.count, result, 'last_payment_sum', null, null, parseBalance);
		            getParam(payment.date, result, 'last_payment_date', null, null, parseDate);
			        getParam(payment.name, result, 'last_payment_descr');
					break;
		        }
	        }else{
		        AnyBalance.trace('Не удалось получить информацию по платежам за последние 3 месяца');
	        }
		}
    }
	
	if(AnyBalance.isAvailable('fio', 'status')){
  	    json = callApi('profile-subscriber');
		if(json.content.contract.fullName)
  	        getParam(json.content.contract.fullName.match(/[A-ZА-Я][a-zа-я]+|[0-9]+/g).join(' '), result, 'fio');
	    getParam(json.content.contract.status, result, 'status');
    }
	
	AnyBalance.setResult(result);
}

function callApiWeb(verb, params){
	var baseurl = 'https://life.com.by/~api/json/';
	
	var headers = g_headers;
	
	headers['Content-Type'] = 'application/json';
	
	if(/getOauthAccessToken/i.test(verb)){
		headers['Referer'] = 'https://life.com.by/?popupType=auth&showPopup=true';
	}else{
		headers['Origin'] = 'https://life.com.by';
		headers['Referer'] = 'https://life.com.by/id';
	}
	
	AnyBalance.trace('Запрос: ' + baseurl + verb);
	
	var html = AnyBalance.requestPost(baseurl + verb, JSON.stringify(params), headers);
	
	if(AnyBalance.getLastStatusCode() == 401){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Отказ в доступе. Неправильный логин или пароль?', null, true);
	}

	if(AnyBalance.getLastStatusCode() >= 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка вызова API ' + verb + ': ' + AnyBalance.getLastStatusCode());
	}

	var json = getJson(html);
	AnyBalance.trace('Ответ: ' + JSON.stringify(json));
	return json;
}

function mainWeb() {
    var prefs = AnyBalance.getPreferences();

    checkEmpty(prefs.login, 'Введите номер телефона!');
    checkEmpty(prefs.password, 'Введите пароль!');
	
	var matches = prefs.login.match(/^(\d{2})(\d{7})$/);
    if (!matches)
        throw new AnyBalance.Error('Введите 9 последних цифр номера телефона (без префикса +375) без пробелов и разделителей!');
	
	var html = AnyBalance.requestGet('https://life.com.by/id', addHeaders({Referer: 'https://life.com.by/?popupType=auth&showPopup=true'}));

    var json = callApiWeb('extend.lifeconnector/getOauthAccessToken', {
  	  "msisdn": "375" + prefs.login,
  	  "password": prefs.password
    });
    
    if(json.redirectToCorp){
  	  mainIssa();
  	  return;
    }
    
    if(!json.accessToken){
  	    var error = json.error && json.error.text;
  	    if(error)
  		    throw new AnyBalance.Error(replaceAll(error, replaceTagsAndSpaces), null, /не существует|парол/i.test(error));
  	    AnyBalance.trace(JSON.stringify(json));
  	    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
    
    var result = {success: true, balance: null};
	
	if(AnyBalance.isAvailable('balance', 'bonuses', 'bonuses_burn', 'bonuses_burn_date')){
  	    json = callApiWeb('extend.account/getAccountData', {"chainName": "LHA_getUserBalance", "language": "rus"});
  	    getParam(json.total, result, 'balance', null, null, parseBalance);
	    if(json.bonus && json.bonus.length > 0){
            for(var i=0; i<json.bonus.length; ++i){
			    sumParam(json.bonus[i].balance, result, 'bonuses', null, null, parseBalance, aggregate_sum);
		    }
		    getParam(json.bonus[0].balance, result, 'bonuses_burn', null, null, parseBalance);
		    getParam(json.bonus[0].date, result, 'bonuses_burn_date', null, null, parseDate);
	    }else{
		    AnyBalance.trace('Не удалось получить информацию по бонусному счету');
	    }
    }
	
	if(AnyBalance.isAvailable('__tariff', 'phone', 'fio', 'status', 'paid_to', 'abon')){
  	    json = callApiWeb('extend.account/getAccountData', {"chainName":"LH_Active_TP","language":"rus"});
		getParam(json.tariffName, result, '__tariff');
        getParam(json.MSISDN, result, 'phone', null, replaceNumber);
  	    getParam(json.firstName + ' ' + json.lastName, result, 'fio');
	    getParam(g_status[json.state_TP]||json.state_TP, result, 'status');
		getParam(json.next_trigger, result, 'paid_to', null, null, parseDateWord);
	    getParam(json.tariffCost, result, 'abon', null, null, parseBalance);
	    result.perunit = getParam(json.tariffCost, null, null, null, null, parseCurrency);
    }
    
    if(AnyBalance.isAvailable('traffic_left', 'min_left', 'min_left_other', 'sms_left', 'sms_left_other')){
  	    json = callApiWeb('extend.account/getAccountData', {"chainName": "LHA_getCurrentBalances", "language": "rus"});
    
  	    for(var i=0; i<json.length; ++i){
  		    var item = json[i];
  		    if(item.popupData.apiPathData.type === 'gprs'){
  			    getParam(item.title, result, 'traffic_left', null, null, parseTraffic);
  		    }else if(item.popupData.apiPathData.type === 'moc'){
  			    getParam(item.text, result, 'min_left', null, null, parseBalance);
  			    getParam(item.title, result, 'min_left_other', null, null, parseBalance);
  		    }else if(item.popupData.apiPathData.type === 'sms'){
  			    getParam(item.text, result, 'sms_left', null, null, parseBalance);
  			    getParam(item.title, result, 'sms_left_other', null, null, parseBalance);
  		    }else{
  			    AnyBalance.trace('Неизвестный остаток: ' + JSON.stringify(item));
  		    }
  	    }
    }

  AnyBalance.setResult(result);
}

function mainIssa() {
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://issa.life.com.by/';

    checkEmpty(prefs.login, 'Введите номер телефона!');
    checkEmpty(prefs.password, 'Введите пароль!');
    
    var matches = prefs.login.match(/^(\d{2})(\d{7})$/);
    if (!matches)
        throw new AnyBalance.Error('Введите 9 последних цифр номера телефона (без префикса +375) без пробелов и разделителей!');

	var main = 'ru/';
	var html = AnyBalance.requestGet(baseurl + main, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

    html = AnyBalance.requestPost(baseurl + main, {
        csrfmiddlewaretoken: AB.getParam(html, null, null, /csrfmiddlewaretoken['"][\s\S]*?value=['"]([^"']*)['"]/i),
        msisdn_code: matches[1],
        msisdn: matches[2],
        super_password: prefs.password,
        form: true,
        next: '/ru/'
    }, addHeaders({
        Referer: baseurl + main
    }));
    
    // Иногда после логина висит 500ая ошибка, при переходе на главную все начинает работать
    if (/Ошибка 500/i.test(html)) {
        AnyBalance.trace('Ошибка при логине... попробуем исправить...');
        html = AnyBalance.requestGet(baseurl + main + 'informaciya/abonent/', g_headers);
    }
    
    if (!/logout/i.test(html)) {
        if (/action\s*=\s*["']https:\/\/issa2\.life\.com\.by/i.test(html)) {
            AnyBalance.trace('Этот номер не поддерживается в новом кабинете, нас редиректит на старый адрес...');
            doOldCabinet(prefs, matches);
            return;
        }
        var error = getParam(html, null, null, /errorlist[^"]*"[^<]([\s\S]*?)<\/ul>/i, AB.replaceTagsAndSpaces);
        if (error) {
            throw new AnyBalance.Error(error, null, /пароль/i.test(error));
        }
        AnyBalance.trace(html);
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Сайт изменен?");
    }

    var result = {success: true, balance: null};

//  html = AnyBalance.requestGet(baseurl + 'ru/informaciya/abonent/', g_headers);

    getParam(html, result, '__tariff', [/Тарифный план([^<]+)/i, /(?:Тарифный план|Наименование тарифного плана)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i], replaceTagsAndSpaces);
    getParam(html, result, 'fio', /ФИО(?:[^>]+>){2}([^<]+)/i, replaceTagsAndSpaces);
    getParam(html, result, 'phone', /Номер (?:life|телефона)(?:[^>]+>){2}([^<]+)/i, replaceTagsAndSpaces);
    // СМС/ММС
    sumParam(html, result, 'sms_left_other', /SMS на все сети(?:[^>]+>){2}([^<]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    sumParam(html, result, 'sms_left', /SMS внутри сети(?:[^>]+>){2}([^<]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    sumParam(html, result, 'mms_left', /MMS внутри сети(?:[^>]+>){2}([^<]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    // Карманы
    html = sumParam(html, result, 'carmani_min_left', /(?:&#34;|"|\()карманы(?:&#34;|"|\))(?:[^>]*>){2}([\s\S]*?)<\//ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum, true);
    // Минуты
    sumParam(html, result, 'min_left_other', /Звонки (?:на|во|в) (?:все|другие) сети(?:[^>]+>){2}([^<]+)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
    sumParam(html, result, 'min_left', /Звонки внутри сети(?:[^>]+>){2}([^<]+)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
    sumParam(html, result, 'min_left_other', /Звонки для группы(?:[^>]+>){2}([^<]+)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
    // Трафик
    sumParam(html, result, 'traffic_night_left', />\s*Ночной интернет(?:[^>]+>){2}([^<]+(?:МБ|Гб|Кб|Байт))/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
    sumParam(html, result, 'traffic_left', />(?:(?:Безлимитный)?\s*интернет|Интернет со скидкой)(?:[^>]+>){2}([^<]+(?:МБ|Гб|Кб|Байт))/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
    sumParam(html, result, 'traffic_msg_left', />интернет[^<]*(?:viber|whatsapp)(?:[^>]+>){2}([^<]+ед)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    // Баланс
    getParam(html, result, 'balance', /<tr>\s*<td[^>]*>\s*(?:Общий|Основной) (?:сч(?:е|ё)т\s*(?=<)|баланс:)([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance', /<tr>\s*<td[^>]*>\s*Счёт к оплате за текущий период([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
    
    getParam(html, result, 'limit', /<td[^>]*>\s*Корпоративный лимит(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'limit_used', /Использованный корпоративный лимит(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance);
    
    // Баланс для постоплаты
    if (!isset(result.balance) || result.balance === 0)
        getParam(html, result, 'balance', /Задолженность на линии(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance_bonus', /<tr>\s*<td[^>]*>\s*Бонусный (?:сч(?:е|ё)т\s*(?=<)|баланс:)([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
    // Оплаченные обязательства
    getParam(html, result, 'balance_corent', /Оплаченные обязательства(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    
    // Life points
    getParam(html, result, 'life_points', /Бонусный счет для участников клуба my life(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    
    html = AnyBalance.requestGet(baseurl + 'ru/upravleniye-kontraktom/smena-tarifnogo-plana/', g_headers);
    getParam(html, result, '__tariff', /href="[^"]*">([^<]+)(?:[^>]*>){11}Активен/i, replaceTagsAndSpaces);
    
    if (isAvailable(['packs', 'packs_deadline'])) {
        html = AnyBalance.requestGet(baseurl + 'ru/upravleniye-kontraktom/upravleniye-uslugami/', g_headers);
        
        var packs = sumParam(html, null, null, /<tr>\s*<td[^>]*>\s*<p>[^<]+<\/p>(?:[^>]*>){5}\s*Активная(?:[^>]*>){2}\s*до[^<]+/ig, null);
        
        AnyBalance.trace('Найдено активных пакетов: ' + packs.length);
        
        sumParam(packs, result, 'packs', /<tr>\s*<td[^>]*>\s*<p>([^<]+)<\/p>/ig, replaceTagsAndSpaces, null, aggregate_join);
        sumParam(packs, result, 'packs_deadline', /Активная(?:[^>]*>){2}\s*до([^<]+)/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
    }
    
    AnyBalance.setResult(result);
}
