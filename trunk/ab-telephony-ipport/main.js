/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html, application/xhtml+xml, */*',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru,en;q=0.8',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.ipport.net/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'json/?cmd=xmlhttp&query=auth&sub=prepare_login&login=' + prefs.login, g_headers);
	
	var json = getJson(html);
	
	var captchaa, captchaParams = '';
	if (json.error_code == 3500) {
		if(AnyBalance.getLevel() >= 7){
			AnyBalance.trace('Пытаемся ввести капчу');
			var captcha = AnyBalance.requestGet(baseurl+ 'json/captcha');
			captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
			AnyBalance.trace('Капча получена: ' + captchaa);
			
			captchaParams = getParam('&captcha=' + captchaa, null, null, null, [/\s/g, '+']);
			
			html = AnyBalance.requestGet(baseurl + 'json/?cmd=xmlhttp&query=auth&sub=prepare_login&login=' + prefs.login + captchaParams, g_headers);
		}else{
			throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
		}
	}
	
	var cnonce = Math.floor(Math.random()*1000000000);
	var nonce = getParam(html, null, null, /"nonce":"([^"]+)/i);
	
	var digest = MD5(MD5(prefs.login + ':' + 'n1' + ':' + prefs.password) + ':' + nonce + ':' + cnonce.toString());

	html = AnyBalance.requestGet(baseurl + '/json/?cmd=xmlhttp&query=auth&sub=login&login='+prefs.login+'&nonce='+nonce+'&cnonce='+cnonce+'&digest='+digest+'&remember_me=0' + prefs.login + captchaParams, g_headers);
	
	var json = getJson(html);
	
	if (json.error_code != 0) {
		var error = json.error_message;
		if (error)
			throw new AnyBalance.Error(error, null, /неверный ID|Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(json.info.BALANCE+'', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.info.DP_NAME, result, '__tariff', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(json.id, result, 'user_id', null, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}