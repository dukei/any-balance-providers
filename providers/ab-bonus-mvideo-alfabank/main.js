/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Cache-Control': 'max-age=0',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36',
};

var baseurlOuter = 'https://www.mvideo.ru';
var baseurlLocal = 'https://www.mvideo.ru';

var browserApi = 'http://browser.anybalance.ru:4024';
//var browserApi = 'http://192.168.0.117:4024';
//var browserApi = 'http://localhost:4024';

function login(){
	var prefs = AnyBalance.getPreferences();
		
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

    var html = AnyBalance.requestGet(baseurlLocal + '/my-account', g_headers);

    if(!/logout/i.test(html)){

    	clearAllCookies();

    	html = AnyBalance.requestPost(browserApi + '/base/open', JSON.stringify({
    		userAgent: g_headers["User-Agent"],
    		url: baseurlOuter + "/login",
    		rules: [
    		    {
    				url: /^https?:\/\/(www|static)\.mvideo\.ru/.toString(),
    				not: true,
                	action: 'abort',
               	},{
                	resType: /^(image|stylesheet|font)$/.toString(),
                	action: 'abort',
               	},{
               		url: /\/login|api\/fl|ip-to-location/.toString(),
                	action: 'request',
                }
    		],
    	}), {"Content-Type": "application/json"});
    	var json = JSON.parse(html);
    	if(json.status !== 'ok'){
    		AnyBalance.trace(html);
    		throw new AnyBalance.Error('Ошибка browser api: ' + json.message);
    	}
    	var page = json.page, num=0;

    	do{
    		++num;
    		AnyBalance.sleep(3000);
  			html = AnyBalance.requestGet(browserApi + '/base/status?page=' + page);
  			json = JSON.parse(html);
    		if(json.status !== 'ok'){
    			AnyBalance.trace(html);
    			throw new AnyBalance.Error('Ошибка browser api: ' + json.message);
    		}
    		AnyBalance.trace('Статус загрузки: ' + json.loadStatus + ' (попытка ' + num + ')');
    		if(json.pendingRequests && json.pendingRequests.length > 0){
    			for(let j=0; j<json.pendingRequests.length; ++j){
    				var pr = json.pendingRequests[j];
    				var headers = [];
    				for(var name in pr.headers){
    					var values = pr.headers[name].split('\n');
    					for(var i=0; i<values.length; ++i)
    						headers.push([name, values[i]]);
    				}
    				html = AnyBalance.requestPost(pr.url, pr.body, addHeaders(headers, {
    					'Accept': '*/*',
						'Origin': 'https://www.mvideo.ru',
						'Sec-Fetch-Site': 'same-origin',
						'Sec-Fetch-Mode': 'cors',
						'Sec-Fetch-Dest': 'empty'
    				}), {HTTP_METHOD: pr.method});
    				var params = AnyBalance.getLastResponseParameters();
    				var convertedHeaders = {}, ct;
    				params.headers.push(['set-cookie', '_HASH__=' + AnyBalance.getCookie('_HASH__') + '; Max-Age=3600; Path=/']);

    				for(var i=0; i<params.headers.length; ++i){
    					var h = params.headers[i];
    					var name = h[0].toLowerCase();
    					if(['transfer-encoding','content-encoding'].indexOf(name) >= 0)
    						continue; //Возвращаем контент целиком
    					if(name === 'content-length'){
    						//https://stackoverflow.com/questions/5515869/string-length-in-bytes-in-javascript
    						h[1] = '' + unescape(encodeURIComponent(html || '')).length;
    					}
    					if(convertedHeaders[name] === undefined){
    						convertedHeaders[name] = h[1];
    					}else{
    						convertedHeaders[name] += '\n' + h[1];
    					}
    					if(name === 'content-type')
    						ct = h[1];
    				}
    				var pr = {
    					id: pr.id,
    					page: page,
    					r: {
    						status: AnyBalance.getLastStatusCode(),
    						headers: convertedHeaders,
    						contentType: ct,
    						body: html
    					}
    				}
    				html = AnyBalance.requestPost(browserApi + '/base/response', JSON.stringify(pr), {"Content-Type": "application/json"});
    			}
    		}else if(json.loadStatus === 'load')
    			break;
    	}while(num < 15);

    	if(json.loadStatus !== 'load')
    		throw new AnyBalance.Error('Не удалось получить информацию для входа');

    	html = AnyBalance.requestGet(browserApi + '/base/content?page='+page);
    	json = JSON.parse(html);
    	if(json.status !== 'ok'){
    		AnyBalance.trace(html);
    		throw new AnyBalance.Error('Ошибка browser api: ' + json.message);
    	}
    	var htmlContent = json.content;

    	html = AnyBalance.requestPost(browserApi + '/base/cookies', JSON.stringify({
    		page: page,
    		urls: [baseurlOuter + "/"]
    	}), {"Content-Type": "application/json"});

    	json = JSON.parse(html);
    	if(json.status !== 'ok'){
    		AnyBalance.trace(html);
    		throw new AnyBalance.Error('Ошибка browser api: ' + json.message);
    	}

    	html = AnyBalance.requestPost(browserApi + '/base/close', JSON.stringify({
    		page: page,
    	}), {"Content-Type": "application/json"});

    	for(var i=0; i<json.cookies.length; ++i){
    		var c = json.cookies[i];
    		AnyBalance.setCookie(c.domain, c.name, c.value, c);
    	}

        html = htmlContent;
        
        function sendForm(html, code){
        	var prefs = AnyBalance.getPreferences();
            var form = getElement(html, /<form[^>]+name="login-form"[^>]*>/i);
            if(!form){
            	AnyBalance.trace(form);
            	throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
            }
            
//  //        var allowedArgs = /_dyn|cardType|CardNumber|zipCode|dateOfBirth|loginCard|DARGS|loginCaseSensitive|password|loginEmailPhone|verification-code|phoneNumber|code-check|showCaptcha|rememberMe/i;
			var params = createFormParams(form, function(params, str, name, value) {
//	//			if(!allowedArgs.test(name))
//	//				return;
		    
				if ('/com/mvideo/userprofiling/LoginFormHandler.loginCaseSensitive' == name)
					return prefs.login;
				else if ('verification-code' == name)
					return code;
				else if ('password' == name || 'login_password' == name)
					return prefs.password;
				else if (name == 'zipCode')
					return prefs.zip;
				else if (name == '/com/mvideo/userprofiling/LoginFormHandler.dateOfBirth')
					return birthdate;
				else if (name == 'rememberMe')
					return 'true'
		    
				return value;
			});
	    
			if(/recaptcha/i.test(form)){
				var recaptcha = solveRecaptcha('Пожалуйста, докажите, что вы не робот', baseurlOuter, '6LdfyhQUAAAAAH18wjeroCwCYU9F6yjqp-2MYW7M');
				params.recaptcha = 'on';
				params['g-recaptcha-response'] = recaptcha;
			}
		    
			var action = getParam(form, null, null, /action="([^"]*)/i, replaceHtmlEntities);
			html = AnyBalance.requestPost(baseurlLocal + action, params, addHeaders({Referer: baseurlLocal + '/login'}));
			return html;
		}
	    
		html = sendForm(html);
	}else{
		AnyBalance.trace('Вошли автоматически');
	}

	if(!/logout/i.test(html)){
		if(/js-confirm-phone-btn/i.test(html)){
			var phone = getParam(html, /<input[^>]+register-form-phone[^>]+value="([^"]*)/i, replaceHtmlEntities);
			AnyBalance.trace('МВидео требует подтвердить ваш номер телефона: ' + phone);
			var sent = AnyBalance.requestPost(baseurlLocal + '/sitebuilder/components/phoneVerification/sendSmsCode.json.jsp', {
				phone: phone
			}, addHeaders({
				'X-Requested-With': 'XMLHttpRequest',
				'Referer': AnyBalance.getLastUrl()
			}));
			if(getJson(sent).success != "true"){
				AnyBalance.trace(sent);
				throw new AnyBalance.Error('МВидео потребовал подтверждение по смс, но смс не удалось послать');
			}

			var sms = AnyBalance.retrieveCode('Пожалуйста, введите код для подтверждения входа в ЛК МВидео, высланный на телефон ' + phone);

			var verify = AnyBalance.requestPost(baseurlLocal + '/sitebuilder/components/phoneVerification/verifySmsCode.json.jsp', {
				phone: phone,
				code: sms
			});

			if(getJson(verify).success != "true"){
				AnyBalance.trace(verify);
				throw new AnyBalance.Error('Неверный код подверждения входа');
			}

			html = sendForm(html);
		}else if(prefs.type != -1 && /frm-password/i.test(html)){
			throw new AnyBalance.Error('МВидео при входе по номеру карты затребовал пароль. Пожалуйста, переключитесь в настройках провайдера на вход по логину и паролю', null, true);
		}

	}

	if(!/logout/i.test(html)){
		var error = getParam(html, null, null, /<label[^>]+class="text-error"[^>]*>\s*([^\s<][\s\S]*?)<\/label>/ig, replaceTagsAndSpaces);
		if(!error)
			error = getElement(html, /<[^>]+error-notification-main-text/i, replaceTagsAndSpaces);
		if(error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		if(!html && prefs.type >= 0)
			throw new AnyBalance.Error('Не удаётся зайти по номеру карты (М.Видео возвращает пустую страницу). Попробуйте войти по логину и паролю.');
		if(/Для восстановления пароля авторизуйтесь через адрес электронной почты или телефон/i.test(html))
			throw new AnyBalance.Error('М.Видео требует ввести пароль в личный кабинет. Вам необходимо войти в личный кабинет М.Видео https://www.mvideo.ru/login через браузер и ввести пароль.');
		if(AnyBalance.getLastStatusCode() == 401)
			throw new AnyBalance.Error('Пользователь временно заблокирован. Пожалуйста, проверьте логин и пароль и попробуйте позднее');
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
			
	}

	AnyBalance.setData('login', prefs.login);
	AnyBalance.saveCookies();
	AnyBalance.saveData();

	return html;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
    AnyBalance.setOptions({cookiePolicy: 'netscape'});

    if(AnyBalance.getData('login') === prefs.login)
    	AnyBalance.restoreCookies();

    var html;
    try{
        html = login();
    }catch(e){
    	if(prefs.type != '-1' && prefs.login && prefs.password){
    		AnyBalance.trace('Войти по карте не удалось: ' + e.message + ', пробуем по логину-паролю');
    		prefs.type = '-1';
    		html = login();
    	}else{
    		throw e;
    	}
    }

	var result = {success: true};
    //Баланс бонусных рублей
    getParam(html, result, 'balance_all', /<span[^>]+class="header-user-details"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

    html = AnyBalance.requestGet(baseurlLocal + '/my-account', g_headers);
    getParam(html, result, 'fio', /Владелец карты[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /([\d\s]+)\s+БР(?:\s|<[^>]*>)*из\s+[\d\s]+доступно для оплаты/i, null, parseBalance);
    getParam(html, result, 'balance_all', /([\d\s]+)\s+БР(?:\s|<[^>]*>)*из\s+([\d\s]+)доступно для оплаты/i, null, parseBalance);
/*    var avail = getElements(html, /<thead/ig, [/Доступно для оплаты/i])[0];
    if(avail)
    	getParam(avail, result, 'balance', /<thead[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    sumParam(html, result, 'balance_all', /<thead[^>]+u-font-large[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    */
    getParam(html, result, '__tariff', /Номер карты[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    
    var hist = getElement(html, /<li[^>]+personal-orders-block-item[^>]*>/i);
    if(hist){
    	// Дата последней операции по счету
   		getParam(hist, result, 'last_date2', /<div[^>]+order-date[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
   		getParam(hist, result, 'last_number', /<div[^>]+order-number[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
   		getParam(hist, result, 'last_status', /<div[^>]+order-status[^>]*>([\s\S]*?)<\/div>/i, [/<strong[^>]*>[\s\S]*?<\/strong>/i, '', replaceTagsAndSpaces]);
    	getParam(hist, result, 'last_sum', /<div[^>]+order-amount[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    }else{
    	AnyBalance.trace('Последняя операция не найдена...');
    }

    if(AnyBalance.isAvailable('burn_date2')){
    	getParam(html, result, 'burn_date2', /успейте потратить [^<]*бонусных рублей до([^<]*)/i, replaceHtmlEntities, parseDate);
	}

    if(AnyBalance.isAvailable('strategy')){
   	   	html = AnyBalance.requestGet(baseurlLocal + '/my-account/bonusStrategy', g_headers);
   	   	var checked = getElements(html, [/<div[^>]+class="controls-group"[^>]*>/ig, /<input[^>]+id="newsletterBySms[^>]+checked/i])[0];
   	   	if(!checked)
   	   		AnyBalance.trace('Стратегия не выбрана?\n' + html); 
   	   	getParam(checked, result, 'strategy', null, replaceTagsAndSpaces);
   	}

    AnyBalance.setResult(result);
}

function addzero(i) {
	return (i < 10) ? "0" + i : i;
}

function format_date(d, format) {
	var m;
	if (d[4] + d[5] == "01") {
		m = "янв";
	}
	if (d[4] + d[5] == "02") {
		m = "фев";
	}
	if (d[4] + d[5] == "03") {
		m = "мар";
	}
	if (d[4] + d[5] == "04") {
		m = "апр";
	}
	if (d[4] + d[5] == "05") {
		m = "май";
	}
	if (d[4] + d[5] == "06") {
		m = "июн";
	}
	if (d[4] + d[5] == "07") {
		m = "июл";
	}
	if (d[4] + d[5] == "08") {
		m = "авг";
	}
	if (d[4] + d[5] == "09") {
		m = "сен";
	}
	if (d[4] + d[5] == "10") {
		m = "окт";
	}
	if (d[4] + d[5] == "11") {
		m = "ноя";
	}
	if (d[4] + d[5] == "12") {
		m = "дек";
	}
	if (format == 1) {
		d = d[0] + d[1] + d[2] + d[3] + ' ' + m + ' ' + d[6] + d[7];
	} //          YYYY MMM DD
	if (format == 2) {
		d = d[6] + d[7] + ' ' + m + ' ' + d[0] + d[1] + d[2] + d[3];
	} //          DD MMM YYYY
	if (format == 3) {
		d = d[0] + d[1] + d[2] + d[3] + '-' + d[4] + d[5] + '-' + d[6] + d[7];
	} //          YYYY-MM-DD
	if (format == 4) {
		d = d[6] + d[7] + '-' + d[4] + d[5] + '-' + d[0] + d[1] + d[2] + d[3];
	} //          DD-MM-YYYY
	return d;
}