/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Процедура входа в Google-Аккаунт.
Вынесено в отдельный файл чтобы удобнее было переносить в другие провайдеры.
*/

function isLoginSuccesful(html) {
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<span[^>]+id="errormsg[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		error = getParam(html, null, null, /<form[^>]+id="challenge"/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error('This account requires 2-step authorization. Turn off 2-step authorization to use this provider.');
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Can`t log in, is the site changed?');
	}
	return true;
}

function googleLogin(prefs) {
	var baseurlLogin = 'https://accounts.google.com/';
	
	// Прежде чем входить, вынем куки
	// Почему-то иногда падает, завернем
	try {
		AnyBalance.restoreCookies();
	} catch(e) {}
	
	var html = AnyBalance.requestGet(baseurlLogin + 'ServiceLoginAuth', g_headers);
	
	var GALX = getParam(html, null, null, /GALX[^>]*value=['"]([^"']+)/i);
	if(!GALX)
		throw new AnyBalance.Error('Can`t find find login form, please, contact the developers.');
	
	html = AnyBalance.requestPost(baseurlLogin + 'ServiceLoginAuth', {
		'osid': '1',
		'_utf8': '☃',
		'bgresponse': 'js_disabled',
		'pstMsg': '0',
		'dnConn': '',
		'checkConnection': '',
		'checkedDomains': 'youtube',
		'signIn': 'Войти',
		'rmShown': '1',
		'Email': prefs.login,
		'Passwd': prefs.password,
		'GALX': GALX,
		'PersistentCookie': 'yes',
	}, g_headers);
	
	// Двухэтапная авторизация...
	var form = getParam(html, null, null, /<form[^>]+id="challenge"[^>]*>([\s\S]*?)<\/form>/i);
	if(form) {
		// throw new AnyBalance.Error('Two-factor authorization is enabled. Just now we can`t deal with this. Login attempt has failed.');
		if(AnyBalance.getLevel() >= 7) {
			AnyBalance.trace('Trying to get code...');
			var promt = getParam(html, null, null, /<input[^>]+name="Pin"[^>]*placeholder="([^"]*)/i, null, html_entity_decode);
			var code = AnyBalance.retrieveCode(promt || 'Please, enter code from Authentificator');
			AnyBalance.trace('Got code: ' + code);           
		}
		if(!isset(code))
			throw new AnyBalance.Error('Two-factor authorization is enabled. Just now we can`t deal with this. Login attempt has failed.');

		let params = createFormParams(form);
		params.Pin = code;
		
		html = AnyBalance.requestPost(baseurlLogin + 'signin/challenge', params, addHeaders({Referer: baseurlLogin + 'ServiceLoginAuth'}));
		
		// if(isLoginSuccesful(html)) {
			// // Если вошли, то это повод сохранить все куки чтобы больше не донимать юзера окошками
			// AnyBalance.saveCookies();
			// AnyBalance.saveData();
		// }
	}
	// Еще раз проверим правильность входа
	isLoginSuccesful(html);

	//Проверим, не хочет ли гугл проверить данные
	form = getElement(html, /<form[^>]+action="SmsAuthInterstitial"[^>]*>/i);
	if(form){
		AnyBalance.trace('Needs 2-factor parameters review, skipping it to view later');
        let params = createFormParams(html, function(params, str, name, value) {
        	if(/type="submit"/i.test(str) && name != "remind")
        		return; //Только remind - Напомнить позже
         	return value;
        });
		
		html = AnyBalance.requestPost(baseurlLogin + 'SmsAuthInterstitial', params, addHeaders({Referer: AnyBalance.getLastUrl()}));
	}
	
	// Еще раз проверим правильность входа
	isLoginSuccesful(html);

	AnyBalance.saveCookies();
	AnyBalance.saveData();
	return html;
}