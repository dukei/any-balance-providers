/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

 Для отладки в дебагере: параметр __debug
 Значения: pre - предоплата, post - постоплата, b2b - кабинет для юр. лиц.
 */

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Encoding': 'gzip, deflate, br, zstd',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36'
};

var g_html;

var g_savedData;

function myParseCurrency(text) {
    var val = text.replace(/\s+/g, '').replace(/[\-\d\.,]+/g, '');
    
	val = g_currency[val] || val;
    AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
	
    return val;
}

function login(baseurl) {
    var prefs = AnyBalance.getPreferences();

    if(prefs.password){
        return loginWithPassword(baseurl);
    }else{
    	return loginWithoutPassword(baseurl);
    }
}

function isLoggedIn(html){
    return /authorized|authorization_done|logOutLink|Загрузка баланса\.\.\.|b\/logout.xhtml/i.test(html);
}

function getLKType(html, json){
    //После входа обязательно проверяем маркер успешного входа
    //Обычно это ссылка на выход, хотя иногда приходится искать что-то ещё
    if (!isLoggedIn(html)) {
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, [/<div[^>]+class="error-page[\s|"][^>]*>([\s\S]*?)<\/div>/i, /<span[^>]+class="ui-messages-error-summary"[^>]*>([\s\S]*?)<\/span>/i], replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /Неправильные логин и\s*(?:\(или\)\s*)?пароль|Пользователь не найден/i.test(error));

        if (AnyBalance.getLastStatusCode() >= 500) {
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
        }

        var message = getParam(html, null, null, /<h1>\s*(Личный кабинет временно недоступен\s*<\/h1>[\s\S]*?)<\//i, replaceTagsAndSpaces);
        if(message)
            throw new AnyBalance.Error(message);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

    __setLoginSuccessful();
	
	if (json.userType == 'Postpaid') {
        return {type: 'POSTPAID', html: html, json: json};
    } else if (json.userType == 'Prepaid'){
        return {type: 'PREPAID', html: html, json: json};
    } else {
		AnyBalance.trace('Неизвестный тип кабинета: ' + json.userType);
	}
}

function removeBOM(res){
	if (res.charCodeAt(0) === 0xFEFF) {
		res = res.substr(1);
	}
	
	return res;
}

