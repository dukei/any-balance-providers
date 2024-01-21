/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

var g_status = {
	0: 'Неактивный',
	1: 'Активный',
	2: 'Заблокирован',
	undefined: 'Не определен'
};

var baseurl = 'https://my.phoenix-dnr.ru/';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d{3})(\d{3})(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона - 10 цифр без пробелов и разделителей!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	AnyBalance.restoreCookies();
	
	AnyBalance.trace('Пробуем войти в личный кабинет...');
	
	var html = loadProtectedPage((baseurl, g_headers));
	
	if(!html || AnyBalance.getLastStatusCode() >= 400){
	    AnyBalance.trace(html);
	    throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	
	if(!/logout/i.test(html)){
	    AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		
		var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
		
		var xsrfToken = AnyBalance.getCookie('XSRF-TOKEN');

	    var formattedLogin = prefs.login.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '7$1$2$3$4');
		var formattedLoginHint = prefs.login.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '+7 $1 $2-$3-$4');
		
		html = AnyBalance.requestPost(baseurl + 'authorization/verify?login=' + formattedLogin, null, addHeaders({
	        'Referer': baseurl + 'login',
		    'X-Requested-With': 'XMLHttpRequest',
			'X-Xsrf-Token': xsrfToken
	    }));
	    
	    var json = getJson(html);
		AnyBalance.trace(JSON.stringify(json));
		
		if(json.responseStatusCode !== 'OK'){
			var error = json.responseStatusCode;
			if(error){
				if(/ACCOUNT_NOT_EXIST/i.test(html)){
		            throw new AnyBalance.Error('Неверный логин', null, true);
				}else{
				    throw new AnyBalance.Error(error, null, true);
				}
			}
			
			AnyBalance.trace(html);
		    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
		}
		
		if(json.authorizationType == 'PASSWORD' || json.authorizationType == 'TWO_FACTOR'){
			AnyBalance.trace('Сайт затребовал ' + (json.authorizationType == 'TWO_FACTOR' ? 'двухфакторную авторизацию' : 'пароль'));
		    
		    html = AnyBalance.requestPost(baseurl + 'authorization/login', {
				'(empty)': '',
                'password': prefs.password,
                'requestedAuthType': 'PASSWORD'
			}, addHeaders({
				'Accept': '*/*',
		        'Content-Type': 'application/x-www-form-urlencoded',
	            'Referer': baseurl + 'login',
		        'X-Requested-With': 'XMLHttpRequest',
			    'X-Xsrf-Token': xsrfToken
	        }));
	        
	        var json = getJson(html);
			AnyBalance.trace(JSON.stringify(json));
		
		    if((json.responseStatusCode && json.responseStatusCode !== 'OK') || (json.code && json.code !== 'SUCCESS')){
			    var error = json.responseStatusCode || json.code;
			    if(error){
				    if(/ERROR/i.test(error)){
		                throw new AnyBalance.Error('Неверный пароль', null, true);
				    }else{
				        throw new AnyBalance.Error(error, null, true);
				    }
			    }
			    
			    AnyBalance.trace(html);
		        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
		    }
		}
		
		if(json.authorizationType == 'SMS'){
			AnyBalance.trace('Сайт затребовал код подтверждения из SMS');
	
	        html = AnyBalance.requestPost(baseurl + 'authorization/send_sms?login=' + formattedLogin, null, addHeaders({
	            'Referer': baseurl + 'login',
		        'X-Requested-With': 'XMLHttpRequest',
			    'X-Xsrf-Token': xsrfToken
	        }));
			
			var json = getJson(html);
			AnyBalance.trace(JSON.stringify(json));
			
			if(json.code !== 'SUCCESS')
				throw new AnyBalance.Error('Не удалось отправить SMS с кодом подтверждения. Попробуйте еще раз позже');
			
			var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер ' + formattedLoginHint, null, {inputType: 'number', time: 180000});
		    
		    html = AnyBalance.requestPost(baseurl + 'authorization/login', {
				'(empty)': '',
                'password': code,
                'requestedAuthType': 'SMS'
			}, addHeaders({
		        'Content-Type': 'application/x-www-form-urlencoded',
	            'Referer': baseurl + 'login',
		        'X-Requested-With': 'XMLHttpRequest',
			    'X-Xsrf-Token': xsrfToken
	        }));
	        
	        var json = getJson(html);
			AnyBalance.trace(JSON.stringify(json));
		
		    if((json.responseStatusCode && json.responseStatusCode !== 'OK') || (json.code && json.code !== 'SUCCESS')){
			    var error = json.responseStatusCode || json.code;
			    if(error){
				    if(/ERROR/i.test(error)){
		                throw new AnyBalance.Error('Неверный код', null, true);
				    }else{
				        throw new AnyBalance.Error(error, null, true);
				    }
			    }
			    
			    AnyBalance.trace(html);
		        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
		    }
		}
		
        html = AnyBalance.requestGet(baseurl, g_headers);
	    
	    if(!/logout/i.test(html)){
		    var error = getParam(html, /<div[^>]+has-error[\s\S]*?<p[^>]+help-block-error[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
		    if(error)
			    throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
		    
		    AnyBalance.trace(html);
		    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }
		
		AnyBalance.setData('xsrfToken' + prefs.login, xsrfToken);
		AnyBalance.saveCookies();
    	AnyBalance.saveData();
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
		AnyBalance.saveCookies();
    	AnyBalance.saveData();
	}
	
	var result = {success: true};
	
	var xsrfToken = AnyBalance.getData('xsrfToken' + prefs.login);
	
	var html = AnyBalance.requestGet(baseurl + 'getInfo', addHeaders({
	    'Referer': baseurl,
		'X-Requested-With': 'XMLHttpRequest',
		'X-Xsrf-Token': xsrfToken
	}));
	        
	var json = getJson(html);
	AnyBalance.trace('Аккаунт: ' + JSON.stringify(json));
	
	getParam(json.balance, result, 'balance', null, null, parseBalance);
	getParam(json.tariffName, result, '__tariff');
	getParam(g_status[json.active]||json.active, result, 'status');
	getParam(json.ruPhone, result, 'phone', null, replaceNumber);
	getParam(json.accountName, result, 'fio', null, null, capitalFirstLetters);
	
	if(AnyBalance.isAvailable('abon', 'tariff_desc')){
	    var html = AnyBalance.requestGet(baseurl + 'tariffs/info/getTariffInfo', addHeaders({
	        'Referer': baseurl,
		    'X-Requested-With': 'XMLHttpRequest',
		    'X-Xsrf-Token': xsrfToken
	    }));
	    
	    var json = getJson(html);
	    AnyBalance.trace('Тариф: ' + JSON.stringify(json));
		
		getParam(json.cost ? json.cost : 0, result, 'abon', null, null, parseBalance)
	    getParam(json.name, result, '__tariff');
		getParam(json.description, result, 'tariff_desc');
	}
	
	if(AnyBalance.isAvailable(['traffic_left_roaming', 'traffic_used_roaming', 'traffic_left', 'traffic_used', 'min_left', 'min_used', 'sms_left', 'sms_used'])){
	    var html = AnyBalance.requestGet(baseurl + 'packages/my', addHeaders({
	        'Referer': baseurl,
		    'X-Requested-With': 'XMLHttpRequest',
		    'X-Xsrf-Token': xsrfToken
	    }));
	            
	    var json = getJson(html);
		AnyBalance.trace('Остатки по пакетам: ' + JSON.stringify(json));
	    
	    if(json && json.length > 0){
		    AnyBalance.trace('Найдено остатков по пакетам: ' + json.length);
	        for(var i = 0; i<json.length; i++){
			    var p = json[i];
                AnyBalance.trace('Найден "' + p.name + '": ' + JSON.stringify(p));
                
			    if(/Интернет|Трафик/i.test(p.name)){
			        AnyBalance.trace('Это интернет');
			        var unit = p.units;
				    
				    var unlim = /^9{7,}$/i.test(p.remainingTraffic); //Безлимитные значения только из девяток состоят
				    if(!unlim)
					    unlim = (p.remainingTraffic >= 999000); //Больше 999 ГБ это же явно безлимит
				    if(unlim){
					    AnyBalance.trace('Пропускаем безлимит трафика: "' + p.name + '" ' + p.remainingTraffic + ' ' + unit);
					    continue;
				    }
				    
				    if(/в роуминге|роуминг|за пределами|за границей|СНГ/i.test(p.name) && !unlim){
					    sumParam(p.remainingTraffic + ' ' + unit, result, 'traffic_left_roaming', null, null, parseTraffic, aggregate_sum);
					    sumParam(p.usedTraffic + ' ' + unit, result, 'traffic_used_roaming', null, null, parseTraffic, aggregate_sum);
				    }else{
					    sumParam(p.remainingTraffic + ' ' + unit, result, 'traffic_left', null, null, parseTraffic, aggregate_sum);
					    sumParam(p.usedTraffic + ' ' + unit, result, 'traffic_used', null, null, parseTraffic, aggregate_sum);
				    }
			    }else if(/Минут|Секунд|Звонк|Вызов/i.test(p.name)){
				    AnyBalance.trace('Это минуты');
				    
				    var unlim = /^9{6,}$/i.test(p.remainingMinutes); //Безлимитные значения только из девяток состоят
				    if(unlim){
					    AnyBalance.trace('Пропускаем безлимит минут: "' + p.name + '" ' + p.remainingMinutes + ' ' + p.unit.name);
					    continue;
				    }
			        
	    	        sumParam(p.remainingMinutes, result, 'min_left', null, null, parseMinutes, aggregate_sum);
				    sumParam(p.usedMinutes, result, 'min_used', null, null, parseMinutes, aggregate_sum);
			    }else if(/SMS|Сообщен/i.test(p.name)){
				    AnyBalance.trace('Это SMS');
				    
				    var unlim = /^9{6,}$/i.test(p.remainingSms); //Безлимитные значения только из девяток состоят
				    if(unlim){
					    AnyBalance.trace('Пропускаем безлимит SMS: "' + p.name + '" ' + p.remainingSms + ' ' + p.unit.name);
					    continue;
				    }
				    
                    sumParam(p.remainingSms, result, 'sms_left', null, null, parseBalance, aggregate_sum);
				    sumParam(p.usedSms, result, 'sms_used', null, null, parseBalance, aggregate_sum);
			    }else{
                    AnyBalance.trace('Неизвестный пакет: ' + JSON.stringify(p));
                }
            }
	    }else{
		    AnyBalance.trace('Не удалось получить остатки по пакетам');
	    }
	}
	
	if(AnyBalance.isAvailable('free_sms')){
	    var html = AnyBalance.requestGet(baseurl + 'getCountSms', addHeaders({
	        'Referer': baseurl,
		    'X-Requested-With': 'XMLHttpRequest',
		    'X-Xsrf-Token': xsrfToken
	    }));
	    
	    AnyBalance.trace('Бесплатные SMS: ' + html);
	    
	    getParam(html, result, 'free_sms', null, null, parseBalance);
	}
	
	if(AnyBalance.isAvailable('services_count')){
	    var html = AnyBalance.requestGet(baseurl + 'services/info/getServicesList', addHeaders({
	        'Referer': baseurl,
		    'X-Requested-With': 'XMLHttpRequest',
		    'X-Xsrf-Token': xsrfToken
	    }));
	    
	    var json = getJson(html);
	    AnyBalance.trace('Подключенные услуги: ' + JSON.stringify(json));
	    
	    if(json && json.length > 0){
	        AnyBalance.trace('Найдено подключенных услуг: ' + json.length);
		    getParam(json ? json.length : 0, result, 'services_count')
	    }else{
		    AnyBalance.trace('Не удалось получить информацию по услугам');
	    }
	}
	
	if(AnyBalance.isAvailable('total_spent')){
	    var html = AnyBalance.requestGet(baseurl + 'detail/info/getCallsList', addHeaders({
	        'Referer': baseurl,
		    'X-Requested-With': 'XMLHttpRequest',
		    'X-Xsrf-Token': xsrfToken
	    }));
	    
	    var json = getJson(html);
	    AnyBalance.trace('Расходы за месяц: ' + JSON.stringify(json));
		
		for(var i = 0; i<json.length; i++){
			var s = json[i];
		    sumParam(s.balance, result, 'total_spent', null, null, parseBalance, aggregate_sum);
		}
	}
    
	AnyBalance.setResult(result);
}

function loadProtectedPage(headers){
	var prefs = AnyBalance.getPreferences();
	const url = 'https://my.phoenix-dnr.ru/';

    var html = AnyBalance.requestGet(url, headers);
    if(/Anti-DDoS/.test(html)) {
        AnyBalance.trace("Обнаружена защита от роботов. Пробуем обойти...");
        clearAllCookies();

        const bro = new BrowserAPI({
            provider: 'phoenix-dnr',
            userAgent: g_headers["User-Agent"],
            headful: true,
            rules: [{
                resType: /^(image|stylesheet|font)$/.toString(),
                action: 'abort',
            }, {
                url: /my\.phoenix-dnr\.ru/.toString(),
                action: 'request',
            }, {
                resType: /^(image|stylesheet|font|script)$/i.toString(),
                action: 'abort',
            }, {
                url: /\.(png|jpg|ico|svg)/.toString(),
                action: 'abort',
            }, {
                url: /.*/.toString(),
                action: 'request',
            }],
            additionalRequestHeaders: [{
                headers: {
			        'User-Agent': g_headers["User-Agent"]
		        }
		    }],
            debug: AnyBalance.getPreferences().debug
        });

        const r = bro.open(url);
        try {
            bro.waitForLoad(r.page);
            html = bro.content(r.page).content;
            const cookies = bro.cookies(r.page, url);
            BrowserAPI.useCookies(cookies);
        } finally {
            bro.close(r.page);
        }

        if(/Anti-DDoS|Access to [^<]* is forbidden|Доступ к сайту [^<]* запрещен/.test(html))
            throw new AnyBalance.Error('Не удалось обойти защиту. Сайт изменен?');

        AnyBalance.trace("Защита от роботов успешно пройдена");
        AnyBalance.saveCookies();
    	AnyBalance.saveData();

    }

    return html;
}

