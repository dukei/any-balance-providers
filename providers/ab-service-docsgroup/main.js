/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	if (prefs.cab=='direct') {
		var baseurl = 'http://direct.docs-group.ru/';
		var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
		
		var params = createFormParams(html, function(params, str, name, value) {
			if (name == 'LOGIN') 
				return prefs.login;
			else if (name == 'PASSWORD')
				return prefs.password;
			return value;
		});

		var captchaa;
		if(AnyBalance.getLevel() >= 7){
			AnyBalance.setOptions({forceCharset: 'base64'});
			AnyBalance.trace('Пытаемся ввести капчу');
			var captcha = AnyBalance.requestGet(baseurl + 'bitrix/tools/captcha2.php?captcha_sid=' + captcha_sid, g_headers);
			captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
			AnyBalance.setOptions({forceCharset: 'utf-8'});
			AnyBalance.trace('Капча получена: ' + captchaa);
		}else{
			throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
		}
		html = AnyBalance.requestPost(baseurl + 'bot', {
				'CAPTCHA_CID': captcha_sid,
				'CAPTCHA_CODE': captchaa,
			}, addHeaders({Referer: baseurl + 'bot'}));
		
		html = AnyBalance.requestPost(baseurl + 'login/', params);
		var captcha_sid = getParam(html, null, null, /name="captcha_sid"\s*value="([\s\S]*?)"/i);
		AnyBalance.trace(captcha_sid);
    
	
		
		if(!/login\/out/i.test(html)){
			var error = getParam(html, null, null, /placeholder="([^a-z]+)"/, replaceTagsAndSpaces, html_entity_decode);
			if(error)
				throw new AnyBalance.Error(error);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет, проверьте логин или пароль. Сайт изменен?');
		}
		var result = {success: true};
			getParam(html, result, 'balance', /Баланс счёта: ([\s\S]*?) RUR/i, replaceTagsAndSpaces, parseBalance);
	}
	else {
		var baseurl = 'http://sms.docs-group.ru/';
		var html = AnyBalance.requestPost(baseurl,g_headers);
		
		var params = createFormParams(html, function(params, str, name, value) {
			if (name == 'username') 
				return prefs.login;
			else if (name == 'password')
				return prefs.password;
			return value;
		});
		
		html = AnyBalance.requestPost(baseurl + 'Account/LogOn', params);

		if(!/Выйти/i.test(html)){
			var error = getParam(html, null, null, /<div class="validation-summary-errors"><ul><li>([\s\S]*?)<\/li>/, replaceTagsAndSpaces, html_entity_decode);
			if(error)
					throw new AnyBalance.Error(error);
			
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
		var result = {success: true};

			getParam(html, result, 'balance', /Баланс: <span class="info">([\s\S]*?)\,/i, replaceTagsAndSpaces, parseBalance);
	}

AnyBalance.setResult(result);
	
}