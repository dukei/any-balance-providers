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
	var baseurl = 'http://cbilling.net/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	if(!prefs.dbg) {
		var html = AnyBalance.requestGet(baseurl + '?mode=auth', g_headers);
		
		var captchaa, challenge, site;
		if(AnyBalance.getLevel() >= 7){
			AnyBalance.trace("Пытаемся ввести капчу");
			var captchascript = AnyBalance.requestGet(getParam(html, null, null, /<script[^>]*src="(https:\/\/www.google.com\/recaptcha\/api\/challenge[^"]*)/i), g_headers);
			
			challenge = getParam(captchascript, null, null, /challenge\s*:\s*'([^']*)/i, replaceTagsAndSpaces);
			site = getParam(captchascript, null, null, /site\s*:\s*'([^']*)/i, replaceTagsAndSpaces);
			
			//https://www.google.com/recaptcha/api/image?c=03AHJ_VuuzqNlBBECwEQGKOXBge-m_CxMRdNu9fcuFbOerxQt5RURzXmCdP-cKgAYBJ4xdpNwO9WRlfoUfNFygz-UV4v03Z41GI6XWioxMy-uxJFQNUtQ9qNtQ3ytOMOjFZwPNRICHfapiiRUsN9_8CW_j54wyjGbujg
			AnyBalance.setOptions({FORCE_CHARSET: 'base64'});
			var captcha = AnyBalance.requestGet('https://www.google.com/recaptcha/api/image?c=' + challenge + '&k=' + site, g_headers);
			captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
			AnyBalance.setOptions({FORCE_CHARSET: null});
			AnyBalance.trace('Капча получена: ' + captchaa);
		}else{
			throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
		}

		html = AnyBalance.requestPost(baseurl + '?mode=auth', {
			'recaptcha_challenge_field':challenge,
			'recaptcha_response_field':captchaa,
			'do':'Войти',
			login:prefs.login,
			password:prefs.password,
		}, addHeaders({Referer: baseurl + '?mode=auth'}));
		
		if(!/mode=logout/i.test(html)) {
			//AnyBalance.trace(html);
			// Требуется подтверждение
			if(/Лицензионное соглашение/i.test(html))
				throw new AnyBalance.Error('Вам необходимо подтвердить лицензионное соглашение!');
			if(/Проверьте ввод кода с картинки/i.test(html))
				throw new AnyBalance.Error('Вы ввели неверные символы с картинки!');
			var error = getParam(html, null, null, /<div[^>]+class=["']MessageError["'][^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
			if(error)
				throw new AnyBalance.Error(error, null, /Проверьте логин и пароль/i.test(error));
				
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
	}
	
	html = AnyBalance.requestGet(baseurl + 'index.php?mod=idx', addHeaders({'Referer': 'http://cbilling.net/index.php?mode=browser'}));
	
    var result = {success: true};
	
	getParam(html, result, 'balance', /Ваш баланс:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /Ваш баланс:([^<]*)/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, '__tariff', /<fieldset[^>]*>[^>]*>Ваши пакеты(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'date', /<fieldset[^>]*>[^>]*>Ваши пакеты(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDateISO);
	getParam(html, result, 'server', /Ваш сервер:([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'days', /Осталось дней([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}