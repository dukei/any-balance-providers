/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	Accept: 'application/json',
	'Accept-Language': 'en_US',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();

	AnyBalance.setOptions({
		SSL_ENABLED_PROTOCOLS: ['TLSv1.2'] //Чтобы работало на Android 4.1+
	});
	
    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Enter e-mail!');
	checkEmpty(prefs.password, 'Enter password!');

	logInSite();
}

function executeChallenge(script, baseurl, loginPage){
	var ABSave = AnyBalance;
	var formParams = {};

	function Element(tag){
		this.tagName = tag;
		this.style = {};
		return this;
	}

	var mainDiv = new Element('div');

	var doc = {
		_cookie: '',
		elements: {
			main: mainDiv,
			'ads-plugin': mainDiv,
		}, 

		forms: {
			challenge: {
				appendChild: function(elem){
					formParams[elem.name] = elem.value;
				}
			}
		},
		
		get cookie(){
			return this._cookie;
		},
		
		set cookie(str){
			try{
				AnyBalance = ABSave;
				AnyBalance.trace('Setting cookie: ' + str);
				var name = getParam(str, null, null, /[^=\s]+/i);
				var val = getParam(str, null, null, /=\s*([^;]*)/i);
				AnyBalance.setCookie('www.paypal.com', name, val);
				this._cookie = name + '=' + val;
			}finally{
				AnyBalance = undefined;
			}
		},

		createElement: function(tag){
			return new Element(tag);
		},

		getElementById: function(id){
			if(!this.elements[id])
				ABSave.trace('Could not find element by Id: ' + id);
			return this.elements[id];
		},

		lastModified: new Date().toString(),
		characterSet: 'UTF-8',
		documentElement: new Element('html'),
		domain: 'www.paypal.com',
		styleSheets: [],
	};
	
	var XHR = function(){
		this.method = "POST";
		this.url = '';
		this.headers = {Referer: loginPage};
		this.body = '';

		this.open = function(method, url){
			this.method = method;
			this.url = joinUrl(baseurl, url);
		}

		this.setRequestHeader = function(name, val){
			this.headers[name] = val;
		}

		this.send = function(body){
			try{
				AnyBalance = ABSave;
				this.body = body;
				AnyBalance.trace('Requesting ' + this.url + ' with ' + body);
				AnyBalance.requestPost(this.url, body, addHeaders(this.headers), {HTTP_METHOD: this.method});
			}finally{
				AnyBalance = undefined;
			}
		}
	}

	function createGetInterceptor(target, objectName){
		return typeof Proxy != 'undefined' ? new Proxy(target, {
			get: function(target, name, receiver) {
       			ABSave.trace('get was called for: ' + objectName + '.' + name);
       			if(!isset(target[name]))
       				ABSave.trace('!!!!!!!!!!!!!! ' + objectName + '.' + name + ' is undefined!!!!!!!!!!!!!!!!!!!!!');
       			return target[name];
   			}
   		}) : target;
	}

	var win = {
		document: createGetInterceptor(doc, 'document'),
		XMLHttpRequest: createGetInterceptor(XHR, 'XHR'),
		navigator: createGetInterceptor({
			appName: 'Netscape',
			userAgent: g_headers['User-Agent'],
		}, 'navigator'),
		screen: createGetInterceptor({
			height: 1080,
			width: 1920,
		}, 'screen'),
		innerWidth: 913,
		innerHeight: 680,
		location: createGetInterceptor({
			host: "www.paypal.com"
		}, 'location'),
		console: createGetInterceptor({
			log: AnyBalance.trace
		}, 'console'),
	};

	var winProxy = createGetInterceptor(win, 'window');

	script += "\nreturn typeof autosubmit != 'undefined' ? autosubmit : undefined;";

	this.document = win.document;
	this.window = winProxy;

	var autosubmit = safeEval(replaceAll(script, [
		/\bdata;/, 'return;',
		/\\x5c\\x77\\x2b\\x20\\x2a\\x5c\\x28\\x5c\\x29\\x20\\x2a\\x7b\\x5c\\x77\\x2b\\x20\\x2a\\x5b\\x27\\x7c\\x22\\x5d\\x2e\\x2b\\x5b\\x27\\x7c\\x22\\x5d\\x3b\\x3f\\x20\\x2a\\x7d/ig, '.*',
		/\\x28\\x5c\\x5c\\x5b\\x78\\x7c\\x75\\x5d\\x28\\x5c\\x77\\x29\\x7b\\x32\\x2c\\x34\\x7d\\x29\\x2b/ig, '.*'
	]), 'window,document,XMLHttpRequest,screen,navigator,location', [winProxy, win.document, win.XMLHttpRequest, win.screen, win.navigator, win.location]);
	AnyBalance.trace('autosubmit = ' + autosubmit);

	//Строго требуется капча...
	formParams.captchaRequired = !!mainDiv.style.display || (autosubmit === false);

	return formParams;
}

