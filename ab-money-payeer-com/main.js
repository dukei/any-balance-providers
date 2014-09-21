/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':'ru,en;q=0.8',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.120 Safari/537.36',
};

var dateServer; //Дата и время загрузки страницы

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://payeer.com';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	AnyBalance.setCookie('payeer.com', 'BITRIX_SM_LOGIN', prefs.login);
	AnyBalance.setCookie('payeer.com', 'BITRIX_SM_SOUND_LOGIN_PLAYED', 'Y');
	AnyBalance.setCookie('payeer.com', 'BITRIX_SM_SALE_UID', '0');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	AnyBalance.requestGet(baseurl + '/images/cms/pb8.ico', g_headers); //Эта штука что-то в сессию пишет, что логин правильный.
	
	dateServer = getParam(html, null, null, /var\s+dateServer\s*=\s*'([^']+)/i);
	
	if(!dateServer) {
		if(/403 Forbidden/i.test(html))
			throw new AnyBalance.Error('Payeer.com на время заблокировал вас. Пожалуйста, подождите часок и попробуйте снова.');
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти системную метку загрузки страницы. Сайт изменен?');
	}
	
	var stT = jQueryEmulator.mdDONWKS();
	AnyBalance.sleep((2 + Math.random()*5)*1000); //Типа, вводим логин-пароль некоторое время.

	var hash = jQueryEmulator.modmd5(String(jQueryEmulator.mdDONWKS()-stT), true, prefs.login);
	
	html = AnyBalance.requestPost(baseurl + '/ajax/index.php', {
		'cmd':'auth_step1',
		'backurl':'',
		'CHPM':hash,
		'email':prefs.login,
		'password':prefs.password,
		'Login':'Войти'
	}, addHeaders({Referer: baseurl, 'X-Requested-With':'XMLHttpRequest'}));
	
	var json = getJson(html);
	if(json.location){
		html = AnyBalance.requestGet(baseurl + json.location, g_headers);
	    AnyBalance.requestGet(baseurl + '/images/cms/pb8.ico', g_headers); //Эта штука, возможно, что-то в сессию пишет, что логин правильный.
	}

	if (!/logout=yes/i.test(html)) {
	    //Не пустили. Но может, капчу надо всё-таки ввести?
	    var csid = getParam(html, null, null, /<input[^>]+name="captcha_sid"[^>]*value="([^"]*)/i, null, html_entity_decode);
	    if(csid){ //Действительно, капча, надо попробовать её ввести.
            if (AnyBalance.getLevel() >= 7) {
            	AnyBalance.trace('Пытаемся ввести капчу');
				var stT = jQueryEmulator.mdDONWKS();

            	var captcha = AnyBalance.requestGet(baseurl + '/bitrix/tools/captcha.php?captcha_sid=' + csid);
            	captcha = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', captcha);
            	AnyBalance.trace('Капча получена: ' + captcha);

				var hash = jQueryEmulator.modmd5(String(jQueryEmulator.mdDONWKS()-stT), true, prefs.login);

				html = AnyBalance.requestPost(baseurl + '/ajax/index.php', {
					'email':prefs.login,
					'password':prefs.password,
					show_captcha:'1',
					captcha_sid: csid,
					captcha_word: captcha,
					Next: 'Войти на сайт',
					'cmd':'auth_step1',
					'backurl':'',
					'CHPM':hash
				}, addHeaders({Referer: baseurl, 'X-Requested-With':'XMLHttpRequest'}));

				var json = getJson(html);
				if(json.location)
					html = AnyBalance.requestGet(baseurl + json.location, g_headers);	
            } else {
            	throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
            }
        }
    }
	

	if (!/logout=yes/i.test(html)) {  //А после капчи уже окончательно проверяем вход.
		var error = getParam(html, null, null, /"form_error"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль|Пользователь не найден/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};
	
	getParam(html, result, 'acc_num', />\s*Номер счета(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'rub', />\s*RUB(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'usd', />\s*USD(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'eur', />\s*EUR(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}