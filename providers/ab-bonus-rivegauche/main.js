/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Language': 'ru,ru-RU;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6',
    'Cache-Control': 'max-age=0',
	'Origin': 'https://rivegauche.ru',
	'Referer': 'https://rivegauche.ru/',
	'Time-Zone': 'GMT+3',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
};

var g_baseurl = 'https://rivegauche.ru/';
var g_baseurlApi = 'https://api.rivegauche.ru/rg/v1/newRG/customers/';

function main(){
	AnyBalance.setDefaultCharset('utf-8');
	
	var prefs = AnyBalance.getPreferences();
	
	var accessToken = AnyBalance.getData('accessToken' + prefs.login);
    
	AnyBalance.restoreCookies();
	
	if(accessToken){
	    AnyBalance.trace('Пробуем войти по старому токену: ' + accessToken);
	    g_headers.Authorization = 'Bearer ' + accessToken;

        var html = AnyBalance.requestGet(g_baseurlApi + 'current/statistic', g_headers);
        
		AnyBalance.trace('Вход по старому токену: ' + html);
        
		if(/errors/i.test(html)){
            accessToken = '';
            AnyBalance.trace(html);
            
			if(/token/i.test(html)) {
		        AnyBalance.trace('Токен устарел');
		        
				var refreshToken = AnyBalance.getData('refreshToken' + prefs.login);
		        
				if(refreshToken){
			        AnyBalance.trace('Пробуем обновить токен');
					
			        try{
                        accessToken = refresh_token(prefs, refreshToken);
                    }catch(e){
                        AnyBalance.trace(e.message);
                    }
                }
            }
	    }
	}
	
	if(!accessToken)
		accessToken = loginByPassword(prefs);
	
	if(!accessToken){
		AnyBalance.setData('accessToken' + prefs.login, '');
		AnyBalance.setData('refreshToken' + prefs.login, '');
		clearAllCookies();
		AnyBalance.saveCookies();
		AnyBalance.saveData();
		
		throw new AnyBalnce.Error('Не удалось войти в личный кабинет. Сайт изменен?', false, true);
	}
	
	var result = {success: true};
    
	var html = AnyBalance.requestGet(g_baseurlApi + 'current/discount-cards', g_headers);
	
	AnyBalance.trace('Бонусные карты: ' + html);
	
	json = getJson(html);
	
	if(json.defaultCard){
		json = json.defaultCard;
		
		if(json.loyPointBalances && json.loyPointBalances.length > 0){
		    for(var i=0; i< json.loyPointBalances.length; i++){
		        sumParam(json.loyPointBalances[i].value, result, 'balance', null, null, parseBalance, aggregate_sum);
		    }
		}
		
		if(json.level && json.level.parameters && json.level.parameters.length > 0){
			AnyBalance.trace('Найдено привилегий уровня: ' + json.level.parameters.length);
		    
			for(var i=0; i<json.level.parameters.length; ++i){
				var parameter = json.level.parameters[i];
				
				sumParam(parameter.name + ': ' + parameter.value, result, 'db_level_privileges', null, replaceTagsAndSpaces, null, create_aggregate_join(',\n '));
			}
			
			getParam(json.level.parameters[0].value, result, 'db_discount', null, null, parseBalance);
	    }else{
			AnyBalance.trace('Не удалось получить информацию по привилегиям');
			result.db_level_privileges = 'Нет данных';
		}
		
		getParam(json.type.name + (result.db_discount ? (' | ' + result.db_discount + '%') : ''), result, '__tariff');
		getParam(json.type.name, result, 'db_type');
		getParam(json.status, result, 'db_status');
		getParam(json.level.name, result, 'db_level');
		getParam(json.lastSale, result, 'db_last_sale_date', null, null, parseDate);
		getParam(json.favoriteCategory.name||'Не выбрана', result, 'db_favorite_category');
		getParam(json.fullCardNumber, result, 'fullCardNumber', null, [replaceTagsAndSpaces, /(\d{4})(\d{3})(\d{2})(\d*)/, '$1 $2-$3-$4']);
	}else{
		AnyBalance.trace('Не удалось найти бонусную карту по умолчанию');
    }

	var html = AnyBalance.requestGet(g_baseurlApi + 'current/statistic', g_headers);
	
	AnyBalance.trace('Статистика: ' + html);
	
	json = getJson(html);
	
	getParam(json.processingOrdersCount, result, 'orders', null, null, parseBalance);
	getParam(json.ordersTotalCount, result, 'orders_total', null, null, parseBalance);
	getParam(json.favoritesProductsCount, result, 'favoritesProductsCount', null, null, parseBalance);
	getParam(json.awaitingProductsCount, result, 'awaitingProductsCount', null, null, parseBalance);
	
	if(AnyBalance.isAvailable('coupons')){
	    var html = AnyBalance.requestGet(g_baseurlApi + 'current/personal-coupons', g_headers);
	    
	    AnyBalance.trace('Купоны: ' + html);
	    
	    json = getJson(html);
	    
	    getParam(json.personalCoupons.length, result, 'coupons', null, null, parseBalance);
	}
	
	if(AnyBalance.isAvailable('phone', 'fio')){
	    var html = AnyBalance.requestGet(g_baseurlApi + 'current/profile', g_headers);
	    
	    AnyBalance.trace('Профиль: ' + html);
	    
	    json = getJson(html);
	    
	    if(json.customer){
		    json = json.customer;
            
		    getParam(json.phone, result, 'phone', null, [replaceTagsAndSpaces, /\(|\)/g, ' ']);
		    getParam(json.name, result, 'fio');
	    }else{
		    AnyBalance.trace('Не удалось найти информацию о профиле');
        }
	}
	
    AnyBalance.saveData();
	
	AnyBalance.setResult(result);
}

