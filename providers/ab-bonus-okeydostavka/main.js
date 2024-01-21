/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'User-Agent': 'ru.reksoft.okey/4.21.1 (Android 8.0.0; AUM-L29; HONOR HWAUM-Q; ru)',
    'channel': '2',
    'AppVersion': '4211|4.21.1',
    'Accept': '*/*',
    'Content-Language': 'ru',
    'Connection': 'Keep-Alive',
};

var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function saveTokens(json){
	for(var i=0; i<json.headers.length; ++i){
		var header = json.headers[i];
	    if(header.name == 'WCToken'){
			AnyBalance.setData('WCToken', header.value);
		}else if(header.name == 'WCTrustedToken'){
			AnyBalance.setData('WCTrustedToken', header.value);
		}
	}
	AnyBalance.saveData();
}

function callApi(verb, params, method){
	var prefs = AnyBalance.getPreferences();
	
	var headers = g_headers;
	
	var WCToken = AnyBalance.getData('WCToken');
	var WCTrustedToken = AnyBalance.getData('WCTrustedToken');

    if(WCToken)
    	headers['WCToken'] = WCToken;
	
	if(WCTrustedToken)
    	headers['WCTrustedToken'] = WCTrustedToken;

	if(params){
		headers['Content-Type'] = 'application/json; charset=UTF-8';
	}else{
		headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=utf-8';
	}
	
	AnyBalance.trace ('Запрос: ' + verb);
	var html = AnyBalance.requestPost('https://www.okeydostavka.ru/wcs/resources/mobihub023/store/' + verb, params ? JSON.stringify(params) : null, headers, {HTTP_METHOD: method || 'GET'});
	var json = getJson(html);
	AnyBalance.trace ('Ответ: ' + JSON.stringify(json));
	if(json.errorCode || AnyBalance.getLastStatusCode() !== 200 || JSON.stringify(json) === '{}'){
		var error = json.errorMessage;
		if(error){
			if(error === ''){
			    throw new AnyBalance.Error('Неверный код подтверждения!', null, true);
			}else{
				throw new AnyBalance.Error(error, null, /телефон|не найден/i.test(error));
			}
		}
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
		
	return json;
}

function loginPure(verb, params, method){
	var prefs = AnyBalance.getPreferences(), json;
    
    var json = callApi('0/config/features'); // Надо установить куки сессии
	
	var json = callApi('0/loyalty/profile/guest', null, 'POST');
	
	if(json.headers && json.headers.length > 0){
		AnyBalance.saveCookies();
		AnyBalance.saveData();
		saveTokens(json);
    }else{
		AnyBalance.trace(JSON.stringify(json));
		throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
	}
	
    var json = callApi('558/loyalty/profile/login?confirmChannel=S', {phone: '7' + prefs.login}, 'POST');
    
	var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер ' + json.phone, null, {inputType: 'number', time: 180000});

    var json = callApi('558/loyalty/profile/confirm', {channel: 'S', code: code}, 'POST');
	
	if(json.headers && json.headers.length > 0){
		AnyBalance.setData('login', prefs.login);
		AnyBalance.saveCookies();
		AnyBalance.saveData();
		saveTokens(json);
    }else{
		AnyBalance.trace(JSON.stringify(json));
		throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
	}
}

function loginAccessToken(){
    AnyBalance.trace('Токен сохранен. Пробуем войти...');
	try{
		var json = callApi('558/loyalty/profile/profile?sync=true');
		AnyBalance.trace('Успешно вошли по WCToken');
		return true;
	}catch(e){
		AnyBalance.trace('Не удалось войти по WCToken: ' + e.message);
		AnyBalance.setData('WCToken', '');
	    AnyBalance.setData('WCTrustedToken', '');
		AnyBalance.saveData();
		return false;
	}
}

function loginToken(){
	var prefs = AnyBalance.getPreferences();
	
	if(!AnyBalance.getData('WCToken')){
		AnyBalance.trace('Токен не сохранен. Будем логиниться');
		return false;
	}
	
	if(AnyBalance.getData('WCToken') && (AnyBalance.getData('login') !== prefs.login)){
		AnyBalance.trace('Токен соответствует другому логину');
		return false;
	}

	if(loginAccessToken())
		return true;
}

function login(){
	if(!loginToken()){
		loginPure();
	}
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите номер телефона!');
    checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона - 10 цифр без пробелов и разделителей!');

    var json;
	
	AnyBalance.restoreCookies();
	
	login();

    var result = {success: true};
	
	if(AnyBalance.isAvailable('balance', 'balance_worker')){
		var json = callApi('558/loyalty/bonus/bonus');
		
		if(json.balances && json.balances.length > 0){
		    for(var i=0; i<json.balances.length; ++i){
		        var bal = json.balances[i];
	            if(bal.type == 'CUSTOMER'){
			        getParam(bal.balance, result, 'balance', null, null, parseBalance);
		        }else if(bal.type == 'WORKER'){
			        getParam(bal.balance, result, 'balance_worker', null, null, parseBalance);
		        }else{
		            AnyBalance.trace('Неизвестный тип баланса: ' + bal.type);
	            }
	        }
		}else{
		    AnyBalance.trace('Не удалось найти информацию по балансам');
	    }
	}
	
    if(AnyBalance.isAvailable(['currlevel', 'discount', '__tariff', 'nextlevel', 'groups'])){
		var json = callApi('558/widgets/layout/profile');
		
		if(json.widgets && json.widgets.length > 0){
		    AnyBalance.trace('Найдено виджетов: ' + json.widgets.length);
            
		    for(var i = 0; i<json.widgets.length; i++){
				var widget = json.widgets[i];
				
				if(widget.type == 'loyaltylevels'){
					AnyBalance.trace('Найден виджет уровней: ' + JSON.stringify(widget));
					for(var j = 0; j<widget.data.levels.length; j++){
				        var level = widget.data.levels[j];
					    
					    if(/Ваш уровень/i.test(level.title)){ // Текущий уровень
					    	getParam(level.badge.title, result, 'currlevel', null, [replaceTagsAndSpaces, /(.*)(\s.*)/, '$1']);
							getParam(level.badge.title, result, 'discount', null, [replaceTagsAndSpaces, /\D/g, ''], parseBalance);
							result.__tariff = (result.discount ? (result.currlevel + ' | ' + result.discount + '%') : result.currlevel);
					    }else if(/След(?:\.|ующий) уровень/i.test(level.title)){ // Следующий уровень
					    	getParam(level.lastLevelText, result, 'nextlevel', null, [replaceTagsAndSpaces, /(Ваш уровень\s?—\s?максимальный!)/i, 'Достигнут']);
					    }
					}
				}
				
				if(widget.type == 'loyaltygroups'){
					AnyBalance.trace('Найден виджет групп: ' + JSON.stringify(widget));
					for(var k = 0; k<widget.data.groups.length; k++){
				        var group = widget.data.groups[k];
						
						if(group.isUserGroup)
						    sumParam(group.name, result, 'groups', null, null, null, create_aggregate_join(',\n '));
					}
					
					if(!result.groups)
						result.groups = 'Нет данных';
				}
		    }
	    }else{
 		    AnyBalance.trace('Не удалось найти информацию по виджетам');
 	    }
	}
	
	if(AnyBalance.isAvailable('cardnum', 'cardnum2', 'cardnum3', 'cardtype', 'cardtype2', 'cardtype3', 'cardtill', 'cardtill2', 'cardtill3')){
    	var json = callApi('558/loyalty/cards/cards');
		
		if(json.cards && json.cards.length > 0){
		    AnyBalance.trace('Найдено привязанных карт: ' + json.cards.length);
//		    getParam(cards[0].number.replace(/(.{4})(.{4})(.{4})(.{4})/,'$1 $2 $3 $4'), result, '__tariff');
		    for(var i = 0; i<json.cards.length; i++){
				var card = json.cards[i];
			    var mcard = (i >= 1 ? 'cardnum' + (i + 1) : 'cardnum');
				var mtype = (i >= 1 ? 'cardtype' + (i + 1) : 'cardtype');
	    	    var mdate = (i >= 1 ? 'cardtill' + (i + 1) : 'cardtill');
		   	    getParam(card.barcode.replace(/(.{2})(.{2})(.)/, '$1$2 $3'), result, mcard);
				getParam(card.cardType.replace(/\s|карта/ig, ''), result, mtype);
			    getParam(card.expirationDate, result, mdate, null, null, parseDateISO);
				
				if(mcard >= 3) break;
		    }
	    }else{
 		    AnyBalance.trace('Не удалось найти информацию по картам');
 	    }
    }

    if(AnyBalance.isAvailable('last_oper_date', 'last_oper_sum', 'last_oper_type', 'last_oper_user')){
		var json = callApi('558/loyalty/bonus/bonus?page=1&size=20');
		
        if(json.operations && json.operations.content && json.operations.content.length){
			AnyBalance.trace('Найдено операций: ' + json.operations.content.length);
            
			var g_user_type = {CUSTOMER: 'Покупатель', WORKER: 'Сотрудник', undefined: 'Не определен'};
			var g_oper_type = {INCOME: 'Начисление', OUTCOME: 'Списание', TRANSFER: 'Перевод', undefined: 'Не определен'};
		    for(var i = 0; i<json.operations.content.length; i++){
				var operation = json.operations.content[i];
			    
        	    getParam(operation.date, result, 'last_oper_date', null, null, parseDateISO);
        	    getParam(operation.balance, result, 'last_oper_sum', null, null, parseBalance);
        	    getParam(g_oper_type[operation.operationType]||operation.operationType, result, 'last_oper_type');
				getParam(g_user_type[operation.type]||operation.type, result, 'last_oper_user');
				
				break;
			}
        }else{
			AnyBalance.trace('Не удалось найти информацию по операциям');
		}
	}
    
	if(AnyBalance.isAvailable('last_payment_date', 'last_payment_sum', 'last_payment_disc', 'last_payment_type')){
	    var dt = new Date();
	    var dtPrev = new Date(dt.getFullYear(), dt.getMonth()-1, dt.getDate());
	    var dateFrom = dtPrev.getFullYear() + '-' + n2(dtPrev.getMonth()+1) + '-' + n2(dt.getDate());
	    var dateTo = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + n2(dt.getDate());
		
		var json = callApi('558/loyalty/history/cheque?dateFrom=' + dateFrom + '&dateTo=' + dateTo);
		
		if(json.cheques && json.cheques.length){
			AnyBalance.trace('Найдено покупок: ' + json.cheques.length);
            
		    for(var i = 0; i<json.cheques.length; i++){
				var cheque = json.cheques[i];
			    
        	    getParam(cheque.date, result, 'last_payment_date', null, null, parseDateISO);
        	    getParam(cheque.total, result, 'last_payment_sum', null, null, parseBalance);
				getParam(cheque.discount, result, 'last_payment_disc', null, null, parseBalance);
        	    getParam(cheque.crystallStoreId, result, 'last_payment_type');
				
				break;
			}
        }else{
			AnyBalance.trace('Не удалось найти информацию по покупкам');
		}
	}
	
	if(AnyBalance.isAvailable('favorite')){
		var json = callApi('558/loyalty/favorite/sku');
		json = json.ids;
		
		getParam(json.length, result, 'favorite', null, null, parseBalance);
	}
	
	if(AnyBalance.isAvailable('notifications')){
		var json = callApi('558/user/messages/unread');
		
		getParam(json.totalCount, result, 'notifications', null, null, parseBalance);
	}
	
	if(AnyBalance.isAvailable(['fio', 'email', 'phone'])){
		var json = callApi('558/loyalty/profile/profile?sync=true');
		json = json.profile;
		
        var person = {};
		sumParam(json.firstName, person, '__n', null, null, null, create_aggregate_join(' '));
//		sumParam(json.middleName, person, '__n', null, null, null, create_aggregate_join(' '));
	    sumParam(json.lastName, person, '__n', null, null, null, create_aggregate_join(' '));
	    getParam(person.__n, result, 'fio');
		
	    getParam(json.email, result, 'email');
		getParam(json.phone, result, 'phone', null, replaceNumber);
	}
    
    AnyBalance.setResult(result);
}