function doLogin(prefs){
	var region = g_savedData.get('region');
	
	var loginUrl;
	
	if(region && region.domain){
		loginUrl = 'https://' + region.domain + '/login';
	}else{
		loginUrl = 'https://www.beeline.ru/login';
	}
    
	AnyBalance.setCookie('.beeline.ru', 'SITE_VERSION', 'is_full_selected', {path: '/', persistent: true});
	AnyBalance.setCookie('.beeline.ru', 'nomobile', 'true', {path: '/', persistent: true});
		
	var html = AnyBalance.requestGet(loginUrl, g_headers);
	
	if(AnyBalance.getLastStatusCode() >= 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	if(!/login_challenge/i.test(AnyBalance.getLastUrl())){
		AnyBalance.trace('Перенаправлены с главной страницы на ' + AnyBalance.getLastUrl() + '. Принудительно переходим на страницу авторизации по умолчанию...');
		html = AnyBalance.requestGet('https://moskva.beeline.ru/login/', g_headers);
	}
	
	if(/login_challenge/i.test(AnyBalance.getLastUrl())){
		AnyBalance.trace('Перенаправлены с главной страницы на ' + AnyBalance.getLastUrl() + '. \nПолучаем челлендж и переходим на страницу авторизации...');
		var loginChallenge = getParam(AnyBalance.getLastUrl(), null, null, /login_challenge=([\s\S]*?)(?:&|$)/i, replaceTagsAndSpaces, decodeURIComponent);
	}else{
		if(/error_description|no active user session/i.test(html) && region){
			return 'restart';
		}
		
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось получить параметры авторизации. Сайт изменен?');
    }
	
	var deviceId = AnyBalance.getData('deviceId');
	if(!deviceId){
        deviceId = hex_md5(prefs.login + new Date().getTime()).replace(/(\w{16})(\w{16})(.*)/, '$2$1');
		AnyBalance.setData('deviceId', deviceId);
	    AnyBalance.saveData();
	}
	
	html = AnyBalance.requestPost('https://idplogin.beeline.ru/web/v1/process', JSON.stringify({
        'challenge': loginChallenge,
        'action': "ACT_INIT",
		'meta': '{"modelInfo":{"manufacturerName":"","modelName":""},"rawMeta":{"fonts":{"value":false,"duration":0},"domBlockers":{"duration":509},"fontPreferences":{"value":false,"duration":0},"audio":{"value":false,"duration":0},"screenFrame":{"value":[0,0,0,0],"duration":2},"osCpu":{"duration":0},"languages":{"value":[["ru-RU"]],"duration":0},"colorDepth":{"value":24,"duration":0},"deviceMemory":{"value":16,"duration":0},"screenResolution":{"value":[1080,1920],"duration":0},"hardwareConcurrency":{"value":8,"duration":0},"timezone":{"value":"Europe/Moscow","duration":15},"sessionStorage":{"value":true,"duration":0},"localStorage":{"value":true,"duration":0},"indexedDB":{"value":true,"duration":1},"openDatabase":{"value":false,"duration":0},"cpuClass":{"duration":0},"platform":{"value":"Win32","duration":0},"plugins":{"value":false,"duration":0},"canvas":{"value":false,"duration":0},"touchSupport":{"value":{"maxTouchPoints":0,"touchEvent":false,"touchStart":false},"duration":0},"vendor":{"value":"Google Inc.","duration":0},"vendorFlavors":{"value":["chrome"],"duration":0},"cookiesEnabled":{"value":true,"duration":1},"colorGamut":{"value":"srgb","duration":0},"invertedColors":{"duration":1},"forcedColors":{"value":false,"duration":0},"monochrome":{"value":0,"duration":0},"contrast":{"value":0,"duration":0},"reducedMotion":{"value":false,"duration":0},"hdr":{"value":false,"duration":0},"math":{"value":false,"duration":0},"videoCard":{"value":{"vendor":"Google Inc. (Intel)","renderer":"ANGLE (Intel, Intel(R) HD Graphics 4000 (0x00000166) Direct3D11 vs_5_0 ps_5_0, D3D11)"},"duration":8},"pdfViewerEnabled":{"value":true,"duration":0},"architecture":{"value":255,"duration":0}}}',
		'xbr_token': ''
    }), addHeaders({
		'Content-Type': 'application/json;charset=UTF-8',
		'Referer': 'https://authentication.beeline.ru/',
		'X-Fingerprint': deviceId
	}));
	
    repairCookies();
	
	var json = getJson(html);
	
	if(json.data && json.data.captcha && json.data.captcha.type){ // Обычная символьная капча
	    var captcha = '';
		
		if(json.data.captcha.type == 'image'){
		    AnyBalance.trace('Сайт затребовал проверку капчи');
		    
		    var img = json.data.captcha.image;
		    captcha = AnyBalance.retrieveCode('Пожалуйста, введите символы с картинки', img, {time: 180000});
	    }else if(json.data.captcha.type == 'yandexSmartCaptcha'){ // Смарт Капча Яндекса  
		    AnyBalance.trace('Сайт затребовал проверку Yandex SmartCaptcha');
		    
		    var siteKey = json.data.captcha.parameters.siteKey;
	        captcha = solveSmartCaptcha('Пожалуйста, подтвердите, что вы не робот', 'https://authentication.beeline.ru', {SITEKEY: siteKey, USERAGENT: g_headers['User-Agent']});
	    }else{
	        AnyBalance.trace('Неизвестный тип капчи: ' + json.data.captcha.type);
	    }
		
	    var html = AnyBalance.requestPost('https://idplogin.beeline.ru/web/v1/process', JSON.stringify({
            'challenge': loginChallenge,
            'action': 'ACT_SUBMIT_CREDENTIALS',
            'data': {
                'methodId': '4', // Вход по логину/паролю
                'login': prefs.login,
                'password': prefs.password,
                'captcha': captcha
            }
        }), addHeaders({
		    'Content-Type': 'application/json;charset=UTF-8',
		    'Referer': 'https://authentication.beeline.ru/'
	    }));
	    
	    repairCookies();
	    
	    var json = getJson(html);	
	    
	    if(json.step && json.step.parameters && json.step.parameters.level && json.step.parameters.level == 'ERROR'){
		    var error = json.step.parameters.text;
		    if(error)
			    throw new AnyBalance.Error(error, false, /логин|парол|код|неверн|кое-что не сошлось/i.test(error));
		    
		    AnyBalance.trace(html);
		    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }
	}else{
	    AnyBalance.trace('Проверка капчи не требуется');
	}
	
	if(json.step && json.step.parameters && json.step.parameters.formId && json.step.parameters.formId == 'SUBMIT_OTP'){
		AnyBalance.trace('Сайт затребовал код подтверждения из SMS');
		
		var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер ' + json.data.maskedAddress, null, {inputType: 'number', time: 180000});
		
	    html = AnyBalance.requestPost('https://idplogin.beeline.ru/web/v1/process', JSON.stringify({
            'challenge': loginChallenge,
            'action': 'ACT_SUBMIT_OTP',
            'data': {
                'code': code
            }
        }), addHeaders({
			'Content-Type': 'application/json;charset=UTF-8',
		    'Referer': 'https://authentication.beeline.ru/'
		}));
		
	    repairCookies();
		
		var json = getJson(html);
	    
	    if(json.step && json.step.parameters && json.step.parameters.level && json.step.parameters.level == 'ERROR'){
		    var error = json.step.parameters.text;
		    if(error)
			    throw new AnyBalance.Error(error, false, /код|неверн|кое-что не сошлось/i.test(error));
		    
		    AnyBalance.trace(html);
		    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }
	}
	
	if(json.step && json.step.parameters && json.step.parameters.redirectTo){
		var redirectUrl = json.step.parameters.redirectTo;
	    
	    html = AnyBalance.requestGet(redirectUrl, addHeaders({'Referer': 'https://authentication.beeline.ru/'}));
	    
	    if(/consent_challenge/i.test(AnyBalance.getLastUrl())){
		    AnyBalance.trace('Перенаправлены на ' + AnyBalance.getLastUrl() + '. \nПолучаем челлендж и переходим на страницу logincallback...');
	        var consentChallenge = getParam(AnyBalance.getLastUrl(), null, null, /consent_challenge=([\s\S]*?)(?:&|$)/i, replaceTagsAndSpaces, decodeURIComponent);
	    }else{
			if(/error_description|no active user session/i.test(html) && region){
			    return 'restart';
		    }
		    
		    AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось получить параметры авторизации. Сайт изменен?');
        }
		
		repairCookies();
	    
	    html = AnyBalance.requestPost('https://idplogin.beeline.ru/web/v1/process', JSON.stringify({
            'challenge': consentChallenge,
            'action': 'ACT_CONSENT'
        }), addHeaders({
			'Content-Type': 'application/json;charset=UTF-8',
		    'Referer': 'https://authentication.beeline.ru/'
		}));
	
	    repairCookies();
	    
	    var json = getJson(html);
	}
	
	if(json.step && json.step.parameters && json.step.parameters.redirectTo)
		var redirectUrl = json.step.parameters.redirectTo;
	
	html = AnyBalance.requestGet(redirectUrl, addHeaders({'Referer': 'https://authentication.beeline.ru/'}));
	
	var referer = 'https://beeline.ru/auth/logincallback/';
	
	do{
		var form = getElement(html, /<form[^>]*(?:logincallback|oferta)[^>]*>/i);
	    
		if (!form) {
			var json = getParam(html, null, null, /<script[^>]*modelJson[^>]*>([\s\S]*?)<\/script>/i, replaceHtmlEntities, getJson);
			if (json && json.errorMessage)
				throw new AnyBalance.Error(json.errorMessage, null, /парол/i.test(json.errorMessage));
	        
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
		}
		
		if (/error_description/i.test(html)) {
			var error = getParam(html, null, null, /name="error_description" value="([^"]*)/i, replaceHtmlEntities);
			if (error)
				throw new AnyBalance.Error(error, null, /парол|not allowed/i.test(error));
	        
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?');
		}
	    
		var params = AB.createFormParams(form);
		delete params.need_set_sso_cookie;
        
		var action = getParam(form, /\baction="([^"]*)/i, replaceHtmlEntities);
		var url = joinUrl(referer, action);
		
		var region = g_savedData.get('region');
		if(!region || region.login !== prefs.login)
			region = null;
		
	    AnyBalance.trace('Требуется отправить форму на ' + url + ', но из-за проблем с 307 отправляем на https://www.beeline.ru/auth/logincallback/');
		url = 'https://www.beeline.ru/auth/logincallback/';
        
		html = AnyBalance.requestPost(url, createUrlEncodedParams(params).replace(/%20/g, '+'), addHeaders({
			'Content-Type': 'application/x-www-form-urlencoded',
			'Referer': 'https://idphydra.beeline.ru/'
		}));
		
		referer = AnyBalance.getLastUrl();
		
		var newRegion = getParam(referer, /https?:\/\/([^\/]+)/i);
		
		if(!region || (region && region.domain !== newRegion)){ // Для входа на номер другого региона надо сменить регион
			region = newRegion;
			g_savedData.set('region', { domain: region, login: prefs.login });
	        g_savedData.save();
			
			if(region && /login/i.test(referer)){
			    AnyBalance.trace('Регион определен: ' + region + '. Перезапускаем...');
			    return 'restart';
		    }
		}
	}while(/<form[^>]*logincallback/i.test(html));
	
	if (/loginfailed/i.test(referer)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	g_savedData.setCookies(); // Сразу после успешного входа надо сохраниться, иначе потеряем куку "B2C_AUTH", а она - главная для долгой сессии
	g_savedData.save();
	
	return html;
}

function repairCookies(){
	// Билайн затирает важные для авторизации куки, придётся получать их из хедеров запроса 
    var headers = AnyBalance.getLastResponseHeaders();
	var repaired = false;
    
	if(headers && headers.length){
	    for(var i=0; i<headers.length; ++i){
		    var header = JSON.stringify(headers[i]);
		    if(/=\;/i.test(header)) // Затирающие хедеры пропускаем
			    continue;
		
		    if(/csrf_token/i.test(header)){
			    var csrfToken = getParam(header, /csrf_token=([^\;]*)/i, replaceHtmlEntities);
				AnyBalance.setCookie('idplogin.beeline.ru', 'csrf_token', csrfToken, {path: '/', persistent: true});
				repaired = true;
		    }else if(/core-sso-flowstate/i.test(header)){
			    var coreSsoFlowstate = getParam(header, /core-sso-flowstate=([^\;]*)/i, replaceHtmlEntities);
		        AnyBalance.setCookie('idplogin.beeline.ru', 'core-sso-flowstate', coreSsoFlowstate, {path: '/', persistent: true});
				repaired = true;
			}
	    }
	}
	
	return repaired;
}

