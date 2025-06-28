/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'Origin': 'https://kari.com',
	'Referer': 'https://kari.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	
	var baseurlApi = 'https://i.api.kari.com/';
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(/@|^\d{10}$/.test(prefs.login), 'Введите e-mail или телефон (10 цифр без пробелов и разделителей)!');
	
	AnyBalance.restoreCookies();
	
	g_headers['Authorization'] = AnyBalance.getData('kariToken' + prefs.login);
	
	var html = AnyBalance.requestGet(baseurlApi + 'ecommerce/client/info', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 500){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте еще раз позже');
	}
	
	if(AnyBalance.getLastStatusCode() >= 401){
        AnyBalance.trace('Сессия новая. Будем логиниться заново...');
	
	    clearAllCookies();
		delete g_headers['Authorization'];
		
		var html = AnyBalance.requestGet(baseurlApi + 'ecommerce/client/info', g_headers);
		
		if(AnyBalance.getCookie('KariToken'))
		    g_headers['Authorization'] = AnyBalance.getCookie('KariToken');
		
		if(!prefs.password && /^\d+$/.test(prefs.login)){
			AnyBalance.trace('Входим по номеру телефона и коду подтверждения...');
			
		    var formattedLogin = prefs.login.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '+7 $1 $2-$3-$4');
			var params = {'phone': prefs.login.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '+7$1$2$3$4')};
		    
			var html = AnyBalance.requestPost(baseurlApi + 'ecommerce/client/v2/phone/verify', JSON.stringify(params), addHeaders({
			    'Content-Type': 'application/json'
		    }));
			
		    AnyBalance.trace('phone/verify: ' + html);
			
			if(html === 'READY_FOR_CAPTCHA'){
				AnyBalance.trace('Сайт затребовал проверку капчи');
				
				var html = AnyBalance.requestGet(baseurlApi + 'ecommerce/client/captcha', g_headers);
				
				var json = getJson(html);
				var imgData = json.captchaStringBase64;
				var img = getParam(imgData, /data:image\/\w+?(?:png)?;base64,([^"]+)/i);
				params.captchaAnswer = AnyBalance.retrieveCode('Пожалуйста, введите ответ на задачу', img, {time: 180000});
				params.captchaId = json.id;
				
				var html = AnyBalance.requestPost(baseurlApi + 'ecommerce/client/v2/phone/verify', JSON.stringify(params), addHeaders({
			        'Content-Type': 'application/json'
		        }));
                
		        AnyBalance.trace('phone/verify: ' + html);
				
				if(AnyBalance.getLastStatusCode() >= 400){
				    var json = getJson(html);
					if(json.error){
				        var error = json.message;
	    	            if(error){
						    if(/Invalid captcha/i.test(error)){
							    throw new AnyBalance.Error('Неверная капча', null, false);
						    }else if(/Invalid request payload input/i.test(error)){
							    throw new AnyBalance.Error('Неверные вводные данные', null, false);
						    }
						    
						    throw new AnyBalance.Error(error, false, /неверн|invalid/i.test());
	    	            }
					}
					
	    	        AnyBalance.trace(html);
			        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
                }
			}
			
			if(html === 'READY_FOR_REGISTER'){
				throw new AnyBalance.Error('Ваш номер не зарегистрирован в Kari или доступ к нему заблокирован. Пожалуйста, перейдите на страницу авторизации https://kari.com/auth/ через браузер и выполните действия по регистрации или восстановлению доступа', null, true);
			}else if(html === 'READY_FOR_LOGIN'){
				AnyBalance.trace('Сайт затребовал код подтверждения из SMS');
				
			    var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения из SMS, отправленного на номер ' + formattedLogin, null, {time: 180000, inputType: 'number'});
			    
			    var html = AnyBalance.requestPost(baseurlApi + 'ecommerce/client/login/bySms', JSON.stringify({
                    "phone": prefs.login.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '+7$1$2$3$4'),
                    "confirmCode": code,
                }), addHeaders({
			        'Content-Type': 'application/json'
		        }));
                
		        AnyBalance.trace('login/bySms: ' + html);
			}else{
				if(AnyBalance.getLastStatusCode() >= 400){
				    var json = getJson(html);
					if(json.error){
				        var error = json.message;
	    	            if (error) throw new AnyBalance.Error(error, null, false);
					}
					
	    	        AnyBalance.trace(html);
			        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
                }
				
				AnyBalance.trace(html);
			    throw new AnyBalance.Error('Неизвестный шаг: ' + html + '. Попробуйте войти с помощью логина и пароля');
			}
				
		}else{
			AnyBalance.trace('Входим по логину и паролю...');
			
			checkEmpty(prefs.password, 'Введите пароль!');
			
			if(!/@/i.test(prefs.login))
		        prefs.login = prefs.login.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '+7$1$2$3$4');
			
		    var html = AnyBalance.requestPost(baseurlApi + 'ecommerce/client/login', JSON.stringify({
                "login": prefs.login,
                "password": prefs.password
            }), addHeaders({
			    'Content-Type': 'application/json'
		    }));
		    
		    AnyBalance.trace('login: ' + html);
		}
	    
		if(html !== 'ok' || AnyBalance.getLastStatusCode() >= 400){
	    	var json = getJson(html);
			if(json.error){
				var error = json.message;
	    	    if (error) throw new AnyBalance.Error(error, false, /логин|парол|код/i.test());
			}
	    	
	    	AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
        }
		
		var kariToken = AnyBalance.getCookie('KariToken');
		var kariRefreshToken = AnyBalance.getCookie('KariRefreshToken');
		
		AnyBalance.setData('kariToken' + prefs.login, kariToken);
		AnyBalance.setData('kariRefreshToken' + prefs.login, kariRefreshToken);
		AnyBalance.saveCookies();
	    AnyBalance.saveData();
		
		g_headers['Authorization'] = AnyBalance.getData('kariToken' + prefs.login);
    }else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
	var result = {success: true};
	
	var html = AnyBalance.requestGet(baseurlApi + 'cloud/eshop/clients/kariclub/balance?withMarkedBonuses=true', g_headers);
	
	var json = getJson(html);
	AnyBalance.trace('Бонусы: ' + JSON.stringify(json));
	
	if(json.data){
		getParam(json.data.activePoints, result, 'balance', null, null, parseBalance);
		getParam(json.data.activePoints, result, 'bonuses_active', null, null, parseBalance);
	    getParam(json.data.cardNumber + '', result, '__tariff', null, [/(\d*)(\d{4})(\d{4})(\d)$/i, '$1 **** $3-$4']);
	    getParam(json.data.cardNumber + '', result, 'number', null, [/(\d*)(\d{4})(\d{4})(\d)$/i, '$1 **** $3-$4']);
	    getParam(json.data.email + '', result, 'email');
	}else{
		AnyBalance.trace('Не удалось получить данные по бонусам');
	}
	
	if(isAvailable(['orders', 'last_order_date', 'last_order_sum', 'last_order_num', 'last_order_desc'])){
		var html = AnyBalance.requestGet(baseurlApi + 'ecommerce/v2/client/orders?page=1&size=10', g_headers);
	    
	    var json = getJson(html);
	    AnyBalance.trace('Заказы: ' + JSON.stringify(json));
	    
	    getParam(json.totalCount, result, 'orders', null, null, parseBalance);
		/* Пока не на чем обработать
		if(json.data && json.data.length > 0){
		    AnyBalance.trace('Найдено заказов: ' + json.data.length);
		    
			for(var i = 0; i<json.data.length; i++){
			    var order = json.data[i];
				
				getParam(order.orderDate, result, 'last_order_date', null, null, parseDateISO);
				getParam(order.orderSum, result, 'last_order_sum', null, null, parseBalance);
				getParam(order.orderNum, result, 'last_order_num');
    			getParam(order.orderDesc, result, 'last_order_desc');
			    
			    break;
		    }
        }else{
		    AnyBalance.trace('Не удалось получить данные по заказам');
	    } */
	}
	
	if(isAvailable(['last_oper_date', 'last_oper_sum', 'last_oper_type'])){
	    var dt = new Date();
	    var dtPrev = new Date(dt.getFullYear(), dt.getMonth()-3, dt.getDate());
	    var dateFrom = dtPrev.getFullYear() + '-' + n2(dtPrev.getMonth()+1) + '-' + n2(dt.getDate()) + 'T00:00:00+03:00';
	    var dateTo = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + n2(dt.getDate()) + 'T23:59:59+03:00';
		
		var html = AnyBalance.requestGet(baseurlApi + 'ecommerce/v2/client/loyalty-card-operations?operationDateFrom=' + encodeURIComponent(dateFrom) + '&operationDateTo=' + encodeURIComponent(dateTo) + '&country=ru', g_headers);
	    
	    var json = getJson(html);
	    AnyBalance.trace('Операции: ' + JSON.stringify(json));
	    
	    if(json.data && json.data.length > 0){
		    AnyBalance.trace('Найдено операций: ' + json.data.length);
		    
			for(var i = 0; i<json.data.length; i++){
			    var oper = json.data[i];
				
				getParam(oper.operationDate, result, 'last_oper_date', null, null, parseDateISO);
				getParam(oper.bonusChangeTotal, result, 'last_oper_sum', null, null, parseBalance);
    			getParam(oper.operationType, result, 'last_oper_type');
			    
			    break;
		    }
        }else{
		    AnyBalance.trace('Не удалось получить данные по операциям');
	    }
	}
	
	if(isAvailable('coupons', 'favorite', 'basket', 'phone', 'fio')){
	    var html = AnyBalance.requestGet(baseurlApi + 'ecommerce/client/info', g_headers);
	    
	    var json = getJson(html);
	    AnyBalance.trace('Профиль: ' + JSON.stringify(json));
	    
	    getParam(json.coupons.length, result, 'coupons', null, null, parseBalance);
		getParam(json.favs.length, result, 'favorite', null, null, parseBalance);
		getParam(json.basket.length, result, 'basket', null, null, parseBalance);
		if(json.kariClubData && !result.__tariff){
	        getParam(json.kariClubData.ean + '', result, '__tariff', null, [/(\d*)(\d{4})(\d{4})(\d)$/i, '$1 **** $3 $4']);
	        getParam(json.kariClubData.ean + '', result, 'number', null, [/(\d*)(\d{4})(\d{4})(\d)$/i, '$1 **** $3 $4']);
	        getParam(json.kariClubData.email + '', result, 'email');
	    }
	    getParam(json.phone + '', result, 'phone', null, [replaceTagsAndSpaces, /\D/g, '', /.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '+7 $1 $2-$3-$4']);
	    getParam(json.name + (json.surname ? (' ' + json.surname) : ''), result, 'fio');
	}
	
	AnyBalance.setResult(result);
}