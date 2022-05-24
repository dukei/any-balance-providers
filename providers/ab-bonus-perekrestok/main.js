/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о бонусах на карте Клуба Перекресток.

Сайт магазина: http://www.perekrestok.ru/
Личный кабинет: https://prcab.x5club.ru/cwa/
*/

var baseurl = "https://api.perekrestok.ru/api/customer/1.4.0.0/" // web https://www.perekrestok.ru/api/customer/1.4.1.0/user/loyalty/card

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'ru,en-US;q=0.9,en;q=0.8,ru-RU;q=0.7',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
	'If-Modified-Since': '0',
	'Content-Type': 'application/json;charset=UTF-8',
};

function callApi(verb, postParams){
    AnyBalance.trace('Запрос: ' + verb);
	
    if (postParams)
		AnyBalance.trace('postParams: ' + JSON.stringify(postParams));
	
    var method = postParams ? 'POST' : 'GET';
    var html = AnyBalance.requestPost(baseurl + verb, JSON.stringify(postParams), g_headers, {HTTP_METHOD: method});
	
	if(AnyBalance.getLastStatusCode() >= 500 || !html)
		throw new AnyBalance.Error('Сайт Перекресток временно недоступен. Попробуйте еще раз позже');

	var json = html ? getJson(html) : {};
	AnyBalance.trace('Ответ: ' + JSON.stringify(json));
	
	if(json.error){
		if(json.error.code == 'INTERNAL_SERVER_ERROR'){
			var error = json.error.message;
		    AnyBalance.trace(html);
		    throw new AnyBalance.Error('Внутренняя ошибка сервера', null, /Internal server error/i.test(error));
	    }else if(json.error.code == 'INVALID_CONFIRMATION_CODE'){
			var error = json.error.message;
		    AnyBalance.trace(html);
		    throw new AnyBalance.Error('Неверный код подтверждения', null, /Invalid confirmation code/i.test(error));
	    }else if(json.error.code == 'LOYALTY_CARD_DOES_NOT_EXIST'){
			var error = json.error.message;
		    AnyBalance.trace(html);
		    throw new AnyBalance.Error('У вас нет ни одной карты лояльности', null, /User loyalty card does not exist/i.test(error));
	    }
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error(json.error.message, null, null);
	}

	if(json.non_field_errors){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка ' + verb + ': ' + json.non_field_errors.join(', '));
	}

	return json.content;
}

