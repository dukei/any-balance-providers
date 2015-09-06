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
	var baseurl = 'http://prostokvashino.ru/';
	var replaceFloat = [/\s+/g, '', /,/g, '', /(\d)\-(\d)/g, '$1.$2'];
	function parseBalance(text){
		var _text = text.replace(/\s+/g, '');
		var val = getParam(_text, null, null, /(-?\d[\d\.,\-]*)/, replaceFloat, parseFloat);
		AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
		
		return val;
		}
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	// пробуем войти
	html = AnyBalance.requestPost(baseurl + 'ajax', {method: 'user.login',
											login: prefs.login,
											password: prefs.password,
											remember: 'no',
											captcha: ''},
											addHeaders({Referer: baseurl}));
									
	if (/"captcha"/i.test(html)) {
			// пробуем получить captcha
			var capt = AnyBalance.requestPost(baseurl + 'ajax', {method: 'user.captcha'}, addHeaders({Referer: baseurl}));
			var captchaSrc = getParam(capt, null, null, /"captcha":"[^\/][\S]([^"]+)/i, replaceTagsAndSpaces, html_entity_decode);
			var captchaa = '';
			if(captchaSrc) {
				if(AnyBalance.getLevel() >= 7){
					AnyBalance.trace('Пытаемся ввести капчу');
					var captcha = AnyBalance.requestGet(baseurl + captchaSrc);
					captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
					AnyBalance.trace('Капча получена: ' + captchaa);					
					html = AnyBalance.requestPost(baseurl + 'ajax', {method: 'user.login',
															login: prefs.login,
															password: prefs.password,
															remember: 'no',
															captcha: captchaa},
															addHeaders({Referer: baseurl}));	
				}else{
					throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
				}
			}		
	}	
	
	if (!/"status":0/i.test(html)) {
		var error = getParam(html, null, null, /"msg":[\s\S]+?([^"]+)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error == "captcha")
			throw new AnyBalance.Error('Число с картинки неверно');
		else
			throw new AnyBalance.Error('Логин или Пароль не правильные');
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	} 
	
	html = AnyBalance.requestGet(baseurl + 'user/account', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /balance[\s\S]+?([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /profile_avatar-name[\s\S]+?([^><]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}