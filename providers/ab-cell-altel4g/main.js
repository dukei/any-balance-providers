
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Connection': 'keep-alive',
    'Clienttype': 'WEB',
	'Content-Type': 'application/json',
    'Operatortype': 'ALTEL',
	'Origin': 'https://altel.kz',
};

var baseurl = "https://altel.kz/";
var baseurlBeta = "https://beta.tele2.kz/";
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function generateUUID(){
	function s4() {
  		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
  	return s4() + s4() + s4() + s4() + s4() + s4() + s4() + s4();
}

function saveTokens(json){
	AnyBalance.setData('accessToken', json.access_token);
	AnyBalance.setData('refreshToken', json.refresh_token);
    AnyBalance.setData('expiresIn', json.expires_in);
	AnyBalance.setData('tokenType', json.token_type);
	AnyBalance.setData('subscriberType', json.subscriber_type);
	AnyBalance.setData('session', json.session);
	AnyBalance.saveData();
}

function callApi(verb, params){
	var accessToken = AnyBalance.getData('accessToken');
	var fingerPrint = AnyBalance.getData('fingerPrint');
	
	var method = 'GET', headers = g_headers;
	if(params){
		method = 'POST';
		headers['Content-Type'] = 'application/json';
	}
	
	if(/auth\/oauth\/token/i.test(verb)){
		headers['Authorization'] = 'Basic SU9TOg==';
		headers['Fingerprint'] = fingerPrint;
		headers['Referer'] = baseurl + 'me/sign';
	}else{
		headers['Authorization'] = 'Bearer ' + accessToken;
		headers['Referer'] = baseurl;
	}
	
	if(/apigw\/v1/i.test(verb)){
		AnyBalance.trace('Запрос: ' + baseurl + verb);
	    var html = AnyBalance.requestPost(baseurl + verb, JSON.stringify(params), headers, {HTTP_METHOD: method});
	}else{
		AnyBalance.trace('Запрос: ' + baseurlBeta + verb);
		var html = AnyBalance.requestPost(baseurlBeta + verb, JSON.stringify(params), headers, {HTTP_METHOD: method});
	}
	var json = getJson(html);
	AnyBalance.trace('Ответ: ' + JSON.stringify(json));
	if(json.error || json.message){
		var error = json.error_description || json.message;
		if(error)
			throw new AnyBalance.Error(error, null, /номер|парол/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}

	return json;
}

function loginPure(action, params, method){
	var prefs = AnyBalance.getPreferences(), json;
	
    var fingerPrint = AnyBalance.getData('fingerPrint');
	if(!fingerPrint){
		var fingerPrint = generateUUID();
	    AnyBalance.setData('fingerPrint', fingerPrint);
		AnyBalance.saveData();
    }
	
    var json = callApi('apigw/v1/auth/oauth/token', {
        "username": prefs.login,
        "password": prefs.password,
        "grant_type": "msisdn_password"
    }, 'POST');

    if(!json || !json.access_token){
    	AnyBalance.trace(JSON.stringify(json));
    	throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
    }

	var accessToken = json.access_token;
	AnyBalance.trace('Токен авторизации получен');
	
	AnyBalance.setData('login', prefs.login);
	AnyBalance.saveData();
	saveTokens(json);
}

function loginAccessToken(){
	var prefs = AnyBalance.getPreferences();
	var accessToken = AnyBalance.getData('accessToken');
	try{
	    AnyBalance.trace('Токен сохранен. Пробуем войти...');
		var json = callApi('apigw/v1/user/altel-main-page?msisdn=' + prefs.login);
		AnyBalance.trace('Успешно вошли по accessToken');
		return true;
	}catch(e){
		AnyBalance.trace('Не удалось войти по accessToken: ' + e.message);
		saveTokens({});
		return false;
	}
}

function loginRefreshToken(){
	var prefs = AnyBalance.getPreferences();
	var refreshToken = AnyBalance.getData('refreshToken');
	try{
		AnyBalance.trace('Токен устарел. Пробуем обновить...');
		var json = callApi('connect/token', {grant_type: 'refresh_token', username: prefs.login, refresh_token: refreshToken, client_id: 'mobile-app.client'}, 'POST');
		AnyBalance.trace('Успешно вошли по refreshToken');
		saveTokens(json);
		return true;
	}catch(e){
		AnyBalance.trace('Не удалось войти по refreshToken: ' + e.message);
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
	
//	return loginRefreshToken();
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
	checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона (10 цифр без пробелов и разделителей)!');
	checkEmpty(prefs.password, 'Введите пароль!');

    login();

	var result = {success: true};
	
	var json;
	
	json = callApi('graphql', {
        "operationName": "TariffQuery",
        "variables": {
            "tariffNamespace": "altel.profile.mainPage",
            "mainActionNamespace": "altel.profile.mainPage.myTariff.blocks.actions",
            "titleActionNamespace": "altel.profile.mainPage.myTariff.blocks.title",
            "platform": "web"
        },
        "query": "fragment LocalizableComponentFragment on component_localizables {\n  id\n  code\n  type {\n    type\n    __typename\n  }\n  string\n  image {\n    key: slug\n    imageUrl: image\n    alt: name\n    __typename\n  }\n  __typename\n}\n\nfragment LocalizableActionFragment on localizable_namespaces {\n  id\n  namespace\n  props: _localizables_namespaces_list(platforms: {type: \"in:web,all\"}) {\n    code\n    type {\n      type\n      __typename\n    }\n    string\n    image {\n      key: slug\n      imageUrl: image\n      alt: name\n      __typename\n    }\n    link {\n      route {\n        route\n        __typename\n      }\n      params {\n        value\n        param: param_link {\n          key: param\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    boolean\n    __typename\n  }\n  __typename\n}\n\nfragment MainResourceFragment on limits_and_prices {\n  id\n  billingId: billing_id\n  price: balance_price\n  balance_price\n  current_value\n  resource {\n    billingType: type_billing {\n      type\n      __typename\n    }\n    __typename\n  }\n  unit {\n    unit\n    name\n    name_main\n    code\n    __typename\n  }\n  originAmount: origin_amount\n  origin_type\n  originUnitPrice: origin_unit_price\n  exchange_price\n  origin_amount\n  nextWriteOff: origin_expiration_date\n  resource {\n    id\n    short_name\n    typeBilling: type_billing {\n      type\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nquery TariffQuery($tariffNamespace: String = \"altel.profile.mainPage\", $mainActionNamespace: String = \"altel.profile.mainPage.myTariff.blocks.actions\", $titleActionNamespace: String = \"altel.profile.mainPage.myTariff.blocks.title\", $platform: String!) {\n  profile: Profile {\n    id: msisdn\n    balance\n    dailyPackEnabled: daily_pack_enabled\n    tariff {\n      id\n      name\n      price: fee\n      nextWriteOff: next_write_off\n      periodicity {\n        id\n        name\n        __typename\n      }\n      exchangeable\n      actions(namespace: $mainActionNamespace, platform: $platform) {\n        ...LocalizableActionFragment\n        __typename\n      }\n      titleActions: actions(namespace: $titleActionNamespace, platform: $platform) {\n        ...LocalizableActionFragment\n        __typename\n      }\n      displayTemplates: display_template(namespace: $tariffNamespace) {\n        ...LocalizableComponentFragment\n        __typename\n      }\n      mainResources: billing_resources {\n        ...MainResourceFragment\n        displayTemplates: display_template(namespace: $tariffNamespace) {\n          ...LocalizableComponentFragment\n          __typename\n        }\n        __typename\n      }\n      additionalServices: additional_services(serviceType: ADDITIONAL_SERVICE) {\n        images: social_networks {\n          key: id\n          alt: slug\n          imageUrl: image\n          color {\n            value\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      unlimitedServices: additional_services(serviceType: UNLIM_SERVICE) {\n        images: social_networks {\n          key: id\n          alt: slug\n          imageUrl: image\n          color {\n            value\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n"
    });
	
	getParam(json.data.profile.balance, result, 'balance', null, null, parseBalance);
	getParam(json.data.profile.tariff.price, result, 'abon', null, null, parseBalance);
	getParam(json.data.profile.tariff.name, result, '__tariff');
	getParam(json.data.profile.tariff.nextWriteOff, result, 'till', null, null, parseDate);

    
    var products = json.data.profile.tariff.mainResources;
	
	if(products && products.length > 0){
		AnyBalance.trace('Найдено подключенных пакетов: ' + products.length);
		t_units = {TERA_BYTES: 'Tb', GIGA_BYTES: 'Gb', MEGA_BYTES: 'Mb', KILO_BYTES: 'Kb', BYTES: 'bytes'};
	    for(var i = 0; i<products.length; i++){
			var p = products[i];
            AnyBalance.trace('Найден пакет ' + p.resource.short_name + ' (' + p.resource.billingType.type + '): ' + JSON.stringify(p));
            
			if(p.resource.billingType.type == 'DATA'){
			    AnyBalance.trace('Это интернет');
			    var unit = t_units[p.origin_type]||p.unit.name;
				
				var unlim = /^9{7,}$/i.test(p.current_value); //Безлимитные значения только из девяток состоят
				if(!unlim)
					unlim = (p.origin_amount >= 999000); //Больше 999 ГБ это же явно безлимит
				if(unlim){
					AnyBalance.trace('Пропускаем безлимит трафика: ' + p.resource.short_name + ' ' + (p.current_value + ' ' + unit) + '/' + (p.origin_amount + ' ' + unit));
					continue;
				}
				
				if(/в роуминге|роуминг|за пределами|за границей|СНГ/i.test(p.resource.short_name) && !unlim){
					sumParam(p.current_value + ' ' + unit, result, 'traffic_left_roaming', null, null, parseTraffic, aggregate_sum);
					sumParam(p.origin_amount + ' ' + unit, result, 'traffic_total_roaming', null, null, parseTraffic, aggregate_sum);
				}else if(/с 00|ноч/i.test(p.resource.short_name) && !unlim){
					sumParam(p.current_value + ' ' + unit, result, 'night_traffic_left', null, null, parseTraffic, aggregate_sum);
					sumParam(p.origin_amount + ' ' + unit, result, 'night_traffic_total', null, null, parseTraffic, aggregate_sum);
				}else if(/с 08|дневно(?:й|го)/i.test(p.resource.short_name) && !unlim){
					sumParam(p.current_value + ' ' + unit, result, 'day_traffic_left', null, null, parseTraffic, aggregate_sum);
					sumParam(p.origin_amount + ' ' + unit, result, 'day_traffic_total', null, null, parseTraffic, aggregate_sum);
				}else{
					sumParam(p.current_value + ' ' + unit, result, 'traffic_left', null, null, parseTraffic, aggregate_sum);
					sumParam(p.origin_amount + ' ' + unit, result, 'traffic_total', null, null, parseTraffic, aggregate_sum);
				}
			}else if(p.resource.billingType.type == 'VOICE'){
				AnyBalance.trace('Это минуты');
				
				var unlim = /^9{6,}$/i.test(p.current_value); //Безлимитные значения только из девяток состоят
				if(unlim){
					AnyBalance.trace('Пропускаем безлимит минут: ' + p.resource.short_name + ' ' + (p.current_value + ' ' + p.unit.name) + '/' + (p.origin_amount + ' ' + p.unit.name));
					continue;
				}
			
				if(/город|на город|на др\.\s*сети/i.test(p.resource.short_name)){
	    	        sumParam(p.current_value, result, 'min_left_city', null, null, parseMinutes, aggregate_sum);
					sumParam(p.origin_amount, result, 'min_total_city', null, null, parseMinutes, aggregate_sum);
				}else if(/GSM|на GSM/i.test(p.resource.short_name)){
	    	        sumParam(p.current_value, result, 'min_left_gsm', null, null, parseMinutes, aggregate_sum);
					sumParam(p.origin_amount, result, 'min_total_gsm', null, null, parseMinutes, aggregate_sum);
				}else{
	    	        sumParam(p.current_value, result, 'min_left', null, null, parseMinutes, aggregate_sum);
					sumParam(p.origin_amount, result, 'min_total', null, null, parseMinutes, aggregate_sum);
				}
			}else if(p.resource.billingType.type == 'SMS'){
				AnyBalance.trace('Это SMS');
				
				var unlim = /^9{6,}$/i.test(p.current_value); //Безлимитные значения только из девяток состоят
				if(unlim){
					AnyBalance.trace('Пропускаем безлимит SMS: ' + p.resource.short_name + ' ' + (p.current_value + ' ' + p.unit.name) + '/' + (p.origin_amount + ' ' + p.unit.name));
					continue;
				}
				
                sumParam(p.current_value, result, 'sms_left', null, null, parseBalance, aggregate_sum);
				sumParam(p.origin_amount, result, 'sms_total', null, null, parseBalance, aggregate_sum);
			}else if(p.resource.billingType.type == 'MMS'){
				AnyBalance.trace('Это SMS');
				
				var unlim = /^9{6,}$/i.test(p.current_value); //Безлимитные значения только из девяток состоят
				if(unlim){
					AnyBalance.trace('Пропускаем безлимит MMS: ' + p.resource.short_name + ' ' + (p.current_value + ' ' + p.unit.name) + '/' + (p.origin_amount + ' ' + p.unit.name));
					continue;
				}
				
                sumParam(p.current_value, result, 'mms_left', null, null, parseBalance, aggregate_sum);
				sumParam(p.origin_amount, result, 'mms_total', null, null, parseBalance, aggregate_sum);
				 
			}else{
                AnyBalance.trace('Неизвестный пакет: ' + JSON.stringify(p));
            }
        }
	}else{
		AnyBalance.trace('Не удалось получить информацию по пакетам и остаткам');
	}
			
	if(AnyBalance.isAvailable('email', 'phone', 'fio')){
	    json = callApi('graphql', {
            "operationName": "Profile",
            "variables": {},
            "query": "query Profile {\n  profile: Profile {\n    id: msisdn\n    name\n    msisdn\n    originMsisdn: origin_msisdn\n    availableTariffs: available_tariffs {\n      id\n      billingId: billing_id\n      __typename\n    }\n    tariff {\n      id\n      billingId: billing_id\n      __typename\n    }\n    inRoaming: user_in_roaming_now\n    authEmail: disguised_auth_email\n    notificationEmail: disguised_notification_email\n    contactPhone: contact_phone\n    devices: registeredDevices {\n      imei\n      name\n      msisdn\n      __typename\n    }\n    boundProfiles: bound_phone_numbers {\n      isMain: is_main\n      name\n      msisdn\n      __typename\n    }\n    controlNumbers: manager_numbers {\n      bindId\n      caption\n      name\n      msisdn\n      __typename\n    }\n    __typename\n  }\n}\n"
        });
	
	    getParam(json.data.profile.notificationEmail, result, 'email');
	    getParam(json.data.profile.msisdn, result, 'phone', null, replaceNumber);
	    getParam(json.data.profile.name, result, 'fio', null, null, capitalFirstLetters);		
	}
	
	AnyBalance.setResult(result);
}
