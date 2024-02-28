/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.6,en;q=0.4',
	'Cache-Control': 'no-cache',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
};

var baseurl = "https://www.uralairlines.ru";
var g_savedData;
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');
	
    if(!g_savedData)
		g_savedData = new SavedData('uralairlines', prefs.login);

	g_savedData.restoreCookies();

    AnyBalance.trace('Пробуем войти в личный кабинет...');
	
	var html = AnyBalance.requestGet(baseurl + '/', g_headers);
	
	if(AnyBalance.getLastStatusCode() >= 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте ещё раз позже');
    }
	
	if(/authorized=\"1\"/i.test(html)){
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}else{
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
    	loginSite(prefs);
    }

    var result = {success: true};
	
	var html = AnyBalance.requestGet(baseurl + '/ajax.php?component=auth_form&template=header&lang=ru&action=getInfo', addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Origin': baseurl,
		'Referer': baseurl + '/'
	}));
    
	var json = getJson(html);
	AnyBalance.trace('Кабинет: ' + JSON.stringify(json));
	
	getParam(json.info.balance, result, 'balance', null, null, parseBalance);
    getParam(json.info.card, result, 'cardnum');
	getParam(json.info.program + ' | ' + json.info.level, result, '__tariff');
	getParam(json.info.level, result, 'curr_level');
	getParam(json.info.next_level, result, 'next_level');
	getParam(json.info.firstname + ' ' + json.info.lastname, result, 'fio');
	
	if(json.info.balance_){
	    getParam(json.info.balance_.LevelEndDate, result, 'level_exp_date', null, null, parseDate);
		getParam(json.info.balance_.QualifiedPoints, result, 'q_points', null, null, parseBalance);
		getParam(json.info.balance_.QualifiedFlights, result, 'q_fligts', null, null, parseBalance);
	}
	
	if(json.info.progress){
		getParam(json.info.progress.levelFlights, result, 'on_level', null, null, parseBalance);
	    getParam((json.info.progress.flightLevelUp - json.info.progress.levelFlights), result, 'to_next_level', null, null, parseBalance);
		getParam(json.info.progress.levelCoins, result, 'coins_on_level', null, null, parseBalance);
	    getParam((json.info.progress.coinsLevelUp - json.info.progress.levelCoins), result, 'coins_to_next_level', null, null, parseBalance);
	}
	
	if(AnyBalance.isAvailable(['last_oper_sum', 'last_oper_date', 'last_oper_type', 'last_oper_desc', 'bonuses_burn', 'bonuses_till'])){
		var dt = new Date();
	    var html = AnyBalance.requestGet(baseurl + '/cabinet/bonus/?ajax=transactions&action=default&_=' + dt.getTime(), addHeaders({
		    'Accept': 'application/json, text/plain, */*',
		    'Referer': baseurl + '/cabinet/bonus/'
	    }));
        
	    var json = getJson(html);
	    AnyBalance.trace('Операции: ' + JSON.stringify(json));
	    
	    if(json.elements && json.elements.length > 0){
	    	AnyBalance.trace('Найдено операций: ' + json.elements.length);
			for(var i=0; i<json.elements.length; ++i){
	            var operation = json.elements[i];
		
	    	    getParam(operation.bonuses, result, 'last_oper_sum', null, null, parseBalance);
	    	    getParam(operation.date_prepared, result, 'last_oper_date', null, null, parseDate);
	    	    getParam(operation.type, result, 'last_oper_type');
				getParam(operation.title, result, 'last_oper_desc');
				
				if(operation.expired && operation.expired.length > 0){
					getParam(operation.expired[0].bonus, result, 'bonuses_burn', null, null, parseBalance);
					getParam(operation.expired[0].date, result, 'bonuses_till', null, null, parseDate);
				}
			    
			    break;
			}
	    }else{
 	    	AnyBalance.trace('Не удалось получить данные по последней операции');
 	    }
	}
	
	if(AnyBalance.isAvailable(['city', 'email', 'phone'])){
	    var dt = new Date();
	    var html = AnyBalance.requestGet(baseurl + '/cabinet/profile/?ajax=profile&action=default&_=' + dt.getTime(), addHeaders({
		    'Accept': 'application/json, text/plain, */*',
		    'Referer': baseurl + '/cabinet/profile/'
	    }));
        
	    var json = getJson(html);
	    AnyBalance.trace('Профиль: ' + JSON.stringify(json));
	    
	    getParam(json.info.address.City, result, 'city');
	    getParam(json.info.email, result, 'email');
	    getParam(json.info.phone, result, 'phone', null, replaceNumber);
	}

    AnyBalance.setResult(result);
}

function loginSite(prefs){
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('windows-1251');
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	html = AnyBalance.requestGet(baseurl + '/', g_headers);
	
    var captchaKey = getParam(html, null, null, /captcha-key="([^"]*)/i);
	
	if(captchaKey){
		AnyBalance.trace('Сайт затребовал проверку reCAPTCHA');
	    var captcha = solveRecaptcha('Пожалуйста, подтвердите, что вы не робот', AnyBalance.getLastUrl(), captchaKey, {USERAGENT: g_headers['User-Agent']});
	}else{
		AnyBalance.trace('Не удалось найти ключ reCAPTCHA. Возможно, проверка не требуется');
	}
	
	var html = AnyBalance.requestPost(baseurl + '/ajax.php?component=auth_form&template=header&lang=ru&action=auth', {
		'username': prefs.login,
        'password': prefs.password,
		'my_computer': '0',
		'g-recaptcha-response': captcha
	}, addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Origin': baseurl,
		'Referer': baseurl + '/',
	}));
    
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
    if (json.status != 'success'){
		var error = json.global_form.text;
   	    if (error) {
			AnyBalance.trace(html);
       		throw new AnyBalance.Error(error);	
       	}

       	AnyBalance.trace(html);
       	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
	
	g_savedData.setCookies();
	g_savedData.save();
}
