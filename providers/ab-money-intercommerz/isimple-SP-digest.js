/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Универсальная библиотека для работы с интернет-банкингом от Isimple 
Для работы требуются: enc-base64-min.js, md5.js
*/

var g_headers = {
	'Accept': 'application/json',
	'Accept-Language': 'ru',
	'Connection': 'Keep-Alive',
	'User-Agent': 'Android',
	'Content-Type': 'application/json'
};

function getHTTPDigestPage(baseurl, path, method, authMethod, nc) {
	if(!method)
		method = 'GET';
	if(!authMethod)
		authMethod = 'SP'
	if(!nc)
		nc = '00000000';
	
	var prefs = AnyBalance.getPreferences();
	//Описание HTML Digest: https://ru.wikipedia.org/wiki/%D0%94%D0%B0%D0%B9%D0%B4%D0%B6%D0%B5%D1%81%D1%82-%D0%B0%D1%83%D1%82%D0%B5%D0%BD%D1%82%D0%B8%D1%84%D0%B8%D0%BA%D0%B0%D1%86%D0%B8%D1%8F
	if(method == 'POST') {
		var html = AnyBalance.requestPost(baseurl + path, {}, addHeaders({Authorization: authMethod + ' Digest username="' + prefs.login + '"'}));
	} else {
		var html = AnyBalance.requestGet(baseurl + path, addHeaders({Authorization: authMethod + ' Digest username="' + prefs.login + '"'}));
	}
	
	var info = AnyBalance.getLastResponseHeader('WWW-Authenticate');
	// Не удалось авторизоваться, пользователь не найден
	if(!info) {
		checkForLoginErrors(html);
	}
	var realm = getParam(info, null, null, /realm="([^"]*)/);
	var nonce = getParam(info, null, null, /nonce="([^"]*)/);
	var salt = getParam(info, null, null, /salt="([^"]*)/);
	var spass; //Пароль солим по спец. технологии от iSimple :)
	if (isset(salt)) {
		var saltOrig = CryptoJS.enc.Base64.parse(salt).toString(CryptoJS.enc.Utf8);
		spass = CryptoJS.MD5(prefs.password + '{' + saltOrig + '}');
	} else {
		spass = CryptoJS.MD5(prefs.password);
	}
	var cnonce = CryptoJS.MD5('' + Math.random());
	var ha1 = CryptoJS.MD5(prefs.login + ':' + realm + ':' + spass);
	var ha2 = CryptoJS.MD5(method + ':' + path);
	var response = CryptoJS.MD5(ha1 + ':' + nonce + ':' + nc + ':' + cnonce + ':auth:' + ha2);
	
	if(method == 'POST') {
		html = AnyBalance.requestPost(baseurl + path, {}, addHeaders({Authorization: authMethod + ' Digest username="' + prefs.login + '", realm="' + realm + '", nonce="' + nonce + '", uri="' + path + '", response="' + response + '", qop="auth", nc="' + nc + '", cnonce="' + cnonce + '"'}));
	} else {
		html = AnyBalance.requestGet(baseurl + path, addHeaders({Authorization: authMethod + ' Digest username="' + prefs.login + '", realm="' + realm + '", nonce="' + nonce + '", uri="' + path + '", response="' + response + '", qop="auth", nc="' + nc + '", cnonce="' + cnonce + '"'}));
	}
	
	try {
		var json = getJson(html);
	} catch (e) {
		AnyBalance.trace('Не удалось получить данные по продукту, узнаем почему...');
		checkForLoginErrors(html);
	}
	// Нет такого типа продуктов
	if(!json) {
		throw new AnyBalance.Error('У вас нет выбранного типа продукта.');
	}
	
	if(json.errorText)
		throw new AnyBalance.Error(json.errorText);
	
	// Возвращаем объект
	return json;
}

function checkForLoginErrors(html) {
	var errors = {
		'UsernameNotFoundException':'Такого пользователя не существует!',
		'This request requires HTTP authentication':'Проверьте правильность ввода пароля!'
	}
	
	if(/<h1>Сервер на обслуживании.<\/h1>/.test(html))
		throw new AnyBalance.Error('Приносим свои извинения, сервер находится на обслуживании. Повторите попытку через несколько минут.');
	
	var match = /(UsernameNotFoundException|This request requires HTTP authentication)/i.exec(html);
	
	if(match) {
		var error = errors[match[1]];
		if (error)
			throw new AnyBalance.Error(error, null, true);
	}
	
	// Другие ошибки самого сервера jboss
	var serverInternalError = getParam(html, null, null, /description\s*<\/b>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
	if(serverInternalError)
		throw new AnyBalance.Error('Internal error: ' + serverInternalError);
	
	AnyBalance.trace(html);
	throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
}