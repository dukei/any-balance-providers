/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Origin': 'https://ostin.com',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
};

var baseurl = 'https://ostin.com/';

function main(){
    var prefs = AnyBalance.getPreferences();
	
    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	
    prefs.login = prefs.login.replace(/[^\d]*/g, '').substr(-10);
    if (!/^\d{10}$/.test(prefs.login))
		throw new AnyBalance.Error('Неверный номер телефона!');
	
	AnyBalance.trace('Пробуем войти в личный кабинет...');
	
	var token = AnyBalance.getData(prefs.login + 'token');
	
	AnyBalance.restoreCookies();
	
	var html = AnyBalance.requestGet(baseurl + 'personal/club/', addHeaders({'Referer': baseurl}), g_headers);
	
	var state = getJsonObject(html, /window.__INITIAL_STATE__=/);
	
	if(state && state.profile && state.profile.clubproId){
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}else{
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
        clearAllCookiesExceptProtection()
		
		html = loadProtectedPage(('https://ostin.com/', g_headers));
	
	    if(AnyBalance.getLastStatusCode() >= 500 || !html) {
	    	throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	    }
		
	    html = AnyBalance.requestPost(baseurl + 'api/v2/front/profile/exists', JSON.stringify({
            "phone": "+7" + prefs.login,
            "recaptchaToken": ""
        }), addHeaders({
	    	'Accept': 'application/json, text/plain, */*',
	    	'Content-Type': 'application/json;charset=UTF-8',
	    	'Referer': baseurl,
	    	'X-TS-AJAX-Request': true
	    }));
	    
	    AnyBalance.trace(html);
		
		if(/Доступ к сайту заблокирован/i.test(html) || AnyBalance.getLastStatusCode() == 403){
			AnyBalance.trace('Доступ к сайту заблокирован. Пробуем перейти на главную страницу и повторить запрос...');
			html = loadProtectedPage(('https://ostin.com/', g_headers));
			
			html = AnyBalance.requestPost(baseurl + 'api/v2/front/profile/exists', JSON.stringify({
                "phone": "+7" + prefs.login,
                "recaptchaToken": ""
            }), addHeaders({
	        	'Accept': 'application/json, text/plain, */*',
	        	'Content-Type': 'application/json;charset=UTF-8',
	        	'Referer': baseurl,
	        	'X-TS-AJAX-Request': true
	        }));
	    
	        AnyBalance.trace(html);
		}
		
		if(/Доступ к сайту заблокирован/i.test(html) || AnyBalance.getLastStatusCode() == 403) {
            throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }
	    
	    var json = getJson(html);
	    
	    if(json.success !== true){
        	throw new AnyBalance.Error('Профиль с указанным номером телефона не существует!');
        }
	
	    html = AnyBalance.requestPost(baseurl + 'api/v2/front/request-code', JSON.stringify({
            "phone": "+7" + prefs.login,
            "channel": "SMS",
            "recaptchaToken": ""
        }), addHeaders({
	    	'Accept': 'application/json, text/plain, */*',
	    	'Content-Type': 'application/json;charset=UTF-8',
	    	'Referer': baseurl,
	    	'X-TS-AJAX-Request': true
	    }));
	
	    AnyBalance.trace(html);
	
	    var json = getJson(html);
		
		if(json.success != true) {
		    var error = (json.errors || []).map(function(e) { return e }).join('\n');
		    if(error)
		    	throw new AnyBalance.Error(error, null, true);	
		    
       	    AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');	
        }
	
	    var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер +7' + prefs.login, null, {inputType: 'number', time: 300000});/////////////////////////////////
	
	    html = AnyBalance.requestPost(baseurl + 'api/v2/front/check-code', JSON.stringify({
            "channel": "SMS",
            "code": code,
            "target": "+7" + prefs.login
        }), addHeaders({
	    	'Accept': 'application/json, text/plain, */*',
	    	'Content-Type': 'application/json;charset=UTF-8',
	    	'Referer': baseurl,
	    	'X-TS-AJAX-Request': true
	    }));
	
	    AnyBalance.trace(html);
	
	    var json = getJson(html);
		
		if(json.success != true || !json.token) {
		    var error = (json.errors || []).map(function(e) { return e }).join('\n');
		    if(error){
				if(/code_invalid/i.test(error)){
					throw new AnyBalance.Error('Неверный код подтверждения!', null, true);
				}else{
		    	    throw new AnyBalance.Error(error, null, /invalid/i.test(error));
				}
			}
		    
       	    AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');	
        }
	
	    var token = json.token;
		
		html = AnyBalance.requestPost(baseurl + 'api/v2/front/login', JSON.stringify({
            "phone": "+7" + prefs.login,
            "recaptchaToken": "",
            "token": token,
            "isCartPage": false
        }), addHeaders({
	    	'Accept': 'application/json, text/plain, */*',
	    	'Content-Type': 'application/json;charset=UTF-8',
	    	'Referer': baseurl,
	    	'X-TS-AJAX-Request': true
	    }));
		
		var json = getJson(html);
	    
	    if(!json.profile){
			var error = (json.errors || []).map(function(e) { return e }).join('\n');
		    if(error){
				if(AnyBalance.getLastStatusCode() >= 500){
    	    	    throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
				}else{
		    	    throw new AnyBalance.Error(error, null, /invalid/i.test(error));
                }
			}
			
        	AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
        }
		
		html = AnyBalance.requestGet(baseurl + 'personal/club/', addHeaders({'Referer': baseurl}), g_headers);
		
		var state = getJsonObject(html, /window.__INITIAL_STATE__=/);
	
	    AnyBalance.setData(prefs.login + 'token', token);
	    AnyBalance.saveCookies();
        AnyBalance.saveData();
	}
	
	var result = {success: true};
    
    var profile = state.profile;
	
	AnyBalance.trace(JSON.stringify(profile));
	
    getParam(profile.bonusesInfo.totalSum, result, 'balance', null, null, parseBalance);
	getParam(profile.bonusesInfo.expireSum, result, 'expire_sum', null, null, parseBalance);
	if(profile.bonusesInfo.expireAt)
	    getParam(profile.bonusesInfo.expireAt, result, 'expire_date', null, null, parseDateISO);
	getParam(profile.level.moneySpent, result, 'total', null, null, parseBalance);
	getParam(profile.level.moneyToLevelUp, result, 'to_next_level', null, null, parseBalance);
	getParam(profile.level.currentLevelName, result, 'current_level');
	getParam(profile.level.curLevelBonusPercent, result, 'bonus_percent', null, null, parseBalance);
	getParam(profile.level.nextLevelName, result, 'next_level');
	getParam(profile.level.cardNumber, result, 'cardnum');
	getParam(profile.level.cardNumber, result, '__tariff');
	getParam(profile.phone.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/, '+7 $1 $2-$3-$4'), result, 'phone');
	getParam(profile.email, result, 'email');
			
	var fio = profile.firstName;
	if(profile.secondName)
		fio += ' ' + profile.secondName;
	if(profile.lastName)
		fio += ' ' + profile.lastName;
	getParam(capitalFirstLetters(fio), result, 'fio');

    AnyBalance.setResult(result);
}