function main () {
    var prefs = AnyBalance.getPreferences ();
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите номер телефона!');
    prefs.login = '7' + prefs.login.replace(/[^\d]*/g, '').substr(-10);

    AnyBalance.trace('Входим в кабинет https://my.perekrestok.ru/');
    var data = {};
    data.token = AnyBalance.getData('token' + prefs.login);
    data.refreshToken = AnyBalance.getData('refreshToken' + prefs.login);
    data.uuid = AnyBalance.getData('uuid' + prefs.login);


    AnyBalance.trace('token: ' + data.token);
    AnyBalance.trace('refreshToken: ' + data.refreshToken);
    AnyBalance.trace('uuid: ' + data.uuid);

    if (data.token){
    	AnyBalance.trace('Найден старый токен. Проверяем')
        g_headers['Authorization'] = "Bearer " + data.token;
        try{
        	var json = callApi('user/current');
                AnyBalance.trace('Токен в порядке. Используем.')
        }catch(e){
        	AnyBalance.trace(e.message)
    		AnyBalance.trace('Токен испорчен.')
    		delete g_headers.Authorization;
            data.token = '';
        }
    }
	
    if (!data.token && data.refreshToken){
    	AnyBalance.trace('Пробуем обновить токен');
    	try{
    		var json = callApi('token/refresh', {refreshToken: data.refreshToken, device: {name: 'Chrome 77', os: 'Windows 10', uuid: data.uuid}});
    		data.uuid = json.device.uuid;
    		data.token = json.accessToken;
    		data.refreshToken = json.refreshToken;
    		g_headers['Authorization'] = "Bearer " + json.accessToken;
    		var json = callApi('user/current');
                AnyBalance.trace('Токен успешно обновлен.');
    	}catch(e){
    		AnyBalance.trace(e.message)
    		delete g_headers.Authorization;
            data.token = '';
    		AnyBalance.trace('Не удалось обновить токен.');
    	}
    }
	
    if (!data.token){
    	AnyBalance.trace('Авторизация через смс');
    	var json = callApi('token/anonymous', {device: {name: 'Chrome 77', os: 'Windows 10'}});
    	g_headers['Authorization'] = "Bearer " + json.accessToken;
    	var json = callApi('token/anonymous', {device: {name: 'Chrome 77', os: 'Windows 10'}});
    	g_headers['Authorization'] = "Bearer " + json.accessToken;
    	var json = callApi('user/sign-in', {phone: prefs.login, isAdvertAgreed:true});
    	data.uuid = json.uuid;
    	var code = AnyBalance.retrieveCode('Пожалуйста, введите код из СМС для входа в ЛК Перекресток. Код отправлен на телефон ' + json.phone, null, {inputType: 'number', time: 300000});
    	var json = callApi('user/sign-in/confirm', {code: code, isAdvertAgreed: true, uuid: data.uuid});    
        data.uuid = json.device.uuid;
    	data.token = json.accessToken;
    	data.refreshToken = json.refreshToken;
    	g_headers['Authorization'] = "Bearer " + json.accessToken;
        var json = callApi('user/current');
    }
	
	AnyBalance.setData('token' + prefs.login, data.token);
    AnyBalance.setData('refreshToken' + prefs.login, data.refreshToken);
    AnyBalance.setData('uuid' + prefs.login, data.uuid);
    AnyBalance.saveData();

    var result = {success: true};
	
	if(AnyBalance.isAvailable('phone')){
        getParam(json.phone.replace(/.*(\d)(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+$1 $2 $3-$4-$5'), result, 'phone');
	}
	
//	if(AnyBalance.isAvailable('customer')){
//		var json =callApi('user/profile');
//        getParam(json.basicInformation.firstName + ' ' + json.basicInformation.lastName, result, 'customer');
//	}

    if(AnyBalance.isAvailable('__tariff', 'balance', 'balance_rub', 'stickers', 'burnInThisMonth', 'burnInThisMonth_rub', 'burnDate')){
	    var json = callApi('user/loyalty/card');
        getParam(json.accountId.replace(/.*(\d{4})(\d{4})(\d{4})(\d{4})$/, '$1 $2 $3 $4'), result, '__tariff');
		getParam(json.accountId.replace(/.*(\d{4})(\d{4})(\d{4})(\d{4})$/, '$1 $2 $3 $4'), result, 'cardNumber');
        getParam(json.points, result, 'balance');
        getParam(json.rubles/100, result, 'balance_rub');
        getParam(json.stickers, result, 'stickers');
        if (json.nearestExpiration){
            getParam(json.nearestExpiration.points, result, 'burnInThisMonth');
            getParam(json.nearestExpiration.rubles/100, result, 'burnInThisMonth_rub');
            getParam(json.nearestExpiration.date, result, 'burnDate', null, [/(\d{4})-(\d{2})-(\d{2})/,'$3.$2.$1'], parseDate);
        }
	}
	
	if(isAvailable('last_transaсtion')){
        try{
        	var json = callApi('user/loyalty/card/transactions?page=1&perPage=20&onlyPurchases=true');
        	if (json && json.items && json.items.length>0) {
				var res = json.items[0].transactionDateLocal.replace(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/, '$3.$2.$1 $4:$5');
    		    res += '<br>Баллы: ' + json.items[0].points + ' Б.<br>Наклейки: ' + json.items[0].stickers + ' шт.'; 
    		    res += '<br>' + json.items[0].shortTitle;
    			getParam(res, result, 'last_transaсtion');
    		}
        }catch(e){
        	AnyBalance.trace(e.message);
        }
    }

    AnyBalance.setResult (result);
}