function faceChallenge(html, baseurl){
	var challengeUrl = getParam(html, null, null, /data-ads-challenge-url="([^"]*)/i, replaceHtmlEntities);
	if(!challengeUrl){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Could not find challenge url. Is site changed?');
	}
	var loginPage = AnyBalance.getLastUrl();

	challengeUrl = joinUrl(baseurl, challengeUrl);

	AnyBalance.trace('challange url: ' + challengeUrl);
	var script = AnyBalance.requestGet(challengeUrl, addHeaders({'X-Requested-With': 'XMLHttpRequest', Referer: loginPage}));

	executeChallenge(script, baseurl, loginPage);
}

function faceCaptchaChallenge(json, baseurl, loginPage, debugId){
	AnyBalance.trace('Challenge in: ' + JSON.stringify(json));

	var form = getElement(json.htmlResponse, /<form[^>]+proceed/i);//, [/<noscript>[\s\S]*?<\/noscript>/ig, '']); 
	if(!form){
		AnyBalance.trace(json.htmlResponse);
		throw new AnyBalance.Error('Could not find captcha form. Is site changed?');
	}

	var captchaRequired = !/data-disable-autosubmit="false"/i.test(json.htmlResponse);

	var params = AB.createFormParams(form);
	if(captchaRequired){
		AnyBalance.trace('Captcha is required');
		params.recaptcha = solveRecaptcha('Please, prove you are not a robot', baseurl, '6LepHQgUAAAAAFOcWWRUhSOX_LNu0USnf7Vg6SyA');
	}
	
	var submitUrl = getParam(form, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
	if(!submitUrl){
		AnyBalance.trace(json.htmlResponse);
		throw new AnyBalance.Error("Could not find captcha submit url. Is the site changed?");
	}

	html = AnyBalance.requestPost(joinUrl(baseurl, submitUrl), params, addHeaders({
		Accept: 'application/json, text/javascript, */*; q=0.01',
		Referer: loginPage,
		Origin: baseurl,
		'X-Requested-With': 'XMLHttpRequest',
		'x-pp-ads-client-context': 'ul',
		'x-pp-ads-client-context-data': '{"contextCorrelationId":"' + debugId + '"}'
	}));

	AnyBalance.trace('Challenge out: ' + html);
	json = getJson(html);
	return json;
}

function getBalanceInfo(html){
	var json = getParam(html, null, null, /data-balance="([^"]*)/i, replaceHtmlEntities, getJson);
	if(!json){
		var currencies = getElement(html, /<div[^>]+balanceInCurrencies[^>]*>/i);
		if(currencies){
			AnyBalance.trace('Данные вернулись в html, преобразовываем в json');
			var balances = [];
			var elems = getElements(currencies, /<li[^>]*>/ig);
			for(var i=0; i<elems.length; ++i){
				var curr = getElement(elems[i], /<[^>]*countryCurrencyCode[^>]*>/i, replaceTagsAndSpaces);
				var amount = getElement(elems[i], /<[^>]*countryCurrencyAmount[^>]*>/i, replaceTagsAndSpaces, parseBalance);
				balances.push({currency: curr, available: {amount: amount}});
			}
			json = {balanceDetails: balances};
		}
	}
	if(!json){
		var info = getJsonObject(html, /var\s+__REACT_ENGINE__\s*=\s*/i);
		if(info){
			AnyBalance.trace('Данные вернулись в React Engine json, преобразовываем');
			var balances = [];
			for(var i=0; i<info.balance.balances.length; ++i){
				var curr = info.balance.balances[i].currency;
				var amount = info.balance.balances[i].availableBalance.total.amount;
				balances.push({currency: curr, available: {amount: amount}});
			}
			json = {balanceDetails: balances};
		}
	}
	return json;
}