function getAssocNumbers(){
	if(getAssocNumbers.json)
		return getAssocNumbers.json;
	
	var region = g_savedData.get('region');
	
	var html = AnyBalance.requestGet('https://' + region.domain + '/api/uni-profile/accounts/', g_headers);
	
	if(/\/accounts/i.test(AnyBalance.getLastUrl()) && AnyBalance.getLastStatusCode() == 401){
		// Вернулась 401. Пробуем обновить куки сессии принудительно...
		
		html = AnyBalance.requestGet('https://' + region.domain + '/auth/refresh/?returnUrl=%2Fapi%2Funi-profile%2Faccounts%2F', g_headers)
	}
	
	if(/\/login/i.test(AnyBalance.getLastUrl()) || AnyBalance.getLastStatusCode() == 401 || AnyBalance.getLastStatusCode() >= 500){
	    if(html && /\/login/i.test(html)){ // 500 может вернуть и при необходимости повторной авторизации
		    g_html = html;
			throw new AnyBalance.Error();
		}
		
		throw new AnyBalance.Error();
	}
	
	var json = getJson(removeBOM(html));
    
	AnyBalance.trace('Найдено присоединенных номеров: ' + json.length);

	return getAssocNumbers.json = json;
}

function getCtns(login){
	if(!getCtns.json)
		getCtns.json = {};

	if(getCtns.json[login])
		return getCtns.json[login];

	var region = g_savedData.get('region');
	
	var html = AnyBalance.requestPost('https://' + region.domain + '/ssoswitcher/ssoaccountslist/', JSON.stringify({
        'clearJson': 'true'
    }), addHeaders({
		'Content-Type': 'application/json',
	    'Referer': AnyBalance.getLastUrl(),
        'X-Requested-With': 'XMLHttpRequest'
	}));
	
    var json = getJson(removeBOM(html));
	
	AnyBalance.trace('Найдено CTN для текущего логина: ' + json.length);

	return getCtns.json[login] = json;
}

function selectAssocNumber(num){
	var prefs = AnyBalance.getPreferences();
    
	function findCTNForLoginSite(login){
		var ctns = getCtns(login);
		
		if(!ctns || !ctns.length)
			return; //throw new AnyBalance.Error('Не удаётся найти номер телефона для логина!');
		
		for(var i=0; i<ctns.length; ++i){
			var s = ctns[i];
			var ctn = s.login;
			if(num && endsWith(ctn, num)){
				AnyBalance.trace('В качестве CTN берем ' + ctn + ' по заданным последним цифрам');
				prefs.__login = login;
				return prefs.phone = ctn;
			}
			if(!num && s.defaultCtn){
				AnyBalance.trace('В качестве CTN берем ' + ctn + ' по умолчанию');
				prefs.__login = login;
				return prefs.phone = ctn;
			}
		}
	    
	    if(!num){
			AnyBalance.trace('В качестве CTN берем ' + ctns[0].login);
			prefs.__login = login;
			return prefs.phone = ctns[0].login;
		}
	}
    
	var assocs = getAssocNumbers();
	
	for(var i=0; i<assocs.length; ++i){
		var sso = assocs[i];
		if(sso.userType !== 'Mobile'){ // Обрабатываем только мобильные номера, домашний интернет и прочее пропускаем
			continue;
		}
	    
	    var ctn = findCTNForLoginSite(sso.formattedAccountNumber.replace(/[^\d]*/g,'').substr(-10).replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, '$1$2$3$4'));
		if(ctn){
			AnyBalance.trace('Используем логин и присоединенный номер ' + ctn);
			return ctn;
		}
	}
    
	throw new AnyBalance.Error('Не удалось найти присоединенный номер, оканчивающийся на ' + num);
}

function loginWithPassword(baseurl){
    var prefs = AnyBalance.getPreferences();
	
	var region = g_savedData.get('region');
	
	if(region){
	    try{
	        g_savedData.restoreCookies();
			getAssocNumbers();
		    AnyBalance.trace('Сессия сохранена. Входим автоматически...');
			g_savedData.setCookies();
	        g_savedData.save();
	    }catch(e){
		    if(/\/login/i.test(AnyBalance.getLastUrl()) || AnyBalance.getLastStatusCode() == 401 || ((g_html && /\/login/i.test(g_html)) && AnyBalance.getLastStatusCode() == 500)){
		        AnyBalance.trace('Сессия устарела. Пробуем возобновить...');
			    g_savedData.set('ctn', undefined);
	            g_savedData.save();
		        var html = doLogin(prefs);
		        
		        if(html === 'restart'){
				    AnyBalance.trace('Не удалось возобновить сессию. Будем логиниться заново...');
	    	        clearAllCookies();
	    	        html = doLogin(prefs);
	            }
		    }else{
				if(g_html){
					AnyBalance.trace(g_html);
				}else{
				    AnyBalance.trace('Ошибка подключения' + (AnyBalance.getLastStatusCode() ? ': ' + AnyBalance.getLastStatusCode() : e.message));
				}
			    if(AnyBalance.getLastStatusCode() >= 500){
					throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
                }else{
				    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
				}
		    }
	    }
	}else{
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		    clearAllCookies();
		    var html = doLogin(prefs);
		    
		    if(html === 'restart'){
	    	    clearAllCookies();
	    	    html = doLogin(prefs);
	        }
	}
	
	var region = g_savedData.get('region');
	
	var ctn = selectAssocNumber(prefs.phone);
	
    var html = AnyBalance.requestGet('https://' + region.domain + '/api/profile/common/settings/', g_headers);
	
	var json = getJson(removeBOM(html));
	
	if(ctn !== json.selectedLogin){ // Проверяем на необходимость переключения на другой номер
        switchToAccocNumber(prefs, region, ctn);
	    
	    html = AnyBalance.requestGet('https://' + region.domain + '/api/profile/common/settings/', g_headers);
	    
	    json = getJson(removeBOM(html));
	}
		
	region = g_savedData.get('region'); // После переключения номера возможна смена региона, надо обновить region
	
	html = AnyBalance.requestGet('https://' + region.domain + '/customers/products/mobile/profile/', addHeaders({
	   	Referer: AnyBalance.getLastUrl()
	}));

    // Иногда билайн нормальный пароль считает временным и предлагает его изменить, но если сделать еще один запрос, пускает и показывает баланс
    if (/Ваш пароль временный\.\s*Необходимо изменить его на постоянный/i.test(html)) {
        AnyBalance.trace('Билайн считает наш пароль временным, но это может быть и не так. Пробуем войти ещё раз...');
        html = AnyBalance.requestGet('https://' + region.domain + '/customers/products/mobile/profile/', addHeaders({
	    	Referer: AnyBalance.getLastUrl()
	    }));
    }
	
    // Ну и тут еще раз проверяем, получилось-таки войти или нет
    if (/<form[^>]+name="(?:chPassForm)"|Ваш пароль временный\.\s*Необходимо изменить его на постоянный/i.test(html))
        throw new AnyBalance.Error('Вы зашли по временному паролю, требуется сменить пароль. Войдите в кабинет ' + baseurl + ' через браузер и смените пароль на постоянный. Новый пароль введите в настройках провайдера', null, true);
    
	if (/<form[^>]+action="\/(?:changePass|changePassB2C).html"/i.test(html))
        throw new AnyBalance.Error('Билайн требует сменить пароль. Войдите в кабинет ' + baseurl + ' через браузер и смените пароль. Новый пароль введите в настройках провайдера', null, true);
	
	return getLKType(html, json);
}