function loginByPassword(prefs){
	AnyBalance.trace('Нужно логиниться');
	
	checkEmpty(prefs.login, 'Введите номер телефона!');
	checkEmpty(/^\+7\d{10}$|^\+375\d{9}$/.test(prefs.login), 'Введите номер телефона в международном формате без пробелов и разделителей!');
	
	if(/^\+7\d{10}$/.test(prefs.login)){
		var formattedLogin = prefs.login.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '+7 ($1) $2-$3-$4');
		var shortLogin = encodeURIComponent(prefs.login.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '$1$2$3$4'));
		var fullLogin = encodeURIComponent(prefs.login.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '+7$1$2$3$4'));
    }else if(/^\+375\d{9}$/.test(prefs.login)){
		var formattedLogin = prefs.login.replace(/.*(\d{3})(\d\d)(\d{3})(\d\d)(\d\d)$/, '+375 ($2) $3-$4-$5');
		var shortLogin = encodeURIComponent(prefs.login.replace(/.*(\d{3})(\d\d)(\d{3})(\d\d)(\d\d)$/, '$2$3$4$5'));
		var fullLogin = encodeURIComponent(prefs.login.replace(/.*(\d{3})(\d\d)(\d{3})(\d\d)(\d\d)$/, '+375$2$3$4$5'));
	}
	
	var html = AnyBalance.requestGet(g_baseurl + 'login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400) {
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	
	var checkUser = AnyBalance.requestGet(g_baseurlApi + 'current/contacts/check-user?phone=' + fullLogin, g_headers);
	
	if(checkUser && checkUser !== "false"){
		AnyBalance.trace(checkUser);
		throw new AnyBalance.Error('Ваш номер не зарегистрирован в Рив Гош или доступ к нему заблокирован. Пожалуйста, перейдите на страницу авторизации ' + g_baseurl + 'login через браузер и выполните действия по регистрации или восстановлению доступа', null, true);
	}
	
	var html = AnyBalance.requestGet(g_baseurlApi + 'current/contacts/confirmation-options?phone=' + shortLogin + '&configGroupCode=login', g_headers);
	
	var json = getJson(html);
	
	if(json && json.length > 0){
		AnyBalance.trace('Получили конфиг для входа');
	    var config = json[0].config;
	}else{
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить конфиг для входа. Сайт изменен?', null, true);
	}
	
	if(config.captchaEnabled){
		AnyBalance.trace('Сайт затребовал проверку reCaptcha');
	    var solve = solveRecaptcha("Пожалуйста, подтвердите, что вы не робот", g_baseurl + 'login', config.captchaOpenKey, {USERAGENT: g_headers['User-Agent']});
	}else{
		var solve = '';
	}
	
	var html = AnyBalance.requestPost(g_baseurlApi + 'current/contacts/send-code?contact=' + fullLogin + '&configGroupCode=' + config.configGroupCode + '&countryCode=' + prefs.country + '&attempt=0&contactMustBeUnique=' + config.contactMustBeUnique + '&contactUserMustExist=' + config.contactUserMustExist, JSON.stringify({}), addHeaders({
		'Content-Type': 'application/json',
		'Recaptcha-Component-Id': '',
        'Recaptcha-Config-Group': config.configGroupCode,
        'Recaptcha-Contact': fullLogin,
        'Recaptcha-Token': solve
	}));
	
	var json = getJson(html);
	
	if(!json.sentSuccess){
		var error = json.errorMsg;
		if(error)
			throw new AnyBalance.Error(error, null, /not found|не найден/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось отправить код подтверждения. Попробуйте еще раз позже', null, true);
	}
	
	if(json.type == 'PHONE'){
		AnyBalance.trace('Сайт затребовал код подтверждения из SMS');
		var code = AnyBalance.retrieveCode('Пожалуйста, введите код из SMS, отправленного на ваш номер телефона', null, {inputType: 'number', time: 180000});
	}else if(json.type == 'EMAIL'){
		AnyBalance.trace('Сайт затребовал код подтверждения из письма');
		var code = AnyBalance.retrieveCode('Пожалуйста, введите код из письма, отправленного на ваш E-mail', null, {inputType: 'number', time: 180000});
	}else{
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Неизвестный тип подтверждения: ' + json.type, null, true);
	}
	
	var html = AnyBalance.requestPost(g_baseurlApi + 'current/contacts/check-code?contact=' + fullLogin + '&countryCode=' + prefs.country + '&code=' + code + '&attempt=' + json.attempt + '&configGroupCode=' + config.configGroupCode, JSON.stringify({}), addHeaders({
		'Content-Type': 'application/json',
		'Recaptcha-Component-Id': '',
        'Recaptcha-Config-Group': config.configGroupCode,
        'Recaptcha-Contact': fullLogin,
        'Recaptcha-Token': ''
	}));
	
	var json = getJson(html);
	
	if(!json.confirmedSuccess){
		var error = json.errorMsg;
		if(error)
			throw new AnyBalance.Error(error, null, /invalid|неверн/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Неверный код подтверждения. Осталось попыток: ' + json.retries, null, true);
	}
	
	var html = AnyBalance.requestPost(g_baseurlApi + 'oauth2/acquire-token', JSON.stringify({
        "username": prefs.login,
        "configGroupCode": config.configGroupCode
    }), addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Content-Type': 'application/json',
        'Recaptcha-Contact': fullLogin,
        'Recaptcha-Token': solve
	}));
	
	AnyBalance.trace('Получение пары токенов: ' + html);
	
	var json = getJson(html);
	
	if(json.errors){
		throw new AnyBalance.Error(json.errors[0].message, false, /password|block/i.test(JSON.stringify(json)));
	}
	
	if(!json.tokenPair){
		throw new AnyBalance.Error('Не удалось получить пару токенов. Сайт изменен?');
	}
	
	var accessToken = json.tokenPair.accessToken.value;
	var refreshToken = json.tokenPair.refreshToken.value;
	
	AnyBalance.setData('accessToken' + prefs.login, accessToken);
    AnyBalance.setData('refreshToken' + prefs.login, refreshToken);
    AnyBalance.saveCookies();
    AnyBalance.saveData();
    
	g_headers.Authorization = 'Bearer ' + accessToken;
	
    return accessToken;
}

function refresh_token(prefs, refreshToken){
	g_headers.Authorization = '';
	
	var html = AnyBalance.requestPost(g_baseurlApi + 'oauth2/exchange-token', JSON.stringify({refreshToken: refreshToken}), addHeaders({
		'Content-Type': 'application/json'
	}));
    
	AnyBalance.trace('Обновление пары токенов: ' + html);
	
	var json = getJson(html);
	
	if(json.errors){
		throw new AnyBalance.Error(json.errors[0].message, false, /password|block/i.test(JSON.stringify(json)));
	}
	
	if(!json.tokenPair){
		throw new AnyBalance.Error('Не удалось обновить пару токенов. Сайт изменен?');
	}
	
	var accessToken = json.tokenPair.accessToken.value;
	var refreshToken = json.tokenPair.refreshToken.value;
	
	AnyBalance.setData('accessToken' + prefs.login, accessToken);
    AnyBalance.setData('refreshToken' + prefs.login, refreshToken);
    AnyBalance.saveCookies();
    AnyBalance.saveData();
	
    g_headers.Authorization = 'Bearer ' + accessToken;
	
    return accessToken;
}
