/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36',
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Encoding': 'gzip, deflate, br',
	'Accept-Language': 'ru,en-US;q=0.8,en;q=0.6'
};

function redirectIfNeeded(html){
	var form;
	while(form = getElement(html, /<form[^>]+id="(?:fmHF|redirectForm)"[^>]*>/i)){
 	 	if(form){
 	 		var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
 	 		html = AnyBalance.requestPost(action, createFormParams(form), addHeaders({Referer: AnyBalance.getLastUrl()}));
 	 	}
 	}
 	return html;
}

function main() {
 	var prefs = AnyBalance.getPreferences();

    AnyBalance.setOptions({cookiePolicy: 'netscape'});
	
	checkEmpty(prefs.login, 'Please, enter login!');
	checkEmpty(prefs.password, 'Please, enter password!');	
	
 	AnyBalance.setDefaultCharset('utf-8');
 	var baseLogin = 'https://login.live.com/', info = '';

 	var info = AnyBalance.requestGet(baseLogin, g_headers);
 	var json = getJsonObject(info, /var\s+ServerData\s*=\s*/);
 	if (!json){ 
		AnyBalance.trace(info);
		throw new AnyBalance.Error("Can`t find server data. Is site changed or down?");
	}
	var ts = +new Date();

 	var params = {
		loginfmt: prefs.login,
		login:	prefs.login,
		passwd: prefs.password,
		type:	11,
		PPFT:	getParam(json.sFTTag, null, null, /<input[^>]+value="([^"]*)/i, replaceHtmlEntities),
		PPSX:	'Pass',
		NewUser:	1,
		LoginOptions:	3,
		FoundMSAs: '',
		fspost:	0,
		i2:	1,
		i16: JSON.stringify({"navigationStart":ts,"unloadEventStart":ts+210,"unloadEventEnd":ts+210,"redirectStart":0,"redirectEnd":0,"fetchStart":ts+1,"domainLookupStart":ts+1,"domainLookupEnd":ts+1,"connectStart":ts+1,"connectEnd":ts+1,"secureConnectionStart":0,"requestStart":ts+6,"responseStart":ts+7,"responseEnd":ts+9,"domLoading":ts+13,"domInteractive":ts+263,"domContentLoadedEventStart":ts+263,"domContentLoadedEventEnd":ts+263,"domComplete":ts+287,"loadEventStart":ts+287,"loadEventEnd":0}),
		i17:	0,
		i18:	'__DefaultLoginStrings|1,__DefaultLogin_Core|1,',
