/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function getHTTPDigestPage(baseurl, path){
	var prefs = AnyBalance.getPreferences();

	//Описание HTML Digest: http://ru.wikipedia.org/wiki/%D0%94%D0%B0%D0%B9%D0%B4%D0%B6%D0%B5%D1%81%D1%82_%D0%B0%D1%83%D1%82%D0%B5%D0%BD%D1%82%D0%B8%D1%84%D0%B8%D0%BA%D0%B0%D1%86%D0%B8%D1%8F
	var html = AnyBalance.requestGet(baseurl + path, addHeaders({Authorization: 'SP Digest username="' + prefs.login + '"'}));

        var info = AnyBalance.getLastResponseHeader('WWW-Authenticate');
        var realm = getParam(info, null, null, /realm="([^"]*)/);
        var nonce = getParam(info, null, null, /nonce="([^"]*)/);
        var salt = getParam(info, null, null, /salt="([^"]*)/);

	var spass; //Пароль солим по спец. технологии от iSimple :)
	if(isset(salt)){
        	var saltOrig = CryptoJS.enc.Base64.parse(salt).toString(CryptoJS.enc.Utf8);
		spass = CryptoJS.MD5(prefs.password + '{' + saltOrig + '}');
	}else{
		spass = CryptoJS.MD5(prefs.password);
	}

        var cnonce = CryptoJS.MD5('' + Math.random());
	var ha1 = CryptoJS.MD5(prefs.login + ':' + realm + ':' + spass);
	var ha2 = CryptoJS.MD5('GET:' + path);
	var response = CryptoJS.MD5(ha1 + ':' + nonce + ':00000000:' + cnonce + ':auth:' + ha2);

	html = AnyBalance.requestGet(baseurl + path, addHeaders({Authorization: 'SP Digest username="' + prefs.login + '", realm="' + realm + '", nonce="' + nonce + '", uri="' + path + '", response="' + response + '", qop="auth", nc="00000000", cnonce="' + cnonce + '"'}));
        return html;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://retail.baltica.ru';//'http://test.isimplelab.com:8087/internetbank';
//	var path = '/rest/personal/account'; //?sync_accounts=true
	var pathCards = '/rest/personal/card?sync_cards=true';
	var pathAccounts = '/rest/personal/account?sync_accounts=true';
	var pathDeposits = '/rest/personal/deposit?sync_deposits=true';
	var pathCredits = '/rest/personal/credit?sync_credits=true';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = getHTTPDigestPage(baseurl, pathCards);
	var html = getHTTPDigestPage(baseurl, pathAccounts);
	var html = getHTTPDigestPage(baseurl, pathDeposits);
	var html = getHTTPDigestPage(baseurl, pathCredits);

//	if(AnyBalance.getLastStatusCode() > 400) {
//		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
//	}
/*	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'login', {
		login: prefs.login,
		password: prefs.password,
		'Remember': 'false'
	}, addHeaders({Referer: baseurl + 'login'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'fio', /Имя абонента:(?:[\s\S]*?<b[^>]*>){1}([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'phone', /Номер:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'deadline', /Действителен до:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'status', /Статус:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
*/
}