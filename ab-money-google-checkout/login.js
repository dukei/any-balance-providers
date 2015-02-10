/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Процедура входа в Google-Аккаунт.
Вынесено в отдельный файл чтобы удобнее было переносить в другие провайдеры.
*/

function isLoginSuccesful(html) {
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<span[^>]+class="errormsg[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		error = getParam(html, null, null, /(<form[^>]+name="verifyForm")|secondfactor/i, replaceTagsAndSpaces, html_entity_decode);
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
	if(/secondfactor/i.test(html)) {
		// throw new AnyBalance.Error('Two-factor authorization is enabled. Just now we can`t deal with this. Login attempt has failed.');
		if(AnyBalance.getLevel() >= 7) {
			AnyBalance.trace('Trying to get code...');
			var promt = getParam(html, null, null, /"deliverymethodcontainer"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
			var code = AnyBalance.retrieveCode(promt || 'Plaese, enter code from Authentificator');
			AnyBalance.trace('Got code: ' + code);
		}
		if(!isset(code))
			throw new AnyBalance.Error('Two-factor authorization is enabled. Just now we can`t deal with this. Login attempt has failed.');
		
		var secTok = getParam(html, null, null, /['"]secTok['"][^>]*value=['"]([^'']+)/i);
		var timeStmp = getParam(html, null, null, /['"]timeStmp['"][^>]*value=['"]([^'']+)/i);
		
		html = AnyBalance.requestPost(baseurlLogin + 'SecondFactor', [
			['checkedDomains', 'youtube'],
			['pstMsg', '0'],
			['timeStmp', timeStmp],
			['secTok', secTok],
			['smsToken', ''],
			['smsUserPin', code],
			['smsVerifyPin', 'Подтвердить'],
			['PersistentOptionSelection', '1'],
			['PersistentCookie', 'on'],
		], addHeaders({Referer: baseurlLogin + 'SecondFactor?checkedDomains=youtube&pstMsg=0'}));
		
		// if(isLoginSuccesful(html)) {
			// // Если вошли, то это повод сохранить все куки чтобы больше не донимать юзера окошками
			// AnyBalance.saveCookies();
			// AnyBalance.saveData();
		// }
	}
	// Еще раз проверим правильность входа
	isLoginSuccesful(html);
	
	AnyBalance.saveCookies();
	AnyBalance.saveData();
	return html;
}