function handleStepUpErrors(data){
	if(data.errors){
		for(var err in (data.errors.fieldError || {})){
			var e = data.errors.fieldError[err];
			throw new AnyBalance.Error(e.msg);
		}
		AnyBalance.trace(JSON.stringify(data.errors));
		throw new AnyBalance.Error('Error during stepup. Is site changed?');
	}
}

function faceStepUp(json, baseurl, loginPage){
	var url = joinUrl(baseurl, json.returnUrl);
	var html = AnyBalance.requestGet(url, addHeaders({Referer: loginPage}));

	var data = getParam(html, null, null, /\bdata-data="([^"]*)/i, replaceHtmlEntities, getJson);
	AnyBalance.trace('StepUp data 1: ' + JSON.stringify(data));
	if(!data){
		var confType = getElement(html, /<div[^>]+callOut/i, replaceTagsAndSpaces);
		AnyBalance.trace(confType + '\n\n' + html);
		throw new AnyBalance.Error('PayPal required an unknown confimation of log in:\n"' + confType + '"\nIs the site changed?');
	}
	handleStepUpErrors(data);

	var sms = data.challengeSetModel.selectOptionList.indexOf('SMS');
	if(sms < 0)
		throw new AnyBalance.Error('PayPal required stepup, but SMS authorization is not available');

	var number = data.challengeSetModel.challengeMap.SMS.verifier[0].value;

	html = AnyBalance.requestPost(joinUrl(baseurl, data.flowExecutionUrl), {
		selectOption: 'SMS',
		textOption: 0,
		jsEnabled: 1,
		execution: data.flowExecutionKey,
		_sms_ivr_continue_btn_label: 'Continue',
		_default_continue_btn_label: 'Continue',
		_eventId_continue: 'Continue'
	}, addHeaders({Referer: AnyBalance.getLastUrl()}));
	
	data = getParam(html, null, null, /\bdata-data="([^"]*)/i, replaceHtmlEntities, getJson);
	AnyBalance.trace('StepUp data 2: ' + JSON.stringify(data));
	handleStepUpErrors(data);

	html = AnyBalance.requestPost(joinUrl(baseurl, data.flowExecutionUrl), {
		selectOption: data.challengeSetModel.inputModel.selectOption,
		verificationCode: AnyBalance.retrieveCode('PayPal required SMS authorization to log in to your account. Please enter verification SMS sent to ' + number, null, {inputType: 'number', time: 300000}),
		jsEnabled: 1,
		execution: data.flowExecutionKey,
		_sms_ivr_continue_btn_label: 'Continue',
		_default_continue_btn_label: 'Continue',
		_eventId_continue: 'Continue'
	}, addHeaders({Referer: AnyBalance.getLastUrl()}));
	
	data = getParam(html, null, null, /\bdata-data="([^"]*)/i, replaceHtmlEntities, getJson);
	AnyBalance.trace('StepUp data 3: ' + JSON.stringify(data));
	handleStepUpErrors(data);

}

