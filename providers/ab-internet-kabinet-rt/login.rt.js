/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8,ru-RU;q=0.7',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'android.RTkabinet',
	'X-Requested-With': 'com.dartit.RTcabinet'
};

var baseurl = 'https://lk.rt.ru/';

function generateUUID() {
    var s = [], itoh = '0123456789ABCDEF', i;
    for (i = 0; i < 36; i++) {
        s[i] = Math.floor(Math.random() * 0x10);
    }
    s[14] = 4;
    s[19] = (s[19] & 0x3) | 0x8;
    for (i = 0; i < 36; i++) {
        s[i] = itoh[s[i]];
    }
    s[8] = s[13] = s[18] = s[23] = '-';
    return s.join('');
}

function generateState(){
	function s4() {
  		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
  	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function login(prefs){
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    var login = prefs.login, type = 'LOGIN';
    if(/^\d{12}$/i.test(prefs.login.replace(/\s+/ig, ''))){
    	AnyBalance.trace('Входить будем по номеру лицевого счета');
    	login = prefs.login.replace(/\s+/ig, '');
    	type = 'LS';
    }else if(/^\d{9,11}$/i.test(prefs.login.replace(/[\+\s\-()]+/ig, ''))){
    	AnyBalance.trace('Входить будем по номеру телефона');
    	login = prefs.login.replace(/[\+\s\-()]+/ig, '');
    	type = 'PHONE';
    }else if(/@/i.test(prefs.login)){
    	AnyBalance.trace('Входить будем по E-mail');
    	type = 'EMAIL';
    }else{
    	AnyBalance.trace('Входить будем по логину');
    }
	
	var pageUUID = generateUUID();
	var stateLK = generateUUID();
	
	var html = AnyBalance.requestGet('https://b2c.passport.rt.ru/auth/realms/b2c/protocol/openid-connect/auth?response_type=code&scope=openid&client_id=lk_b2c&redirect_uri=https%3A%2F%2Flk.rt.ru%2Fsso-auth%2F%3Fredirect%3Dhttps%253A%252F%252Flk.rt.ru%252F&state=%7B%22uuid%22%3A%22' + stateLK + '%22%7D', addHeaders({
		Referer: 'https://lk.rt.ru/'
	}));
    
	var mergeConfig = getJsonObject(html, /<script[^>]*>\s*mergeConfig\(/);
	AnyBalance.trace('mergeConfig: ' + JSON.stringify(mergeConfig));
	
	var message = getJsonObject(html, /window\.__config__\s*=\s*\{[\s\S]*?message:\s*/);
	AnyBalance.trace('message: ' + JSON.stringify(message));
	
	if(!mergeConfig.url.loginAction) {
		var error = message && message.summary;
		if(error)
			throw new AnyBalance.Error(error, null, /логин|парол/i.test(html));
			
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	var action = mergeConfig.url.loginAction;
	var captchaId = mergeConfig.captchaId;
	var captchaUrl = mergeConfig.captchaUrl;
	
	var params = [
		['address', ''], 
		['standard_auth_btn', '']
	];
	
	if(captchaId && captchaUrl){
        // Если вход не по коду из СМС, то на этой странице капчу проходить не надо, просто отправляем Id капчи в параметрах
		params.push(['captcha_id', captchaId]);
	}
	
	var html = AnyBalance.requestPost(action, params, addHeaders({'Content-Type': 'application/x-www-form-urlencoded', 'Origin': null}));
	
	var mergeConfig = getJsonObject(html, /<script[^>]*>\s*mergeConfig\(/);
	AnyBalance.trace('mergeConfig: ' + JSON.stringify(mergeConfig));
	
	var message = getJsonObject(html, /window\.__config__\s*=\s*\{[\s\S]*?message:\s*/);
	AnyBalance.trace('message: ' + JSON.stringify(message));
	
	if(!mergeConfig) {
		var error = message && message.summary;
		if(error)
			throw new AnyBalance.Error(error, null, /логин|парол/i.test(html));
			
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	var action = mergeConfig.url.loginAction;
	var captchaId = mergeConfig.captchaId;
	var captchaUrl = mergeConfig.captchaUrl;
	
	var params = [
		['tab_type', type], 
		['username', login],
		['password', prefs.password],
		['rememberMe','on'],
	];
	
	if(captchaId && captchaUrl){
		AnyBalance.trace('Ростелеком затребовал капчу');
		
		var capchaImg = AnyBalance.requestGet(captchaUrl + '/' + captchaId, g_headers);
		captcha = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', capchaImg, {/*inputType: 'number'*/});
		
		params.push(['captcha_id', captchaId]);
		params.push(['code', captcha]);
	}
	
	var html = AnyBalance.requestPost(action, params, addHeaders({'Content-Type': 'application/x-www-form-urlencoded', 'Origin': null}));
	
	if(!html || AnyBalance.getLastStatusCode == 400){
		if(/#registration?/i.test(AnyBalance.getLastUrl())){
		    if(/isOnlimeSSO=true/i.test(AnyBalance.getLastUrl())){
		        throw new AnyBalance.Error('Логин, используемый для входа, зарегистрирован для личного кабинета Ростелеком Москва! Пожалуйста, проверьте правильность ввода данных или используйте провайдер Ростелеком Москва (Onlime) для получения информации', null, true);
		    }else{
			    throw new AnyBalance.Error('Личный кабинет с таким логином не существует! Пожалуйста, проверьте правильность ввода данных или зарегистрируйтесь на сайте https://lk.rt.ru/', null, true);
		    }
		}
			
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	
	var mergeConfig = getJsonObject(html, /<script[^>]*>\s*mergeConfig\(/);
	var message = getJsonObject(html, /window\.__config__\s*=\s*\{[\s\S]*?message:\s*/);
	
	if(mergeConfig || message){
		var error = message && message.summary;
		if(error)
			throw new AnyBalance.Error(error, null, /логин|парол/i.test(html));
			
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}

    if(AnyBalance.getLevel() < 4)
        throw new AnyBalance.Error('Этот провайдер требует API v.4+');
    
	html = AnyBalance.requestPost(baseurl + 'client-api/checkSession', JSON.stringify({
		client_uuid: generateUUID(), 
		current_page: "auto-attach",
		page_uuid: pageUUID
	}), addHeaders({'Content-Type': 'application/json', 'Referer': baseurl}));
	
	AnyBalance.trace('checkSession: ' + html);
	
	var json = getJson(html);
	
	if(json.isError){
		var error = json.errorMsg;
		if(error)
			throw new AnyBalance.Error(error, null, /логин|парол/i.test(html));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	g_savedData.set('pageUUID', pageUUID);
	g_savedData.setCookies();
	g_savedData.save();
}
