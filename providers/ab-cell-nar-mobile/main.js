/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.narmobile.az/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Enter login!');
	checkEmpty(prefs.password, 'Enter password!');
	
	var html = AnyBalance.requestGet(baseurl + 'ics/cgi-bin/cgi.exe?function=is_newlog', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

    var cap_href = getParam(html, null, null, /class=dark>\s*?<img src="([^"]+)/i);
    var textTableRecordId = getParam(html, null, null, /name="textTableRecordId"\s*?type="hidden"\s*?value="([^"]+)/i);
    
	var captchaa;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
//		AnyBalance.setOptions({forceCharset: 'base64'});
		var captcha = AnyBalance.requestGet(baseurl + 'ics/cgi-bin/' + cap_href);
//		AnyBalance.setOptions({forceCharset: 'utf-8'});
		captchaa = AnyBalance.retrieveCode("Please, enter the captcha code", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance !');
	}
	
	html = AnyBalance.requestPost(baseurl + 'ics/cgi-bin/cgi.exe?function=is_login', {        
        Lang: '1',
        mobnum: prefs.login,
        Password: prefs.password,
        antispamText: captchaa,
        textTableRecordId: textTableRecordId
	}, addHeaders({Referer: baseurl + 'ics/cgi-bin/cgi.exe?function=is_newlog'}));
    
	if (/class="error"/i.test(html)) {
		var error = getParam(html, null, null, /class="error"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Password is incorrect, or the number is in suspension/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    html = AnyBalance.requestGet(baseurl + 'ics/cgi-bin/cgi.exe?function=is_account', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Actual balance:(?:[^>]*>){3}([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /userPrefs(?:[^>]*>){5}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'phone', /Phone number(?:[^>]*>){3}([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_num', /alt="Account(?:[^>]*>){3}([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'billing_group', /Billing group:(?:[^>]*>){2}([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'pay_method', /Payment method:(?:[^>]*>){2}([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'address', /Actual address:(?:[^>]*>){2}([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /alt="Tariff(?:[^>]*>){3}([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}