//		i19:	26815
		i21:	0 	
	};

 	info = AnyBalance.requestPost(json.urlPost, params, addHeaders({Referer: baseLogin}));
 	info = redirectIfNeeded(info);

 	var json = getJsonObject(info, /var\s+\$Config\s*=\s*/);
 	var jsonErr = getJsonObject(info, /var\s+ServerData\s*=\s*/);

 	if (!json && (!/logout/i.test(info) || (jsonErr && jsonErr.sErrTxt))) { //В некоторых аккаунтах почему-то нет Config, но есть логаунт (<html data-role-name="MeePortal")
 		var error = jsonErr && jsonErr.sErrTxt;
 		if (error)
			throw new AnyBalance.Error(replaceAll(error, replaceTagsAndSpaces), null, /существует|exists|парол|password/i.test(error)); //Надо бы и другие языки поддержать, конечно, но хотя бы 2
		AnyBalance.trace(info);
 		throw new AnyBalance.Error("Can`t login in skype account. Maybe site is changed?");
 	}

 	info = AnyBalance.requestGet('https://secure.skype.com/portal/overview', g_headers);
 	var clientId = getParam(info, /client_id(?:=|%(?:25)?3d)([^&%"]*)/i, decodeURIComponent);
 	if(!clientId){
 		AnyBalance.trace("Trying to get client_id from last url");
 		clientId = getParam(AnyBalance.getLastUrl(), /client_id(?:=|%(?:25)?3d)([^&%"]*)/i, decodeURIComponent);
 	}
 	if(!clientId){
 		AnyBalance.trace(info);
 		throw new AnyBalance.Error('Could not find login parameter (client_id). Is the site changed?');
 	}
/*
	var ts = +new Date();	
 	info = AnyBalance.requestGet('https://login.skype.com/login/silent?response_type=postmessage&client_id=111111&redirect_uri=https%3A%2F%2Flogin.skype.com%2Flogin&state=silentloginsdk_' + ts + '&_accept=1.0&_nc=' + ts + '&partner=999&profile=true', addHeaders({Referer: AnyBalance.getLastUrl()}));
 	info = redirectIfNeeded(info);
*/ 
    info = AnyBalance.requestGet('https://login.skype.com/login/oauth/microsoft?mssso=1&client_id=' + clientId + '&redirect_uri=https%3A%2F%2Fsecure.skype.com%2Fportal%2Flogin%3Freturn_url%3Dhttps%253A%252F%252Fsecure.skype.com%252Fportal%252Foverview', addHeaders({Referer: AnyBalance.getLastUrl()}));
 	info = redirectIfNeeded(info);

 	if (!/overviewSkypeName/i.test(info)) {
 		var form = getElement(info, /<form[^>]+iAccrualForm/i);
 		if(form){
 			AnyBalance.trace('We need to agree with smth');
 			var params = createFormParams(form);
 			var action = joinUrl(AnyBalance.getLastUrl(), getParam(form, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities));
 			AnyBalance.trace('Agreeing to ' + action);
 			info = AnyBalance.requestPost(action, params, addHeaders({Referer: AnyBalance.getLastUrl()}));
 			info = redirectIfNeeded(info);
 		}
 	}

 	if (!/overviewSkypeName/i.test(info)) {
	 	var json = getJsonObject(info, /var\s+\$Config\s*=\s*/);
	 	if(json && json.WLXAccount && json.WLXAccount.confirmIdentity){
	 		//Need otp authorization
	 		throw new AnyBalance.Error('Skype required additional authorization. Please login to Skype with browser (https://skype.com) first.');
	 	}

 		var error = getElement(info, /<div[^>]+message_error[^>]*>/i, [/<div[^>]+messageIcon[^>]*>[\s\S]*?<\/div>/ig, '', replaceTagsAndSpaces], html_entity_decode);
 		if (error)
			throw new AnyBalance.Error(error, null, /your password|ваш пароль|введіть пароль/i.test(error)); //Надо бы и другие языки поддержать, конечно, но хотя бы 3

	 	var json = getJsonObject(info, /var\s+ServerData\s*=\s*/);
	 	if(json && json.H){ //Проверим, не послан ли одноразовый код
	 		for(var i=0; i<json.H.length; ++i){
	 			var otc = json.H[i];
	 			if(otc.otcEnabled)
	 				AnyBalance.trace('Отправка кода на ' + otc.display + ' допустима');
	 			if(otc.otcSent){
	 				sentTo = otc.display;
	 				AnyBalance.trace('Код на ' + otc.display + ' ОТПРАВЛЕН');
	 			}
	 		}
	 		if(i >= json.H.length)
	 			throw new AnyBalance.Error('You have enabled 2-step authorization. Please turn it off to use this provider');
	 	}

		AnyBalance.trace(info);
 		throw new AnyBalance.Error("Can`t redirect to skype account. Maybe site is changed?");
 	}

 	var result = {success: true, subscriptions: 0};
	
 	getParam(info, result, 'balance', /class="credit(?:[\s\S]*?<span[^>]*>){3}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
 	getParam(info, result, ['currency', 'balance'], /class="credit(?:[\s\S]*?<span[^>]*>){3}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseCurrencyMy);
 	getParam(info, result, 'subscriptions', /asideSkypeSubscription[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
 	sumParam(info, result, 'minsLeft', /<span[^>]+class="(?:minsLeft|link)"[^>]*>([\s\S]*?)<\/span>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
 	getParam(info, result, 'landline', /<li[^>]+class="landline"[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
 	getParam(info, result, 'sms', /<li[^>]+class="sms"[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
 	getParam(info, result, 'wifi', /<li[^>]+class="wifi"[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, '__tariff', /<div\s+id="overviewSkypeName"[^>]*>([^<]*)/i, replaceTagsAndSpaces);
 	
	if (AnyBalance.isAvailable('inactivein', 'inactivedate')) {
 		info = AnyBalance.requestGet('https://secure.skype.com/portal/settings/credit/reactivate?setlang=ru');
 		//По-русски дата странная, типа Декабрь 5, 2017
 		var date = getParam(info, null, null, /<span[^>]+class="expiryDate"[^>]*>([\s\S]*?)<\/span>/i, [replaceTagsAndSpaces, /([а-я]+)\s+(\d+)/i, '$2 $1'], parseDateWord);
 		if (date) {
 			if (AnyBalance.isAvailable('inactivedate'))
				result.inactivedate = date;
 			if (AnyBalance.isAvailable('inactivein'))
				result.inactivein = Math.ceil((date - (new Date().getTime())) / 86400 / 1000);
 		} else {
 			AnyBalance.trace('Can`t find inactive date.');
 		}
 	}
 	AnyBalance.setResult(result);
}

function parseCurrencyMy(text) {
 	var match = /(\S*?)\s*-?\d[\d.,]*\s*(\S*)/i.exec(text);
 	if (match) {
 		var first = match[1];
 		var second = match[2];
 	} else {
 		AnyBalance.trace('Couldn`t parse currency from: ' + text);
 		return text;
 	}
 	var val = getParam(first || second, null, null, null, replaceTagsAndSpaces);
 	AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
 	return val;
}