function loadProtectedPage(headers){
	var prefs = AnyBalance.getPreferences();
	const url = 'https://ostin.com/';

    var html = AnyBalance.requestGet(url, headers);
    if(/__qrator/.test(html) || AnyBalance.getLastStatusCode() == 403) {
        AnyBalance.trace("Обнаружена защита от роботов. Пробуем обойти...");
        clearAllCookies();

        const bro = new BrowserAPI({
            userAgent: g_headers["User-Agent"],
            rules: [{
                resType: /^(image|stylesheet|font)$/.toString(),
                action: 'abort',
            }, {
                url: /_qrator/.toString(),
                action: 'request',
            }, {
                resType: /^(image|stylesheet|font|script)$/i.toString(),
                action: 'abort',
            }, {
                url: /\.(png|jpg|ico)/.toString(),
                action: 'abort',
            }, {
                url: /.*/.toString(),
                action: 'request',
            }],
            additionalRequestHeaders: {
                headers: headers
            }
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

        if(/__qrator/.test(html)||AnyBalance.getLastStatusCode()==403)
            throw new AnyBalance.Error('Не удалось обойти защиту. Сайт изменен?');

        AnyBalance.trace("Защита от роботов успешно пройдена");

        AnyBalance.saveCookies();
    	AnyBalance.saveData();

    }

    return html;
}

function clearAllCookiesExceptProtection(){
    clearAllCookies(function(c) { return !/qrator|orange/i.test(c.name) && !/^TS01/i.test(c.name) && !/^TS11/i.test(c.name) });
}