function getJsonBalances(baseurl){
	var prefs = AnyBalance.getPreferences();
	var html = AnyBalance.requestGet(baseurl + '/myaccount/wallet', g_headers);
	var jsonBalances = getBalanceInfo(html);
	if(!jsonBalances){
		var loginPage = AnyBalance.getLastUrl();
	    
		var debugId = AnyBalance.getLastResponseHeader('Paypal-Debug-Id');
		if(debugId) debugId = debugId.replace(/,.*/, '');
	    
		faceChallenge(html, baseurl);
	    
		var form = getElement(html, /<form[^>]+name="login"[^>]*>/i);
		if(!form){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Could not find login form. Is the site changed?');
		}
	    
		var params = AB.createFormParams(form, function(params, str, name, value) {
			if (name == 'login_email') {
				return prefs.login;
			} else if (name == 'login_password') {
				return prefs.password;
			}
	    
			return value;
		});
	    
		params.bp_mid = 'v=1;a1=na~a2=na~a3=na~a4=Mozilla~a5=Netscape~a6=5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1~a7=20030107~a8=na~a9=true~a10=~a11=true~a12=Win32~a13=na~a14=Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1~a15=false~a16=ru~a17=na~a18=www.paypal.com~a19=na~a20=na~a21=na~a22=na~a23=414~a24=736~a25=24~a26=736~a27=na~a28=' + new Date() + '~a29=3~a30=na~a31=yes~a32=na~a33=yes~a34=no~a35=no~a36=yes~a37=no~a38=online~a39=no~a40=Win32~a41=yes~a42=no~';
	    
		AnyBalance.sleep(2000);
	    
		html = AnyBalance.requestPost(baseurl + '/signin', params, addHeaders({
			Accept: 'application/json, text/javascript, */*; q=0.01',
			Referer: loginPage,
			Origin: baseurl,
			'X-Requested-With': 'XMLHttpRequest',
			'x-pp-ads-client-context': 'ul',
			'x-pp-ads-client-context-data': '{"contextCorrelationId":"' + debugId + '"}'
		}));

		var json = getJson(html), cnt = 3;
		while(json.htmlResponse){
			if(cnt-- <= 0){
				AnyBalance.trace(JSON.stringify(json));
				throw new AnyBalance.Error('Could not pass captcha challenge...');
			}
			AnyBalance.trace('Пытаемся пройти captcha challenge (осталось ' + cnt + ' попыток...');
			json = faceCaptchaChallenge(json, baseurl, loginPage, debugId);
		}

		if(json.notifications){
			AnyBalance.trace('There are some notifications: ' + JSON.stringify(json.notifications));
			var n = json.notifications;
			if(n.type == 'notification-critical')
				throw new AnyBalance.Error(n.msg);
		}

		if(json.safeRequired){
			throw AnyBalance.Error('PayPal required to change password.');
		}

		if(json.stepupRequired){
			faceStepUp(json, baseurl, loginPage);
		}

		html = AnyBalance.requestGet(baseurl + '/myaccount/wallet', addHeaders({Referer: loginPage}));
		jsonBalances = getBalanceInfo(html);

		if(!jsonBalances){
			AnyBalance.trace('Got json on enter: ' + JSON.stringify(json));
			AnyBalance.trace("wallet page: " + html);
			return jsonBalances;
		}

		AnyBalance.saveCookies();
		AnyBalance.saveData();
		__setLoginSuccessful();
	}else{
		AnyBalance.trace('Вошли через существующую сессию');
	}

	return jsonBalances;
}

function logInSite(){
	AnyBalance.trace('Пытаемся зайти через сайт...');

	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.paypal.com';
	
	g_headers = {
		Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
		'Accept-Language': 'ru,en-US;q=0.8,en;q=0.6',
		'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
	};

	AnyBalance.restoreCookies();

	var jsonBalances = getJsonBalances(baseurl);
	if(!jsonBalances){
		AnyBalance.trace('Could not enter PayPal. Let us try once more...');
		jsonBalances = getJsonBalances(baseurl);
	}

	if(!jsonBalances){
		throw new AnyBalance.Error('Could not find PayPal balance...');
	}
	
	var result = {success: true};
	
	for(var i=0; i<jsonBalances.balanceDetails.length; i++) {
		var curr = jsonBalances.balanceDetails[i];
		if(curr.currency == 'USD') {
			getParam(curr.available.amount, result, 'balance', null, null, parseBalance);
		} else if(curr.currency == 'EUR') {
			getParam(curr.available.amount, result, 'balance_eur', null, null, parseBalance);
		} else if(curr.currency == 'SEK') {
			getParam(curr.available.amount, result, 'balance_sek', null, null, parseBalance);
		} else if(curr.currency == 'RUB') {
			getParam(curr.available.amount, result, 'balance_rub', null, null, parseBalance);
		}else{
		    AnyBalance.trace('Unknown currency ' + curr.currency + ': ' + JSON.stringify(curr));
		}
	}

	result.__tariff = prefs.login;
	
    AnyBalance.setResult(result);
}