function switchToAccocNumber(prefs, region, ctn){
	var html = AnyBalance.requestGet('https://' + region.domain + '/auth/setctn/?ctn=' + ctn, g_headers);
	
	if(/login_challenge/i.test(AnyBalance.getLastUrl())){
		AnyBalance.trace('Перенаправлены с главной страницы на ' + AnyBalance.getLastUrl() + '. \nПолучаем челлендж и переходим на страницу авторизации...');
		var loginChallenge = getParam(AnyBalance.getLastUrl(), null, null, /login_challenge=([\s\S]*?)(?:&|$)/i, replaceTagsAndSpaces, decodeURIComponent);
	}else{
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось получить параметры для переключения номера. Сайт изменен?');
    }
	
	var deviceId = AnyBalance.getData('deviceId');
	
	html = AnyBalance.requestPost('https://idplogin.beeline.ru/web/v1/process', JSON.stringify({
        'challenge': loginChallenge,
        'action': "ACT_INIT",
		'meta': '{"modelInfo":{"manufacturerName":"","modelName":""},"rawMeta":{"fonts":{"value":false,"duration":0},"domBlockers":{"duration":509},"fontPreferences":{"value":false,"duration":0},"audio":{"value":false,"duration":0},"screenFrame":{"value":[0,0,0,0],"duration":2},"osCpu":{"duration":0},"languages":{"value":[["ru-RU"]],"duration":0},"colorDepth":{"value":24,"duration":0},"deviceMemory":{"value":16,"duration":0},"screenResolution":{"value":[1080,1920],"duration":0},"hardwareConcurrency":{"value":8,"duration":0},"timezone":{"value":"Europe/Moscow","duration":15},"sessionStorage":{"value":true,"duration":0},"localStorage":{"value":true,"duration":0},"indexedDB":{"value":true,"duration":1},"openDatabase":{"value":false,"duration":0},"cpuClass":{"duration":0},"platform":{"value":"Win32","duration":0},"plugins":{"value":false,"duration":0},"canvas":{"value":false,"duration":0},"touchSupport":{"value":{"maxTouchPoints":0,"touchEvent":false,"touchStart":false},"duration":0},"vendor":{"value":"Google Inc.","duration":0},"vendorFlavors":{"value":["chrome"],"duration":0},"cookiesEnabled":{"value":true,"duration":1},"colorGamut":{"value":"srgb","duration":0},"invertedColors":{"duration":1},"forcedColors":{"value":false,"duration":0},"monochrome":{"value":0,"duration":0},"contrast":{"value":0,"duration":0},"reducedMotion":{"value":false,"duration":0},"hdr":{"value":false,"duration":0},"math":{"value":false,"duration":0},"videoCard":{"value":{"vendor":"Google Inc. (Intel)","renderer":"ANGLE (Intel, Intel(R) HD Graphics 4000 (0x00000166) Direct3D11 vs_5_0 ps_5_0, D3D11)"},"duration":8},"pdfViewerEnabled":{"value":true,"duration":0},"architecture":{"value":255,"duration":0}}}',
		'xbr_token': ''
    }), addHeaders({
		'Content-Type': 'application/json;charset=UTF-8',
		'Referer': 'https://authentication.beeline.ru/',
		'X-Fingerprint': deviceId
	}));
	
    repairCookies();
	
	var json = getJson(html);
	
	if(json.step && json.step.parameters && json.step.parameters.level && json.step.parameters.level == 'ERROR'){
		var error = json.step.parameters.text;
		if(error)
			throw new AnyBalance.Error(error, null, false);
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить параметры для переключения номера. Сайт изменен?');
	}
    
	if(json.step && json.step.parameters && json.step.parameters.redirectTo){
		var redirectUrl = json.step.parameters.redirectTo;
	    
	    html = AnyBalance.requestGet(redirectUrl, addHeaders({'Referer': 'https://authentication.beeline.ru/'}));
	    
	    if(/consent_challenge/i.test(AnyBalance.getLastUrl())){
		    AnyBalance.trace('Перенаправлены на ' + AnyBalance.getLastUrl() + '. \nПолучаем челлендж и переходим на страницу logincallback...');
	        var consentChallenge = getParam(AnyBalance.getLastUrl(), null, null, /consent_challenge=([\s\S]*?)(?:&|$)/i, replaceTagsAndSpaces, decodeURIComponent);
	    }else{
		    AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось получить параметры для переключения номера. Сайт изменен?');
        }
		
		repairCookies();
	    
	    html = AnyBalance.requestPost('https://idplogin.beeline.ru/web/v1/process', JSON.stringify({
            'challenge': consentChallenge,
            'action': 'ACT_CONSENT'
        }), addHeaders({
			'Content-Type': 'application/json;charset=UTF-8',
		    'Referer': 'https://authentication.beeline.ru/'
		}));
	
	    repairCookies();
	    
	    var json = getJson(html);
	}
	
	if(json.step && json.step.parameters && json.step.parameters.redirectTo)
		var redirectUrl = json.step.parameters.redirectTo;
	
	html = AnyBalance.requestGet(redirectUrl, addHeaders({'Referer': 'https://authentication.beeline.ru/'}));
	
	var referer = 'https://beeline.ru/auth/logincallback/';
	
	do{
		var form = getElement(html, /<form[^>]*(?:logincallback|oferta)[^>]*>/i);
	    
		if (!form) {
			var json = getParam(html, null, null, /<script[^>]*modelJson[^>]*>([\s\S]*?)<\/script>/i, replaceHtmlEntities, getJson);
			if (json && json.errorMessage)
				throw new AnyBalance.Error(json.errorMessage, null, /парол/i.test(json.errorMessage));
	        
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
		}
		
		if (/error_description/i.test(html)) {
			var error = getParam(html, null, null, /name="error_description" value="([^"]*)/i, replaceHtmlEntities);
			if (error)
				throw new AnyBalance.Error(error, null, /парол|not allowed/i.test(error));
	        
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
		}
	    
		var params = AB.createFormParams(form);
		delete params.need_set_sso_cookie;
        
		var action = getParam(form, /\baction="([^"]*)/i, replaceHtmlEntities);
		var url = joinUrl(referer, action);
		
	    AnyBalance.trace('Требуется отправить форму на ' + url + ', но из-за проблем с 307 отправляем на https://www.beeline.ru/auth/logincallback/');
		url = 'https://www.beeline.ru/auth/logincallback/';
        
		html = AnyBalance.requestPost(url, createUrlEncodedParams(params).replace(/%20/g, '+'), addHeaders({
			'Content-Type': 'application/x-www-form-urlencoded',
			'Referer': 'https://idphydra.beeline.ru/'
		}));
		
		referer = AnyBalance.getLastUrl();
		
		var newRegion = getParam(referer, /https?:\/\/([^\/]+)/i);
		
		if(region.domain !== newRegion){ // Для переключения на номер другого региона надо сменить регион
			region = newRegion;
			g_savedData.set('region', { domain: region, login: prefs.login });
	        g_savedData.save();
		}
	}while(/<form[^>]*logincallback/i.test(html));
	
	if (/loginfailed/i.test(referer)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	g_savedData.setCookies();
	g_savedData.save();
	
	return html;
}

function proceedWithSite(baseurl, type, html, json, result){
    AnyBalance.trace('Тип кабинета: ' + type);
	
	var lkType = {PREPAID: 'Предоплатный', POSTPAID: 'Постоплатный'};
	getParam(lkType[type]||type, result, 'type');

    switch(type){
        case 'PREPAID':
            fetchPre(baseurl, html, json, result);
            break;
        case 'POSTPAID':
            fetchPost(baseurl, html, json, result);
            break;
        default:
            throw new AnyBalance.Error('Неизвестный тип кабинета: ' + type);
    }
}

function parseBalanceNegative(str) {
    var val = parseBalance(str);
    if (isset(val))
        return -val;
}

