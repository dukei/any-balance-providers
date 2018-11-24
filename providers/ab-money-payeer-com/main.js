/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':'ru,en-US;q=0.9,en;q=0.8,ru-RU;q=0.7',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
};

function processLoginResponse(html){
	var json = getJson(html).main;
	if(json && json.location){
		html = AnyBalance.requestGet(json.location, g_headers);
	}else if(json.error){
		var error = json.error, errText = '';
		if(Array.isArray(error)){
			errText = replaceAll(error.reduce(function(prev, cur){return prev += (prev ? ', ' : '') + cur.text}, ''), replaceTagsAndSpaces);
		}else{
			for(var i in error){
				errText += (errText ? ', ' : '') + error[i]; 
			}
		}
		throw new AnyBalance.Error(errText, null, /Login\/Password incorrect|Логин\/Пароль введен неверно|Пользователь не найден|User not found/i.test(errText));
	}else if(json && json.html){
		html = json.html;
	}else{
	    AnyBalance.trace(html);
	    throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	return html;
}

function getSign(html){
	var scr = getParam(html, /<script[^>]*>(\s*var \$\$\$\s*=[\s\S]*?)<\/script>/i, [/\$.modmd5/, 'hex_md5']);
	scr = 'var $$$$$$; ' + scr + '\nreturn $$$$$$;';
	var sgn = safeEval(scr);
	return sgn;
}

function login(baseurl, _html){
	var prefs = AnyBalance.getPreferences();

	var html = AnyBalance.requestGet(baseurl + 'ru/auth/?backurl=%2Fru%2Faccount%2F');

	html = AnyBalance.requestGet(baseurl + 'bitrix/components/payeer/system.auth.form/templates/index_list/ajax.php?cmd=Authorization&backurl=%252Fru%252Fauth%252F%253Fbackurl%253D%25252Fru%25252Faccount%25252F', addHeaders({
		Accept: 'application/json, text/javascript, */*; q=0.01',
		'X-Requested-With': 'XMLHttpRequest',
		Referer: baseurl + 'ru/auth/?backurl=%2Fru%2Faccount%2F'
	}));
	var json = getJson(html);

	//Без загрузки не работает.
	//Ребята, если вы так мешаете роботам, дайте какое-нибудь апи, что ли? Ваши же пользователи хотят баланс смотреть
	AnyBalance.trace('Загрузка бесполезных скриптов...');
	AnyBalance.requestGet(baseurl + 'images/a/pb11.ico', {Referer: 'https://payeer.com/bitrix/templates/difiz_account/css/black.css?1522827325'});
	var script = getParam(json.main.html, /"([^"]+script\.new[^"]*)/, replaceHtmlEntities);
	if(script)
		AnyBalance.requestGet(joinUrl(baseurl, script), {Referer: baseurl + 'ru/account/'});
	var script = getParam(json.main.html, /"([^"]+jquery\.md5[^"]*)/, replaceHtmlEntities);
	if(script)
		AnyBalance.requestGet(joinUrl(baseurl, script), {Referer: baseurl + 'ru/account/'});


	var form = getParam(json.main.html, /<form[^>]+id="(?:auth_captcha|authd)"[^>]*>([\s\S]*?)<\/form>/i);
	
	if(!form) {
		if(/403 Forbidden/i.test(html))
			throw new AnyBalance.Error('Payeer.com на время заблокировал вас. Пожалуйста, подождите часок и попробуйте снова.');
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}

	var params = createFormParams(form);
	params.sign = getSign(json.main.html);
	params.email = prefs.login;
	params.password = prefs.password;
	params['g-recaptcha-response'] = '';

	var need_captcha = getParam(form, /<div[^>]+payeer_captcha[^>]*/i);
	need_captcha = need_captcha && !/hide/i.test(need_captcha);
	var need_recaptcha = getParam(form, /<div[^>]+g-recaptcha-auth[^>]*>/i);
	need_recaptcha = need_recaptcha && !/hide/i.test(need_recaptcha);

	//Действительно, капча, надо попробовать её ввести.
	if(need_captcha){
    	var captcha = AnyBalance.requestGet(baseurl + 'bitrix/tools/captcha.php?captcha_sid=' + params.captcha_sid);
    	captcha = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', captcha);
    	AnyBalance.trace('Капча получена: ' + captcha);
    	params.captcha = captcha;
    }

	if(need_recaptcha){
    	var recaptcha = solveRecaptcha('Пожалуйста, докажите, что вы не робот', baseurl + 'ru/account/', '6Lf_2Q0TAAAAABzDzxrOMAFty0K_OLFDhlu7P7in');
		params['g-recaptcha-response'] = recaptcha;
    }

	html = AnyBalance.requestPost(baseurl + 'bitrix/components/payeer/system.auth.form/templates/index_list/ajax.php', params, addHeaders({
		Referer: baseurl + 'ru/account/',
		Accept: 'application/json, text/javascript, */*; q=0.01',
		'X-Requested-With':'XMLHttpRequest',
		'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
	}));

    json = getJson(html).main;
    if(json.error && json.recaptcha == 'Y'){
    	AnyBalance.trace('Потребовалась ещё и рекапча');
    	var recaptcha = solveRecaptcha('Пожалуйста, докажите, что вы не робот', baseurl + 'ru/account/', '6Lf_2Q0TAAAAABzDzxrOMAFty0K_OLFDhlu7P7in');
		params['g-recaptcha-response'] = recaptcha;

		html = AnyBalance.requestPost(baseurl + 'bitrix/components/payeer/system.auth.form/templates/index_list/ajax.php', params, addHeaders({
			Referer: baseurl + 'ru/account/',
			Accept: 'application/json, text/javascript, */*; q=0.01',
			'X-Requested-With':'XMLHttpRequest',
			'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
		}));
    }

	html = processLoginResponse(html);


	if(/auth_conf/i.test(html)){
		AnyBalance.trace('Подтверждение на e-mail потребовалось...');
		
		var params = createFormParams(html);
		params.verify_code = AnyBalance.retrieveCode('Пожалуйста, введите код, высланный вам на ' + params.send_type + '\n\nВы можете отключить подтверждение авторизации при входе в личном кабинете Payeer.com в настройках на вкладке Безопасность', null, {inputType: 'number', time: 180000});
		params.send_type = undefined;
		
		html = AnyBalance.requestPost(baseurl + 'bitrix/components/payeer/system.auth.form/templates/index_list/ajax.php', params, addHeaders({Referer: baseurl, 'X-Requested-With':'XMLHttpRequest'}));
		html = processLoginResponse(html);
	}

	return html;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://payeer.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	AnyBalance.setCookie('payeer.com', 'BITRIX_SM_LOGIN', prefs.login);
	AnyBalance.setCookie('payeer.com', 'BITRIX_SM_SOUND_LOGIN_PLAYED', 'Y');
	AnyBalance.setCookie('payeer.com', 'BITRIX_SM_SALE_UID', '0');
	
	var incapsule = Incapsule(baseurl + 'ru/account/');
	var html = AnyBalance.requestGet(baseurl + 'ru/account/', g_headers);
	if(incapsule.isIncapsulated(html))
	    html = incapsule.executeScript(html);

	html = login(baseurl, html);

	if (!/logout=yes/i.test(html)) {  //А после капчи уже окончательно проверяем вход.
		var error = getParam(html, null, null, /"form_error"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль|Пользователь не найден|User not found/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};
	
	getParam(html, result, 'acc_num', /<label[^>]*>No. аккаунта[\s\S]*?<span[^>]+class="val"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'rub', /<li[^>]+class="RUB[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'usd', /<li[^>]+class="USD[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'eur', /<li[^>]+class="EUR[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}