function logInOpenAuth(){
	AnyBalance.trace('Пытаемся зайти через OAuth...');

	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://api.paypal.com/v1/';
	if(prefs.__dbg)
		g_headers.Origin = null; //Для отладчика

	var html = AnyBalance.requestPost(baseurl + 'oauth2/token', {
		grant_type:	'client_credentials'
    }, addHeaders({
    	Authorization: 'Basic ZDNhYWNmNDUwZGQ2YWE5OTJjZmJhNzcwNjc1NjA3MzM6N2NlYmJhMWJmMTRjYjg1OA=='
    }));

    var json = getJson(html);

	html = AnyBalance.requestPost(baseurl + 'oauth2/login', {
		email:	prefs.login,
		grant_type:	'password',
		password:	prefs.password,
		redirect_uri:	'https://www.paypalmobiletest.com'
    }, addHeaders({
    	Referer: baseurl + 'oauth2/token',
    	Authorization: 'Bearer ' + json.access_token
    }));

    json = getJson(html);
    if(!json.access_token || json.error){
    	if(json.error)
    		throw new AnyBalance.Error(json.error_description||json.error, null, /invalid_user/i.test(json.error));
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

	html = AnyBalance.requestGet(baseurl + 'wallet/@me/financial-instruments', addHeaders({
		Referer: baseurl + 'oauth2/login',
    	Authorization: 'Bearer ' + json.access_token
    }));

    json = getJson(html);
	var result = {success: true};
	
	for(var i=0; i<json.account_balance.balances.length; i++) {
		var curr = json.account_balance.balances[i];
		if(curr.currency == 'USD') {
			getParam(curr.available.total.amount, result, 'balance', null, null, parseBalance);
		} else if(curr.currency == 'EUR') {
			getParam(curr.available.total.amount, result, 'balance_eur', null, null, parseBalance);
		} else if(curr.currency == 'SEK') {
			getParam(curr.available.total.amount, result, 'balance_sek', null, null, parseBalance);
		} else if(curr.currency == 'RUB') {
			getParam(curr.available.total.amount, result, 'balance_rub', null, null, parseBalance);
		}else{
		    AnyBalance.trace('Unknown currency ' + curr.currency + ': ' + JSON.stringify(curr));
		}
	}

	result.__tariff = prefs.login;
	
    AnyBalance.setResult(result);

}

function generateHex(mask, digits){
	var i=0;
	return mask.replace(/x/ig, function(){
		return digits[i++];
	});
}

function makeGuid(hash){
	return hash.replace(/(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, '$1-$2-$3-$4-$5');
}

function getAuthChecksum(cac, timestamp){
	var prefs = AnyBalance.getPreferences();
	var data = [];
	data.push(cac.appName);
	data.push(cac.appGuid);
	data.push(cac.visitorId);
	data.push(prefs.login);
	data.push(prefs.password.substr(0, 3));
	data.push(timestamp);
	
	var hash = CryptoJS.SHA256(data.join(''));
	return CryptoJS.enc.Base64.stringify(hash);
}

function hex_md5(str){
	return CryptoJS.MD5(str).toString();
}

function logInAPI(prefs) {
	var baseurl = 'https://api-m.paypal.com/v1/';
	var hex = hex_md5(prefs.login + ' android_id');

	var deviceId = hex.substr(0, 16);
	var visitId = 'd3aacf450dd6aa992cfba77067560733'; //В программе клиенте это хардкод
	var bssid = generateHex('5c:f4:ab:xx:xx:xx', hex.substr(16, 6));
	var mac = generateHex('98:0d:2e:xx:xx:xx', hex.substr(22, 6));
	var imei = generateImei(prefs.login, '35721005******L');
	var simsn = generateSimSN(prefs.login, '897019913********L');
	var pairing_id = hex_md5(prefs.login + ' pairing id'); 
	var gsfid = hex_md5(prefs.login + ' gsf id').substr(0, 16); 
	var linkerid = makeGuid(hex_md5(prefs.login + ' linker_id'));
	var appguid = "636cdf5c-585f-4e3f-bf8f-33df6454b526"; //makeGuid(hex_md5(prefs.login + ' app_guid'));
	var risk_session = makeGuid(hex_md5(prefs.login + ' risk session'));
	var timestamp = new Date().getTime();
	var ip = "192.168.1." + Math.floor(30 + Math.random()*30);

	g_headers['paypal-client-metadata-id'] = '8bd1708fcfe7493ab8c07e9e1452681c';

	
	var cac = {
  		"deviceLanguage": "ru",
  		"deviceNetworkType": "Unknown",
  		"deviceLocale": "ru_RU",
  		"deviceNetworkCarrier": "Unknown",
  		"deviceModel": "HTC Desire 600 dual sim",
  		"visitId": "d3aacf450dd6aa992cfba77067560733",
  		"sdkVersion": "2.5.9.2",
  		"usageTrackerSessionId": "07164020",
  		"appName": "com.paypal.android.p2pmobile",
  		"deviceMake": "HTC",
  		"deviceOSVersion": "4.1.2",
  		"appVersion": "6.4.2",
  		"deviceType": "Android",
  		"visitorId": deviceId,
  		"appGuid": appguid,
  		"deviceId": deviceId,
  		"deviceOS": "Android"
	};

	var deviceInfo = {
  		"is_device_simulator": false,
  		"device_os": "Android",
  		"device_model": cac.deviceModel,
  		"device_os_version": "4.1.2",
  		"device_name": "cp3dug",
  		"device_identifier": deviceId,
  		"device_type": "Android",
  		"pp_app_id": "APP-3P637985EF709422H",
  		"device_key_type": "ANDROIDGSM_UNDEFINED"
	};

	var timestamp = new Date().getTime();
	var json = requestAPI('post', baseurl + 'mfsauth/proxy-auth/token', {
		adsChallengeId:	'0ce844f8-381d-40ab-9fbb-0b00d6c26d7c',
		appInfo:	JSON.stringify({"app_version":cac.appVersion,"app_category":"3","client_platform":"AndroidGSM","device_app_id":"PayPal"}),
		authNonce:	getAuthChecksum(cac, timestamp),
		compatProgress:	'IC_ER-DC_AF-8',
		deviceInfo:	JSON.stringify(deviceInfo), //'{"is_device_simulator":false,"device_os":"Android","device_model":"HTC Desire 600 dual sim","device_os_version":"4.1.2","device_name":"cp3dug","device_identifier":deviceId,"device_type":"Android","pp_app_id":"APP-3P637985EF709422H","device_key_type":"ANDROIDGSM_UNDEFINED"}',
		email:	prefs.login,
		firstPartyClientId:	'd3aacf450dd6aa992cfba77067560733',
		grantType:	'password',
		password:	prefs.password,
		redirectUri:	'http://authenticator.live.paypal.com/response.jsp',
		rememberMe:	'false',
		riskData:	JSON.stringify({
  			"sms_enabled": true,
  			"app_first_install_time": 1468234707906,
  			"location": {
  			  "timestamp": timestamp - Math.round(Math.random() * 1000000), //До 15 мин раньше запроса
  			  "acc": 23.3 + Math.round(Math.random()*100)/1000,
  			  "lng": 37.5 + Math.round(Math.random()*1000000)/10000000,
  			  "lat": 55.8 + Math.round(Math.random()*1000000)/10000000
  			},
  			"source_app": 0,
  			"conf_url": "https:\/\/www.paypalobjects.com\/webstatic\/risk\/dyson_config_android_v3.json",
  			"is_rooted": false,
  			"network_operator": "",
  			"payload_type": "full",
  			"ip_addrs": "192.168.1.34",
  			"app_version": cac.appVersion,
  			"is_emulator": false,
  			"source_app_version": cac.appVersion,
  			"conn_type": "WIFI",
  			"comp_version": "3.5.4.release",
  			"os_type": "Android",
  			"timestamp": 1468867638611, //Math.ceil(Math.random()*3), //На пару миллисекунд раньше посылки апроса
  			"risk_comp_session_id": risk_session,//"c0d4da0b-0e77-423e-b6d6-4a1843ae3484",
  			"android_id": deviceId,
  			"app_last_update_time": 1468867256162,
  			"device_model": cac.deviceModel,
  			"device_name": deviceInfo.device_name,
  			"sim_serial_number": simsn,
  			"sim_operator_name": "Beeline",
  			"ssid": "Krawlly",
  			"roaming": false,
  			"ds": false,
  			"device_uptime": 549400000 + Math.round(Math.random()*10000),
  			"phone_type": "unknown (5)",
  			"mac_addrs": mac,
  			"dc_id": "bfa4741e045caec0b9ec1f33933e7122",
//  			"proxy_setting": "host=192.168.1.48,port=8888",
  			"subscriber_id": "250991613654679",
  			"ip_addresses": [
  			  "192.168.1.34"
  			],
  			"device_id": imei,
  			"app_guid": cac.appGuid,
  			"locale_lang": "ru",
  			"serial_number": "FA37WWB01680",
  			"os_version": "4.1.2",
  			"locale_country": "RU",
  			"bssid": bssid,
  			"pairing_id": "6af64f13a75e46f7933bfcaff58eba3b",
  			"tz": 10800000,
  			"linker_id": linkerid,
  			"pm": "bf137b47",
  			"conf_version": "3.0",
  			"app_id": "com.paypal.android.p2pmobile",
  			"total_storage_space": 5044297728,
  			"tz_name": "East Africa Time"
		}),
		timeStamp:	timestamp

	}, addHeaders({
		'X-PayPal-ConsumerApp-Context': encodeURIComponent(JSON.stringify(cac)),
		'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
	}));

	cac.visitId = json.result.firstPartyUserAccessToken.tokenValue;
	cac.riskVisitorId = json.result.riskVisitorId;
	
	json = requestAPI('get', baseurl + 'mwf/wallet/@me/paypal-account', null, addHeaders({
		'Authorization': json.result.firstPartyUserAccessToken.tokenType + ' ' + json.result.firstPartyUserAccessToken.tokenValue,
		'X-PayPal-ConsumerApp-Context': encodeURIComponent(JSON.stringify(cac))

	}));
	
	var result = {success: true};
	
	for(var i=0; i<json.result.balance.currencyBalances.length; i++) {
		var curr = json.result.balance.currencyBalances[i];
		if(curr.currencyCode == 'USD') {
			getParam(curr.available.value/curr.available.scale, result, 'balance');
		} else if(curr.currencyCode == 'EUR') {
			getParam(curr.available.value/curr.available.scale, result, 'balance_eur');
		} else if(curr.currencyCode == 'SEK') {
			getParam(curr.available.value/curr.available.scale, result, 'balance_sek');
		} else if(curr.currencyCode == 'RUB') {
			getParam(curr.available.value/curr.available.scale, result, 'balance_rub');
		}else{
		    AnyBalance.trace('Unknown currency ' + curr.currencyCode + ': ' + JSON.stringify(curr));
		}
	}

	result.__tariff = json.result.details.displayName;
	
    AnyBalance.setResult(result);
}

function requestAPI(method, url, params, headers) {
	if(method == 'post')
		var html = AnyBalance.requestPost(url, params, headers);
	else
		var html = AnyBalance.requestGet(url, headers);
	
	json = getJson(html);
	if(!json.access_token && (!json.result || json.result.code)) {
		var error = (json.result && json.result.message) || json.message;
		if(error)
			throw new AnyBalance.Error(error, null, /проверьте свои данные|Invalid user credentials/i.test((json.result && json.result.debugMessage) || error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Error calling API method!');
	}
	
	return json;
}