function processInfo_basic(baseurl, html, result){
    getParam(html, result.info, 'info.more3', /Вы с нами больше трёх лет!/i, null, function(str) { return !!str });
    getParam(html, result.info, 'info.phone', /<h1[^>]+class="phone-number"[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces);
    getParam(html, result.info, 'info.region', /<div[^>]+region[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
}

function processInfoPost_basic(baseurl, html, result){
    if(AnyBalance.isAvailable('info.fio', 'info.email', 'info.phone')){
        if(!result.info)
            result.info = {};

        getParam(html, result.info, 'info.fio', /<div[^>]+class="ban-param name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if(AnyBalance.isAvailable('info.email')) {
            var xhtml = html;
            if(!/<div[^>]+class="email-fixed-width"[^>]*>/i.test(html))
                xhtml = getBlock(baseurl + 'c/post/index.xhtml', html, 'benAddressLoaderDetails');
            getParam(xhtml, result.info, 'info.email', /<div[^>]+class="email-fixed-width"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        }

        processInfo_basic(baseurl, html, result);
    }
}

function fetchPost(baseurl, html, json, result) {
    var prefs = AnyBalance.getPreferences();
	
	processSitePostpaid(result);
	
	processSiteAddBalances(result);
	
    processSiteExpensesPostpaid(result);
	
	processSiteServices(result);
	
	if(typeof(processSitePayments) == 'function')
		processSitePayments(result);
	
//	processSiteInfo(json, result);
}

function processSitePostpaid(result){
	var prefs = AnyBalance.getPreferences();
	
	var region = g_savedData.get('region');
	
	if (!result.info)
        result.info = {};

	var info = result.info;
	
	var html = AnyBalance.requestGet('https://' + region.domain + '/api/profile/userinfo/data/?noTimeout=false&blocks=BalanceNotification,Status,ProfileSummary,Balance,Accumulators,Services,AdditionalBalances,InternetExtension,SosService,GuaranteePayment,TariffServices,FamilyFeatureToggle', addHeaders({ // Балансы
	    Referer: AnyBalance.getLastUrl()
	}));
	
	var json = getJson(removeBOM(html));
	
	if(json.balance && json.balance.data){
		getParam(json.balance.data.balance + '', result, 'balance', null, null, apiParseBalanceRound);
	    getParam(g_currency[json.balance.data.currency], result, ['currency', 'balance'], null, replaceTagsAndSpaces);
		
		if(json.balance.data.creditLimit)
			getParam(json.balance.data.creditLimit.limit + '', result, 'credit', null, null, apiParseBalanceRound);
		if(json.balance.data.contactData){
			var person = {};
	        sumParam(json.balance.data.contactData.firstName, person, '__n', null, null, null, create_aggregate_join(' '));
//	        sumParam(json.balance.data.contactData, person, '__n', null, null, null, create_aggregate_join(' '));
	        sumParam(json.balance.data.contactData.lastName, person, '__n', null, null, null, create_aggregate_join(' '));
	        getParam(person.__n, info, 'info.fio');
		}
	}
	
	if(json.accumulators && json.accumulators.data && json.accumulators.data.resetDate)
		getParam(json.accumulators.data.resetDate, result, 'next_billing_date', null, null, parseDateISOMy);
	
	if(json.profileSummary && json.profileSummary.data){
	    getParam(json.profileSummary.data.tariffName, result, 'tariff');
		getParam(json.profileSummary.data.tariffRcRateText, result, 'abon_tariff', null, null, apiParseBalanceRound);
		getParam(json.profileSummary.data.ctn, info, 'info.phone', /^\d{10}$/, [/(\d{3})(\d{3})(\d{2})(\d{2})/, '+7 $1 $2-$3-$4']);
	}
	
	if(json.status && json.status.data && json.status.data.status){
	    if(json.status.data.status == 'Blocked'){
			result.statuslock = 'Номер заблокирован';
	    }else{
	    	result.statuslock = 'Номер не блокирован';
	    }
	}
    
	try{
    	processSiteRemainders(json, result);
	}catch(e){
		AnyBalance.trace('Не удалось получить остатки по пакетам: ' + e.message);
	}
}

function processSiteExpensesPostpaid(result){
	if(!AnyBalance.isAvailable(['month_refill', 'debet', 'overpay', 'traffic_used_4g', 'traffic_used_total']))
		return;
	
	var prefs = AnyBalance.getPreferences();
	
	var region = g_savedData.get('region');
	
	if(AnyBalance.isAvailable(['month_refill', 'overpay'])) {
	    var html = AnyBalance.requestGet('https://' + region.domain + '/api/profile/detalization/paymentspostpaid/', addHeaders({
		     Referer: 'https://' + region.domain + '/customers/products/mobile/profile/'
	    }));
	    
	    if(!html || html == 'null' || /Знаем про ошибку/i.test(html) || AnyBalance.getLastStatusCode() == 500){
			AnyBalance.trace('Не удалось получить историю платежей');
			result.month_refill = 0;
		}else{
		    var payments = getJson(removeBOM(html));
		    
		    getParam(payments.paymentsAmount, result, 'month_refill', null, null, apiParseBalanceRound);
	    }
	}
	
	var html = AnyBalance.requestGet('https://' + region.domain + '/api/profile/detalization/expensestructurepostpaid/', addHeaders({
		 Referer: 'https://' + region.domain + '/customers/products/mobile/profile/'
	}));
	
	if(!html || html == 'null' || /Знаем про ошибку/i.test(html) || AnyBalance.getLastStatusCode() == 500){
        AnyBalance.trace('Информация на сайте временно недоступна');
		AnyBalance.trace('Не удалось получить историю расходов');
		result.debet = 0;
	}else{
		var expenses = getJson(removeBOM(html));
		
		getParam(expenses.expensesAmount, result, 'debet', null, null, apiParseBalanceRound);
	}
	
	getParam(result.month_refill - result.debet, result, 'overpay', null, null, apiParseBalanceRound);
	
	if(AnyBalance.isAvailable('traffic_used_4g', 'traffic_used_total') && expenses) {
		var category_unlim4g = expenses.transactions.filter(function (t) { return ((t.trafficUnit && t.trafficUnit == 'KBYTE') && (t.operation && /Безлимит в 4G/i.test(t.operation))) }) || [];
		
		var category_traff = expenses.transactions.filter(function (t) { return ((t.trafficUnit && t.trafficUnit == 'KBYTE') || (t.operation && /интернет/i.test(t.operation))) }) || [];

		
	    if (category_unlim4g.length>0) {
			category_unlim4g.forEach(function (cat){
    			sumParam(cat.trafficVolume + ' ' + cat.trafficUnit, result, 'traffic_used_4g', null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
    		})
	    }
		
		if (category_traff.length>0) {
    	    category_traff.forEach(function (cat){
    			sumParam(cat.trafficVolume + ' ' + cat.trafficUnit, result, 'traffic_used_total', null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
    		})
	    }
		
		if(!result.traffic_used_4g && AnyBalance.isAvailable('traffic_used_4g'))
		    result.traffic_used_4g = 0;
	    
	    if(!result.traffic_used_total && AnyBalance.isAvailable('traffic_used_total'))
		    result.traffic_used_total = 0;
	}
}

function fetchPre(baseurl, html, json, result) {
    var prefs = AnyBalance.getPreferences();
	
	processSitePrepaid(result);
	
	processSiteAddBalances(result);
	
	processSiteTariff(result);
	
    processSiteExpensesPrepaid(result);
	
	processSiteServices(result);
	
	if(typeof(processSitePayments) == 'function')
		processSitePayments(result);
	
	processSiteInfo(json, result);
}

function processSitePrepaid(result){
	var prefs = AnyBalance.getPreferences();
	
	var region = g_savedData.get('region');
	
	if(AnyBalance.isAvailable(['balance', 'currency', 'statuslock'])){
		var html = AnyBalance.requestGet('https://' + region.domain + '/api/profile/userinfo/data/?noTimeout=false&blocks=BalanceNotification,Status,ProfileSummary,Balance,Accumulators,Services,AdditionalBalances,InternetExtension,SosService,GuaranteePayment,TariffServices,FamilyFeatureToggle', addHeaders({ // Балансы
	    	Referer: AnyBalance.getLastUrl()
	    }));
	    
	    var json = getJson(removeBOM(html));
	    
		if(json.balance && json.balance.data){
		    getParam(json.balance.data.balance + '', result, 'balance', null, null, apiParseBalanceRound);
	        getParam(g_currency[json.balance.data.currency], result, ['currency', 'balance'], null, replaceTagsAndSpaces);
			if(json.balance.data.nextBillingDate)
			    getParam(json.balance.data.nextBillingDate, result, 'next_billing_date', null, null, parseDateISOMy);
		}
		
		if(json.status && json.status.data && json.status.data.status){
	    	if(json.status.data.status == 'Blocked'){
			    result.statuslock = 'Номер заблокирован';
	        }else{
	    	    result.statuslock = 'Номер не блокирован';
	        }
		}
	}
    
	try{
    	processSiteRemainders(json, result);
	}catch(e){
		AnyBalance.trace('Не удалось получить остатки по пакетам: ' + e.message);
	}
}

function processSiteAddBalances(result){
	if(!AnyBalance.isAvailable(['unified_balance', 'addon_balance']))
		return;
	
	var region = g_savedData.get('region');
	
	var html = AnyBalance.requestGet('https://' + region.domain + '/api/uni-profile-balances/', addHeaders({ // Баланс для доп. услуг
	    Referer: AnyBalance.getLastUrl()
	}));
	
	if(!html || html == 'null' || /Знаем про ошибку/i.test(html) || AnyBalance.getLastStatusCode() == 500){
        AnyBalance.trace('Информация на сайте временно недоступна');
	}else{
	    var balances = getJson(removeBOM(html));
	    
	    if(balances.length && balances.length > 0){
		    for(var i=0; i<balances.length; ++i){
	            var bal = balances[i];
	            if(bal.balanceType === 'Personal'){
	        	    if(!result.balance)
					    getParam(bal.sum, result, 'balance', null, null, apiParseBalanceRound);
	            }else if(bal.balanceType === 'UB'){
				    getParam(bal.sum, result, 'unified_balance', null, replaceTagsAndSpaces, apiParseBalanceRound);
			    }else if(bal.balanceType === 'CAC'){
				    getParam(bal.sum, result, 'addon_balance', null, replaceTagsAndSpaces, apiParseBalanceRound);
			    }else{
		            AnyBalance.trace('Неизвестный тип баланса: ' + JSON.stringify(bal));
		        }
	        }
	    }else{
	        AnyBalance.trace('Не удалось получить дополнительные балансы');
	    }
	}
	
	if(!result.unified_balance && AnyBalance.isAvailable('unified_balance'))
		result.unified_balance = 0;
	
	if(!result.addon_balance && AnyBalance.isAvailable('addon_balance'))
		result.addon_balance = 0;
}

function isLocalMin(name){
	return /Минут(?:\D+)? общения|номера других|на других|на все номера|др(?:угих|\.) операторов|всех|любых|местные.*вызовы|любые местные|по РФ|кроме номеров .?Билайн.?/i.test(name);
}

function processSiteRemainders(json, result){
	if(!AnyBalance.isAvailable('remainders'))
		return;
	
    var prefs = AnyBalance.getPreferences();
	
	var region = g_savedData.get('region');
	
	var remainders = result.remainders = {};
	var accumulators = [];
	
	var data = json.accumulators && json.accumulators.data;
	
	if(!data || data.listForYoung){ // На Связь Z пакеты вынесены в отдельный массив допом к базовым, но пересекаются. Лучше получать их из запроса остатков
	    var html = AnyBalance.requestGet('https://' + region.domain + '/api/uni-profile-mobile/accumulators/', addHeaders({ // Баланс для доп. услуг
	        Referer: AnyBalance.getLastUrl()
	    }));
	    
	    if(!html || html == 'null' || /Знаем про ошибку/i.test(html) || AnyBalance.getLastStatusCode() == 500){
            AnyBalance.trace('Информация на сайте временно недоступна');
	    }else{
			var __json = getJson(removeBOM(html));
			accumulators = (__json.accumulators && __json.accumulators.items) || [];
		}
	}else{
		accumulators = data.list || [];
	}
	
	for(var z=0; z<accumulators.length; z++) {
		var curr = accumulators[z];
		
		if(curr.unit == 'SECONDS') { // Минуты
		    AnyBalance.trace('Пакет минут: ' + JSON.stringify(curr));
			if(/на междугородные номера|на междугородные звонки/i.test(curr.description || curr.title)){
				sumParam(curr.rest + ' ' + curr.unit, remainders, 'remainders.min_left_2', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
			} else if(isLocalMin(curr.description || curr.title) || /BONUS_SECONDS/i.test(curr.title)) { 
				sumParam(curr.rest + ' ' + curr.unit, remainders, 'remainders.min_local', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
			} else { // Приоритет билайна не случаен, их минуты определить сложнее
				sumParam(curr.rest + ' ' + curr.unit, remainders, 'remainders.min_bi', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
			}
		} else if(curr.unit == 'SMS') {
			AnyBalance.trace('Пакет SMS: ' + JSON.stringify(curr));
			sumParam(curr.rest + ' ' + curr.unit, remainders, 'remainders.sms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
		} else if(curr.unit == 'MMS') {
			AnyBalance.trace('Пакет MMS: ' + JSON.stringify(curr));
			sumParam(curr.rest + ' ' + curr.unit, remainders, 'remainders.mms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
		} else if(curr.unit == 'KBYTE') {
			AnyBalance.trace('Пакет трафика: ' + JSON.stringify(curr));
			if (/ROAMGPRS|роуминг/i.test(curr.title)){
				sumParam(curr.rest + ' ' + curr.unit, remainders, 'remainders.traffic_rouming', null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
			}else if(/TETHERING|раздач(?:\D+)?/i.test(curr.title)){ // Пакет для раздачи на максимальной скорости
				sumParam(curr.rest + ' ' + curr.unit, remainders, 'remainders.traffic_tethering', null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
			}else{
				sumParam(curr.rest + ' ' + curr.unit, remainders, ['remainders.traffic_left', 'remainders.traffic_used'], null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
				
				if(AnyBalance.isAvailable(['remainders.traffic_total', 'remainders.traffic_used']))
				   sumParam(curr.size + ' ' + curr.unit, remainders, ['remainders.traffic_total', 'remainders.traffic_used'], null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
			    
				if(isset(remainders.traffic_left) && isset(remainders.traffic_total))
			    	sumParam(Math.round(remainders.traffic_total - remainders.traffic_left, 2), remainders, 'remainders.traffic_used', null, null, null, aggregate_sum);
			}
		} else {
			AnyBalance.trace('Неизвестный пакет: ' + JSON.stringify(curr));
		}
	}
    
	if(AnyBalance.isAvailable('remainders.rub_opros', 'remainders.rub_opros_till', 'remainders.rub_bonus', 'remainders.rub_bonus2', 'remainders.rub_bonus2_till', 'remainders.min_local', 'remainders.min_left_1', 'remainders.min_left_3', 'remainders.traffic_left', 'remainders.mms_left', 'remainders.sms_left', 'remainders.traffic_bonus')){
	    json = (json.additionalBalances && json.additionalBalances.data) || [];
	    
	    for(var prop in json){
		    if(isArray(json[prop].data)){
			    for(var i=0; i<json[prop].data.length; i++) {
				    var curr = json[prop].data[i];
				    
				    if(/shadow/i.test(curr.name)) { // Пересекающиеся с основным пакеты пропускаем, ищем только бонусы и пакеты по подпискам
					    AnyBalance.trace('Пересекающийся пакет ' + curr.name + ': ' + curr.value + ' ' + curr.unit + '. Пропускаем...');
					    continue;
				    }else if(/bonusopros/i.test(curr.name)) {
					    sumParam(curr.value + '', remainders, 'remainders.rub_opros', null, replaceTagsAndSpaces, apiParseBalanceRound, aggregate_sum);
						getParam(curr.dueDate, remainders, 'remainders.rub_opros_till', null, replaceTagsAndSpaces, parseDateISOMy); 
				    }else if(/bonusmoney/i.test(curr.name)) {
					    sumParam(curr.value + '', remainders, 'remainders.rub_bonus', null, replaceTagsAndSpaces, apiParseBalanceRound, aggregate_sum);
				    }else if(/bonusbalance17/i.test(curr.name)) { // Денежный бонус
					    getParam(curr.value + '', remainders, 'remainders.rub_bonus2', null, replaceTagsAndSpaces, apiParseBalanceRound);
					    getParam(curr.dueDate, remainders, 'remainders.rub_bonus2_till', null, replaceTagsAndSpaces, parseDateISOMy);
				    }else if(/bonusseconds/i.test(curr.name)) { // Бонус секунд-промо
					    AnyBalance.trace('Дополнительный пакет минут: ' + JSON.stringify(curr));
						if(!remainders.min_local){ // Если в основном пакете минуты не найдены, выводим бонусные минуты
						    sumParam(curr.value + ' ' + curr.unit, remainders, 'remainders.min_local', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
					    }else{ // иначе, выводим минуты в отдельный счетчик
						    sumParam(curr.value + ' ' + curr.unit, remainders, 'remainders.min_left_1', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
					    }
				    }else if(/\.9seconds/i.test(curr.name)) { // Минуты на звонки в Узбекистан, номера сети Tcell Таджикистан, билайн Кыргызстана и Армении для тарифов UP
					    AnyBalance.trace('Дополнительный пакет минут: ' + JSON.stringify(curr));
						sumParam(curr.value + ' ' + curr.unit, remainders, 'remainders.min_left_3', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
				    }else if(/seconds/i.test(curr.name)) {
					    AnyBalance.trace('Дополнительный пакет минут: ' + JSON.stringify(curr));
						sumParam(curr.value + ' ' + curr.unit, remainders, 'remainders.min_local', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
				    }else if(/internet|kbyte/i.test(curr.name)) {
						AnyBalance.trace('Дополнительный пакет трафика: ' + JSON.stringify(curr));
					    if(/\.\d+kbyte/i.test(curr.name)){ // Подарочный терабайт
						    sumParam(curr.value + ' BYTE', remainders, 'remainders.traffic_bonus', null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
					    }else{
						    sumParam(curr.value + ' BYTE', remainders, 'remainders.traffic_left', null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
					    }
				    }else if(/mms/i.test(curr.name)) {
						AnyBalance.trace('Дополнительный пакет MMS: ' + JSON.stringify(curr));
					    sumParam(curr.value + ' ' + curr.unit, remainders, 'remainders.mms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
				    }else if(/sms/i.test(curr.name)) {
						AnyBalance.trace('Дополнительный пакет SMS: ' + JSON.stringify(curr));
					    sumParam(curr.value + ' ' + curr.unit, remainders, 'remainders.sms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
				    }else{
					    AnyBalance.trace('Неизвестная опция ' + curr.name + ': ' + JSON.stringify(curr));
				    }
			    }
		    }
	    }
	}
}

function processSiteTariff(result){
	if(!AnyBalance.isAvailable(['tariff', 'abon_tariff', 'next_billing_date']))
		return;
	
	var prefs = AnyBalance.getPreferences();
	
	var region = g_savedData.get('region');
	
	html = AnyBalance.requestGet('https://' + region.domain + '/api/uni-profile-mobile/blocks/', addHeaders({ // Тариф и остатки
		Referer: AnyBalance.getLastUrl()
	}));
	
	if(!html || html == 'null' || /Знаем про ошибку/i.test(html) || AnyBalance.getLastStatusCode() == 500){
        AnyBalance.trace('Информация на сайте временно недоступна');
	}else{
	    var json = getJson(removeBOM(html));
        
	    getParam(json.tariff.name, result, 'tariff');
	    
	    if(AnyBalance.isAvailable('abon_tariff', 'next_billing_date')){
	        html = AnyBalance.requestGet('https://' + region.domain + '/api/uni-profile-mobile/tariff-fee/', addHeaders({ // Абонплата по тарифу
		    Referer: AnyBalance.getLastUrl()
	        }));
	        
	        var fee = getJson(removeBOM(html));
            
	        if(AnyBalance.isAvailable('abon_tariff'))
		        getParam(fee.rcRate, result, 'abon_tariff', null, null, apiParseBalanceRound);
		    if(AnyBalance.isAvailable('next_billing_date') && !result.next_billing_date){
			    if(fee.billingDate)
				    getParam(fee.billingDate, result, 'next_billing_date', null, null, parseDateISOMy);
			    if(!result.next_billing_date){ // Пробуем получить дату следующего списания хотя бы из срока действия пакета услуг
	                if(json.accumulators && json.accumulators.items && json.accumulators.items[0] && json.accumulators.items[0].resetDateTimeUtc)
	                getParam(json.accumulators.items[0].resetDateTimeUtc, result, 'next_billing_date', null, null, parseDateISO);
                }
		    }
	    }
	}
}

function processSiteInfo(json, result){
	if(!AnyBalance.isAvailable('info'))
		return;
	
	var prefs = AnyBalance.getPreferences();
	
	var region = g_savedData.get('region');
    
	if (!result.info)
        result.info = {};

	var info = result.info;
	
	getParam(json.ctn, info, 'info.phone', /^\d{10}$/, [/(\d{3})(\d{3})(\d{2})(\d{2})/, '+7 $1 $2-$3-$4']);
    
	if(AnyBalance.isAvailable('info.fio', 'info.address')){
	    var html = AnyBalance.requestGet('https://' + region.domain + '/api/profile/settings/abonentform/', addHeaders({
		    Referer: AnyBalance.getLastUrl()
	    }));
	    
	    if(!html || html == 'null' || /Знаем про ошибку/i.test(html) || AnyBalance.getLastStatusCode() == 500){
            AnyBalance.trace('Информация на сайте временно недоступна');
	    }else{
		    var json = getJson(removeBOM(html));
            
	        var jsp = create_aggregate_join(' ');
	        
	        for(var i=0; i<json.data.length; ++i){
		        var d = json.data[i];
		        var t = d.title;
		        
		        if(t == 'Основные данные' && d.fields && d.fields.length>0){
			        for(var j=d.fields.length-1; j>=0; j--) {
				        var f = d.fields[j];
		                if(f.label == 'Имя' && f.value){
	            	        sumParam(f.value, info, 'info.fio', null, null, null, jsp);
	                    }
	                    if(f.label == 'Фамилия' && f.value){
	            	        sumParam(f.value, info, 'info.fio', null, null, null, jsp);
	                    }
		            }
		        }
	        }
	        
//	        getParam('', info, 'info.address');
	    }
	}
}

function processSiteServices(result){
	if(!AnyBalance.isAvailable('services_paid', 'services_free', 'services_count', 'services_abon', 'services_abon_day'))
		return;
	
	var prefs = AnyBalance.getPreferences();
	
	var region = g_savedData.get('region');
    
	html = AnyBalance.requestGet('https://' + region.domain + '/api/profile/userinfo/data/?blocks=ConnectedServices,Services,Status', addHeaders({ // Все услуги
		 Referer: AnyBalance.getLastUrl()
	}));
	
	if(!html || html == 'null' || /Знаем про ошибку/i.test(html) || AnyBalance.getLastStatusCode() == 500){
        AnyBalance.trace('Информация на сайте временно недоступна');
	}else{
	    var json = getJson(removeBOM(html));
	    
        var st = (json.connectedServices && json.connectedServices.data) || [];
        
	    AnyBalance.trace('Найдено услуг: ' + ((st && st.length) ? st.length : 0));
	    
	    getParam(0, result, 'services_paid');
	    getParam(0, result, 'services_free');
	    getParam((st && st.length) ? st.length : 0, result, 'services_count');
	    getParam(0, result, 'services_abon');
	    getParam(0, result, 'services_abon_day');
        
	    for(var i=0; i<st.length; ++i){
		    var s = st[i];
		    
		    if(!s.rcRate && (/Пакет|автопродление|Переадресация/i.test(s.title) || /\d+[.,\d+]*? (?:руб|₽)/i.test(s.description)) && !/в подарок/i.test(s.description)){ // Разовая платная услуга
		        AnyBalance.trace('Платная услуга ' + s.title + ': ' + s.rcRate + ' ₽' + (s.rcRatePeriodText ? ' ' + s.rcRatePeriodText : ''));
			    sumParam(1, result, 'services_paid', null, null, null, aggregate_sum);
			    continue;
		    }
		    
		    if(s.rcRate){
			    AnyBalance.trace('Платная услуга ' + s.title + ': ' + s.rcRate + ' ₽' + (s.rcRatePeriodText ? ' ' + s.rcRatePeriodText : ''));
			    if(!/сутки/i.test(s.rcRatePeriodText)){
				    sumParam(s.rcRate, result, 'services_abon', null, null, null, aggregate_sum);
                }else{
				    sumParam(s.rcRate, result, 'services_abon_day', null, null, null, aggregate_sum);
                }
			    sumParam(1, result, 'services_paid', null, null, null, aggregate_sum);
	        }else{
			    AnyBalance.trace('Бесплатная услуга ' + s.title);
			    sumParam(1, result, 'services_free', null, null, null, aggregate_sum);
		    }
        }
	}
}

function processSiteExpensesPrepaid(result){
	if(!AnyBalance.isAvailable(['month_refill', 'debet', 'overpay', 'traffic_used_4g', 'traffic_used_total']))
		return;
	
	var prefs = AnyBalance.getPreferences();
	
	var region = g_savedData.get('region');
	
	var dt = new Date();
	var ym = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-';
	
	var periodStart = ym + '01';
	var periodEnd = ym + n2(dt.getDate());
	
	html = AnyBalance.requestGet('https://' + region.domain + '/api/profile/detalization/expensestructure/?periodStart=' + periodStart + '&periodEnd=' + periodEnd, addHeaders({
		 Referer: 'https://' + region.domain + '/customers/products/elk/tab/detalization/'
	}));
	
	if(!html || html == 'null' || /Знаем про ошибку/i.test(html) || AnyBalance.getLastStatusCode() == 500){
        AnyBalance.trace('Информация на сайте временно недоступна');
	}else{
	    var json = getJson(removeBOM(html));
	    
	    if(AnyBalance.isAvailable('month_refill', 'debet', 'overpay')) {
            var main_balance = json.balanceAndBonuses.filter(function (b) { return (b.title && /Личный баланс|Денежный бонус/i.test(b.title)) }) || [];
		    
		    if (main_balance.length>0) {
			    var __b = {};
			    main_balance.forEach(function (b){
    			    sumParam(b.addedBonuses, __b, 'month_refill', null, null, apiParseBalanceRoundSilent, aggregate_sum);
				    sumParam(b.spentBonuses, __b, 'debet', null, [replaceTagsAndSpaces, /-/i, ''], apiParseBalanceRoundSilent, aggregate_sum);
				    if (b.endBalanceAmount>0 && !result.overpay)
    		        sumParam(b.endBalanceAmount, __b, 'overpay', null, null, apiParseBalanceRoundSilent, aggregate_sum);
    		    })
			    if(__b.month_refill){
			        getParam(aggregate_max([__b.month_refill, g_savedData.get('addedBonuses' + ym)]), result, 'month_refill', null, null, apiParseBalanceRound);
			        g_savedData.set('addedBonuses' + ym, result.month_refill);
				    g_savedData.save();
			    }
			    if(__b.debet){
			        getParam(aggregate_max([__b.debet, g_savedData.get('spentBonuses' + ym)]), result, 'debet', null, null, apiParseBalanceRound);
			        g_savedData.set('spentBonuses' + ym, result.debet);
                    g_savedData.save();
			    }
			    if (__b.overpay)
			        getParam(__b.overpay, result, 'overpay', null, null, apiParseBalanceRound);
            }
		}
	    
	    if(!result.month_refill && AnyBalance.isAvailable('month_refill'))
		    result.month_refill = 0;
	    
	    if(!result.debet && AnyBalance.isAvailable('debet'))
		    result.debet = 0;
	    
	    if (!result.overpay && AnyBalance.isAvailable('overpay'))
		    result.overpay = 0;
	    
	    if(AnyBalance.isAvailable('traffic_used_4g', 'traffic_used_total')) {
		    var category_unlim4g = json.callDetails.filter(function (t) { return ((t.transactionType && t.transactionType == 'mobileInternet') && (t.operation && /Безлимит в 4G/i.test(t.operation))) }) || [];
		    
		   var category_traff = json.callDetails.filter(function (t) { return ((t.transactionType && t.transactionType == 'mobileInternet') || (t.operation && /интернет/i.test(t.operation))) }) || [];
           
	        if (category_unlim4g.length>0) {
			    category_unlim4g.forEach(function (cat){
    			    sumParam(cat.trafficVolume + ' ' + cat.trafficUnit, result, 'traffic_used_4g', null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
    		    })
	        }
		    
		    if (category_traff.length>0) {
    	        category_traff.forEach(function (cat){
    			    sumParam(cat.trafficVolume + ' ' + cat.trafficUnit, result, 'traffic_used_total', null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
    		    })
	        }
		    
		    if(!result.traffic_used_4g && AnyBalance.isAvailable('traffic_used_4g'))
		        result.traffic_used_4g = 0;
	        
	        if(!result.traffic_used_total && AnyBalance.isAvailable('traffic_used_total'))
		        result.traffic_used_total = 0;
	    }
	}
}

function processSitePayments(result){
	if(!AnyBalance.isAvailable('payments'))
		return;
	
	var prefs = AnyBalance.getPreferences();
	
	var region = g_savedData.get('region');
	
	var dt = new Date();
    var dtPrev = new Date(dt.getFullYear(), dt.getMonth()-5, dt.getDate());
    var periodEnd = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + n2(dt.getDate()); // + 'T00:00:00.000Z';
    var periodStart = dtPrev.getFullYear() + '-' + n2(dtPrev.getMonth()+1) + '-' + n2(dtPrev.getDate()); // + 'T00:00:00.000Z';
	
	try{
		html = AnyBalance.requestGet('https://' + region.domain + '/api/profile/detalization/paymentsprepaid/?periodStart=' + periodStart + '&periodEnd=' + periodEnd, addHeaders({
		    Referer: 'https://' + region.domain + '/customers/products/elk/tab/detalization/'
	    }));
		
		var json = getJson(removeBOM(html));

		processSitePayments0(json, result);
	}catch(e){
		AnyBalance.trace('Не удалось получить историю платежей: ' + e.message);
	}
}

function processSitePayments0(json, result){
	result.payments = [];
	json = json.detalizationPayments.filter(function (item) { return (item.balanceName && /Личный баланс/i.test(item.balanceName)) }) || []; // Иногда встречаются левые строки в платежах, выбираем только личный баланс
	AnyBalance.trace('Найдено платежей: ' + json.length);
	
	for(var i=0; i<json.length; ++i){
		var payment = json[i];
		var p = {};
		getParam(payment.value, p, 'payments.sum', null, null, parseBalance);
		getParam(payment.date, p, 'payments.date', null, null, parseDateISOMy);
		getParam(payment.channel, p, 'payments.place', null, null, capitalizeFirstLetter);

		result.payments.push(p);
	}
}

function createNewPassword(baseurl){
    return createNewPasswordApi();
}

function loginWithoutPassword(baseurl){
    var pass = createNewPassword(baseurl);

    var html = AnyBalance.requestGet(baseurl, g_headers); //Заново получим главную страницу кабинета.

    var result = getLKType(html, json);
    result.password = pass;

    return result;
}

function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function parseDateISOMy(str) {
	var date = parseDateISO(str);
	if(!isset(date))
		return null;
	
	return parseDateISOSilent(str.replace(/^(\d{4}-\d{2}-\d{2})(.*)$/, '$1'));
}
