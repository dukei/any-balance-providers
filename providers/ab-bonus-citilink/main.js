/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
};

var baseurl = "https://www.citilink.ru";
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main(){
	var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8'); 
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(/@|^\d{11}$/.test(prefs.login), 'Введите e-mail или телефон (11 цифр без пробелов и разделителей)!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	if(AnyBalance.getData('login') === prefs.login)
    	AnyBalance.restoreCookies();
	
	AnyBalance.trace('Пробуем войти в личный кабинет...');
	
	var html = AnyBalance.requestPost(baseurl + '/profile/main', '', addHeaders({
      	'X-Requested-With': 'XMLHttpRequest',
      	'Origin': baseurl,
      	'Referer': baseurl + '/profile/club/'
    }));
	
	if(!html || AnyBalance.getLastStatusCode() > 403){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	
	if(/user-not-auth/i.test(html) || AnyBalance.getLastStatusCode() == 400){
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
        
	    for(var i=0; i<5; ++i){
		    try{
			    AnyBalance.trace('Попытка входа в Ситилинк ' + (i+1) + '/5');
			    html = login();
			    break;
		    }catch(e){
			    if(/парол/i.test(e.message) && i<4)
				    continue;
			    throw e;
		    }
	    }
		
	    AnyBalance.setData('login', prefs.login);
		AnyBalance.saveCookies();
    	AnyBalance.saveData();
    }else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}

    var result = {success: true};
	
    if(isAvailable(['balance', '__tariff', 'status_current', 'bonus_deduction_amount', 'current_appr_sum', 'status_current_till_date', 'status_next', 'fio', 'username', 'email', 'phone', 'wo_date', 'wo_sum', 'activation_date', 'activation_sum', 'activation_type', 'card_activation_date', 'card_num'])) {
        html = AnyBalance.requestPost(baseurl + '/profile/main', '', addHeaders({
      	    'X-Requested-With': 'XMLHttpRequest',
      	    'Origin': baseurl,
      	    'Referer': baseurl + '/profile/club/'
        }));

        var json = getJson(html);
	    AnyBalance.trace('profile/main: ' + JSON.stringify(json));
        
        getParam(json.bonuses.currentBonus, result, 'balance');
	    getParam(json.clubStatus.currentStatus, result, '__tariff', null, null, capitalFirstLetters);
	    getParam(json.clubStatus.currentStatus, result, 'status_current', null, null, capitalFirstLetters);
	    getParam(json.clubStatus.maxBonusPayment, result, 'bonus_deduction_amount');
	    if(json.clubStatus.maxBonusPayment)
	        result.__tariff = result.__tariff + ' | До ' + json.clubStatus.maxBonusPayment + '%';
	    getParam(json.clubStatus.currentAppropriateAmount, result, 'current_appr_sum');
	    getParam((json.clubStatus.statusEndDate)*1000, result, 'status_current_till_date');
	    getParam(json.clubStatus.nextStatus, result, 'status_next', null, null, capitalFirstLetters);
	  
	    var person = {};
	    sumParam(json.userInfoList[0].firstName, person, '__n', null, null, null, create_aggregate_join(' '));
//	    sumParam(json.userInfoList[0].middleName, person, '__n', null, null, null, create_aggregate_join(' '));
	    sumParam(json.userInfoList[0].lastName, person, '__n', null, null, null, create_aggregate_join(' '));
	    getParam(person.__n, result, 'fio', null, null, capitalFirstLetters);
	    
	    var details = json.userInfoList && json.userInfoList[0] && json.userInfoList[0].detailSections;
	    
	    for(var i=0; i<details.length; ++i){
	        var detail = details[i];
	        if(/Никнейм/i.test(detail.name)){
		        getParam(detail.content, result, 'username');
			}else if(/Email/i.test(detail.name)){
				getParam((detail.content ? detail.content.toLowerCase() : ''), result, 'email');
	        }else if(/Телефон/i.test(detail.name)){
		        getParam(detail.content, result, 'phone', null, replaceNumber);
	        }
	    }
        
        if(json.bonuses.willDebitBonus && json.bonuses.willDebitBonus[0]){
      	    getParam((json.bonuses.willDebitBonus[0].processDate)*1000, result, 'wo_date');
      	    getParam(json.bonuses.willDebitBonus[0].bonusesCount, result, 'wo_sum');
        }
        
        if(json.bonuses.clubCardOperations && json.bonuses.clubCardOperations[0]){
      	    getParam((json.bonuses.clubCardOperations[0].addDate)*1000, result, 'activation_date');
      	    getParam(json.bonuses.clubCardOperations[0].bonusesCount, result, 'activation_sum',   null, null, parseBalance);
      	    getParam(json.bonuses.clubCardOperations[0].itemName, result, 'activation_type');
        }
   	}

    if(isAvailable(['card_activation_date', 'card_num'])) {
        html = AnyBalance.requestPost(baseurl + '/profile/club/info/?limit=19&offset=1', '', addHeaders({
      	    'X-Requested-With': 'XMLHttpRequest',
      	    'Origin': baseurl,
      	    'Referer': baseurl + '/profile/club/'
        }));
        var json = getJson(html);
	    AnyBalance.trace('profile/club/info: ' + JSON.stringify(json));
	    
        getParam((json.bonuses.activationDate)*1000, result, 'card_activation_date');
        var cardnum = getParam(json.bonuses.clubCardNumber.replace(/(\d{3})(\d{3})$/, '$1 $2'), result, 'card_num');
	    if(cardnum)
	        result.__tariff = cardnum + ' | ' + result.__tariff;
    }
	
	if(isAvailable(['lastordernum', 'lastordersum', 'lastorderdate', 'lastorderbon', 'lastorderitems', 'lastorderstatus', 'lastorderdesc'])) {
        html = AnyBalance.requestPost(baseurl + '/profile/orders-list/?p=1', '', addHeaders({
      	    'X-Requested-With': 'XMLHttpRequest',
      	    'Origin': baseurl,
      	    'Referer': baseurl + '/profile/club/'
        }));
        var json = getJson(html);
        AnyBalance.trace('profile/orders-list: ' + JSON.stringify(json));
	    
	    if(json.orders && json.orders.length > 0){
	    	AnyBalance.trace('Найдено последних заказов: ' + json.orders.length);
			var order = json.orders[0];
			
			getParam(order.id, result, 'lastordernum');
	    	getParam(order.discountedPrice, result, 'lastordersum', null, null, parseBalance);
	    	getParam((order.date)*1000, result, 'lastorderdate');
	    	getParam(order.accruedBonuses, result, 'lastorderbon', null, null, parseBalance);
			getParam(order.products.length, result, 'lastorderitems', null, null, parseBalance);
	    	getParam(order.statusTitle, result, 'lastorderstatus');
			
			if(AnyBalance.isAvailable('lastorderdesc')){
				var p = order.products;
				
				if(p && p.length > 0){
				    for(var j=0; j<p.length; ++j){
						var count = getParam(p[j].quantity + '', null, null, null, null, parseBalanceSilent);
				        var cost = getParam(p[j].price + '', null, null, null, null, parseBalanceSilent);
				        
				        sumParam(p[j].title + ': ' + count + ' шт x ' + cost + ' ₽', result, 'lastorderdesc', null, null, null, create_aggregate_join(',\n '));
		            }
				}else{
 	    	        AnyBalance.trace('Не удалось получить данные по продуктам последнего заказа');
 	            }
			}
	    }else{
 	    	AnyBalance.trace('Не удалось получить данные по последнему заказу');
 	    }
    }

    AnyBalance.setResult(result);
}

function login(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestGet(baseurl + '/login/', g_headers);
	
	var form = getElement(html, /<form[^>]+action="[^"]*auth\/login[^>]*>/i);
	var action = getParam(form, null, null, /<form[^>]+action="([^"]+)/i);

	if(!action) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа, сайт изменен?');
	}

   	var json = getJsonObject(html, /window\s*\[\s*'globalSettings'\s*\]\s*=\s*/);

	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'pass')
			return prefs.password;
	    else if (name == 'token'){
	    	return json.token + '_' + hex_md5(json.token + json.staticVersion)
	    } else if(name == 'version'){
	    	return json.staticVersion;
	    }

		return value;
	});

	html = AnyBalance.requestGet(baseurl + '/captcha/image/?_=' + (+new Date()), addHeaders({Accept: 'application/json, text/javascript, */*; q=0.01', 'X-Requested-With': 'XMLHttpRequest', Referer: baseurl + '/'}));
		
	var jsonCaptcha = getJson(html);
	
	if(true || jsonCaptcha.needCaptcha){
		AnyBalance.trace('Потребовалась капча');
		var img = jsonCaptcha.image;
		params.captcha = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', img);
		params.captchaKey = jsonCaptcha.token;
	}

	var url = joinUrl(baseurl, action);

	AnyBalance.trace('Posting to url: ' + url);
	html = AnyBalance.requestPost(url, params, addHeaders({Referer: baseurl + '/login/'})); 
	
    if(!/\/login\/exit/i.test(html)){
        var error = getElement(html, /<div[^>]+error-message/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    return html;
}
