/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Origin': 'https://www.autodoc.ru',
	'Referer': 'https://www.autodoc.ru/',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
};

var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function saveTokens(json){
	AnyBalance.setData('accessToken', json.access_token);
	AnyBalance.setData('refreshToken', json.refresh_token);
    AnyBalance.setData('expiresIn', json.expires_in);
	AnyBalance.saveData();
}

function callApi(action, params, method){
	var prefs = AnyBalance.getPreferences();
	
	var method = 'GET', headers = g_headers;
	if(params){
		var baseurl = 'https://auth.autodoc.ru/';
		method = 'POST';
		headers = addHeaders({'Content-Type': 'application/x-www-form-urlencoded'});
	}else{
		var baseurl = 'https://webapi.autodoc.ru/api/';
	}
	
	AnyBalance.restoreCookies();
	
	var accessToken = AnyBalance.getData('accessToken');
	
	if(accessToken){
		headers = addHeaders({'Authorization': 'Bearer ' + accessToken});
    }
	
	AnyBalance.trace ('Запрос: ' + baseurl + action);
	var html = AnyBalance.requestPost(baseurl + action, params, headers, {HTTP_METHOD: method});
	var json = getJson(html);
	AnyBalance.trace ('Ответ: ' + JSON.stringify(json));
	if(json.error){
		var error = json.error_description;
	    if(error)
	    	throw new AnyBalance.Error(error, null, /логин|парол|авториз|parameter/i.test(error));
	    	
	    AnyBalance.trace(html);
	    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	return json;
}

function loginPure(action, params, method){
	var prefs = AnyBalance.getPreferences();
	
	clearAllCookies();
	
    var json = callApi('token', {'username': prefs.login, 'password': prefs.password, 'grant_type': 'password'}, 'POST');

    if(!json.access_token){
    	AnyBalance.trace(JSON.stringify(json));
    	throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
    }
	
    AnyBalance.setData('login', prefs.login);
	AnyBalance.saveData();
	saveTokens(json);
}

function loginAccessToken(){
	var accessToken = AnyBalance.getData('accessToken');
	try{
	    AnyBalance.trace('Токен сохранен. Пробуем войти...');
		var json = callApi('client/profile');
		AnyBalance.trace('Успешно вошли по accessToken');
		return true;
	}catch(e){
		AnyBalance.trace('Не удалось войти по accessToken: ' + e.message);
		return false;
	}
}

function loginRefreshToken(){
	var refreshToken = AnyBalance.getData('refreshToken');
	var deviceId = AnyBalance.getData('deviceId');
	try{
		AnyBalance.trace('Токен устарел. Пробуем обновить...');
		var json = callApi('token', {'refresh_token': refreshToken, 'grant_type': 'refresh_token'}, 'POST');
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
	
	return loginRefreshToken();
}

function login(){
	if(!loginToken()){
		loginPure();
	}
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var json;
	
	login();

    var result = {success: true};
	
	var json = callApi('balance/items?isDefault=true&loadOperations=true');

	getParam(json.balance && json.balance.balanceSum, result, 'balance', null, null, parseBalance);
	getParam(json.balance && json.balance.accountSum, result, 'balance_acc', null, null, parseBalance);
	getParam(json.balance && json.balance.bonus, result, 'bonuses', null, null, parseBalance);
	getParam(json.discounts && json.discounts.currentDiscount && json.discounts.currentDiscount.name, result, 'discount');
		
	if(json.discounts && json.discounts.accumulatedTurnovers && json.discounts.accumulatedTurnovers.length > 0){
		for(var i = 0; i<json.discounts.accumulatedTurnovers.length; i++){
			var disc = json.discounts.accumulatedTurnovers[i];
			getParam(disc.nextDiscountName, result, 'next_discount');
			getParam(disc.nextLevelAmount, result, 'to_next_discount', null, null, parseBalance);
			getParam(disc.oborotAccumulated, result, 'oborot_accum', null, null, parseBalance);
			getParam(disc.oborotSum, result, 'oborot_sum', null, null, parseBalance);
			
			break;
		}
    }else{
		AnyBalance.trace('Не удалось получить данные по обороту');
	}
		
	if(json.operations && json.operations.length > 0){
		for(var i = 0; i<json.operations.length; i++){
			var oper = json.operations[i];
			getParam(oper.amount, result, 'last_oper_sum', null, null, parseBalance);
			getParam(oper.bonus, result, 'last_oper_bonus', null, null, parseBalance);
			getParam(oper.date, result, 'last_oper_date', null, null, parseDateISO);
			getParam(oper.name, result, 'last_oper_desc');
			
			break;
		}
    }else{
		AnyBalance.trace('Не удалось получить данные по последней операции');
	}
		
	if(isAvailable('orders_details')) {
		json = callApi('orders/items?isParent=0&isDefault=true');
		
		if(json.items && json.items.length > 0) {
			AnyBalance.trace('Найдено заказов: ' + json.items.length);
			var orderNum = prefs.order_num||json.items[0].number;
			var all = '<b>Заказ №' + orderNum + '</b><br/>';
			var checkOrderNum = false;
			for(var i = 0; i < json.items.length; i++) {
				var item = json.items[i];
				if(item.number == orderNum){
					AnyBalance.trace('Найден заказ №' + item.number + ': ' + item.partName);
					var checkOrderNum = true;
					var direction = getParam(item.supplierDirection, null, null, null, [/<br>|<br\/>/, ' ']);
					var name = item.partName;
					var manufacturerName = item.manufacturerName;
					var partNumber = item.partNumber;
					var price = getParam(item.price, null, null, null, null, parseBalance);
					var quantity = getParam(item.quantity, null, null, null, null, parseBalance);
					var sum = getParam(item.total, null, null, null, null, parseBalance);
					var dts = getParam(item.orderItemStateDate, null, null, null, null, parseDateISO);
					var dt = new Date(dts);
					var date = n2(dt.getDate()) + '.' + n2(dt.getMonth()+1) + '.' + dt.getFullYear() + ' ' + n2(dt.getHours()) + ':' + n2(dt.getMinutes());
					var state = item.orderItemStateName;
					
					all += direction + ':<br/> ' + name + ' (' + manufacturerName + ' ' + partNumber + '), ' + sum + ' ₽' + ' (' + price + ' ₽ x '
					+ quantity + ' шт).<br/> ' + state + ' ' + date + '.<br/>';
				}
			}
			
			if(prefs.order_num && !checkOrderNum){
		        AnyBalance.trace('Не удалось получить данные по номеру заказа, указанному в настройках. Скорее всего, он не существует');
				all = 'Заказ №' + orderNum + ' не найден';
	        }
			
			getParam(all, result, 'orders_details', null, [/<br\/>$/, '']);
		}else{
		    AnyBalance.trace('Не удалось получить данные по заказам');
		}
	}
    
    var json = callApi('client/profile');
	
	if(json.accessLevels && json.accessLevels.length > 0){
		for(var i = 0; i<json.accessLevels.length; i++){
			var level = json.accessLevels[i];
			if(level.selected == true)
				getParam(level.accessLevelName, result, '__tariff');
		}
    }else{
		AnyBalance.trace('Не удалось получить данные по уровням');
	}
	
	if(result.discount){
		result.__tariff = result.__tariff + ' | ' + result.discount;
	}
    
    if(AnyBalance.isAvailable('fio', 'email', 'phone')){
	    getParam(json.name, result, 'fio');
		getParam(json.email, result, 'email');
	    getParam(json.phone.replace(/\(|\)/g, ''), result, 'phone');
	}
    
    AnyBalance.setResult(result);
}
