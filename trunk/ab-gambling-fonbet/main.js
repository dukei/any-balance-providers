/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Баланс в букмекерской конторе FonBet
Сайт оператора: http://fonbet.com
Личный кабинет: https://account.fonbet.com
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Cache-Control':'max-age=0',
'Connection':'keep-alive',
'Origin':'https://account.fonbet.com',
'Referer':'https://account.fonbet.com/MyAccount/faces/login.xhtml',
'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.52 Safari/537.17'
};

function main(){
	var prefs = AnyBalance.getPreferences();
	var domain = prefs.region;

	var baseurl = 'https://account.fonbet.com/MyAccount/faces/';
	AnyBalance.setDefaultCharset('utf-8');

    // Заходим на главную страницу
	var html = AnyBalance.requestGet(baseurl + 'login.xhtml', g_headers);
	
	var captchaa;
	if(AnyBalance.getLevel() >= 7) {
		AnyBalance.trace('Пытаемся ввести капчу');
		AnyBalance.setOptions({forceCharset:'base64'});
		var href = getParam(html, null, null, /captcha[^>]*src="\/([^"]+)/i) || '';
		var captcha = AnyBalance.requestGet('https://account.fonbet.com/' + href);
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
		AnyBalance.setOptions({forceCharset:'utf-8'});
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	
	html = AnyBalance.requestPost(baseurl + 'login.xhtml', {
		'login:loginForm':'login:loginForm',
		'login:loginForm:loginField':prefs.login,
		'login:loginForm:passwordField':prefs.password,
		'login:loginForm:submitButton':'Войти',
		'login:loginForm:captcha:capInput': captchaa,
		'javax.faces.ViewState':getParam(html, null, null, /<input[^>]+name="javax.faces.ViewState"[^>]*value="([^"]*)/i, null, html_entity_decode)
	}, g_headers);
	
	//Выход|Logout
    if(!/(?:&#1042;&#1099;&#1093;&#1086;&#1076;|Logout)\s*<\/a>/i.test(html)){
		var error = getParam(html, null, null, /<li[^>]+class="messagesError"[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
		
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
	var result = {success: true};

	//Баланс|Balance
	getParam(html, result, 'balance', /(?:&#1041;&#1072;&#1083;&#1072;&#1085;&#1089;|Balance)[\s\S]*?<span[^>]+class="fontBold"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'pin', /&#1053;&#1086;&#1084;&#1077;&#1088; &#1089;&#1095;&#1077;&#1090;&#1072;:([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /&#1053;&#1086;&#1084;&#1077;&#1088; &#1089;&#1095;&#1077;&#1090;&#1072;:([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
};