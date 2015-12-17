/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1',
	Connection: 'keep-alive'
};

var g_gwtCfg = {
	url: 'https://account.kyivstar.ua/cas/auth/',
	strong_name: '\\b%VARNAME%],(\\w+)\\)',
	auth_nocache: 'auth.nocache.js',
}

function isLoggedIn(html){
	return /\/tbmb\/logout\/perform/i.test(html);
}

function login(baseurl) {
	var prefs = AnyBalance.getPreferences();

	checkEmpty(prefs.login, 'Введите номер вашего телефона для входа в Мой Киевстар (в формате +380ХХХХХХХХХ), например +380971234567');
	checkEmpty(prefs.password, 'Введите пароль!');

	AnyBalance.setOptions({
		SSL_ENABLED_PROTOCOLS: ['TLSv1'], // https://my.kyivstar.ua очень смущается от присутствия TLSv1.1 и TLSv1.2
	}); 

	if(!baseurl)
	    baseurl = "https://my.kyivstar.ua/";

	AnyBalance.trace('Соединение с ' + baseurl);
	var html = AnyBalance.requestGet(baseurl + 'tbmb/login/show.do', g_headers);

	var referer = AnyBalance.getLastUrl();

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	AnyBalance.trace('Успешное соединение.');
	if (isLoggedIn(html)) {
		AnyBalance.trace('Уже в системе.');
		if (html.indexOf(prefs.login) < 0) {
			AnyBalance.trace('Не тот аккаунт, выход.');
			html = AnyBalance.requestGet(baseurl + 'tbmb/logout/perform.do', g_headers);
			AnyBalance.trace('Переход на страницу входа.');
			html = AnyBalance.requestGet(baseurl + 'tbmb/login/show.do', g_headers);
		}
	}

	if(!isLoggedIn(html)){
		var form = getElement(html, /<form[^>]+id="auth-form"[^>]*>/i);
		if(!form){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
		}
	    
		var strongName = gwtLoadStrongName(g_gwtCfg),
			authRequest = '7|0|7|%url%|F6A136C7CC1F442D7AC2B3A8D93F065D|ua.kyivstar.cas.shared.rpc.AuthSupportRPCService|authenticate|java.lang.String/2004016611|%LOGIN%|%PASSWORD%|1|2|3|4|3|5|5|5|6|7|0|';
	    
		//Получаем токен для входа
        html = AnyBalance.requestPost(g_gwtCfg.url + 'authSupport.rpc', 
			makeReplaces(authRequest, g_gwtCfg).replace(/%LOGIN%/g, gwtEscape(prefs.login.replace(/\D+/g, ''))).replace(/%PASSWORD%/g, gwtEscape(prefs.password)),
			gwtHeaders(strongName, g_gwtCfg));
	    
		gwtGetJSON(html);
		var token = getParam(html, null, null, /AuthResult.*?","([^"]*)/, replaceSlashes);
	    
		var params = AB.createFormParams(form, function(params, str, name, value) {
			if (name == 'username') 
				return prefs.login.replace(/\D+/g, '');
			else if (name == 'password')
				return prefs.password;
			else if (name == 'authenticationType')
				return "MSISDN_OTP";
			else if (name == 'rememberMe')
				return "false";
			else if (name == 'token'){
				return token;
			}
	    
			return value;
		});
	    
		var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
		html = AnyBalance.requestPost(joinUrl(referer, action), params, addHeaders({Referer: referer}));
	}

	if(!isLoggedIn(html)){
		var error = getParam(html, null, null, /<td[^>]+class="redError"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Перевірте правильність введення логіну|введіть правильний пароль/i.test(error));
		if (/<form[^>]+action="[^"]*perform.do"/i.test(html))
			throw new AnyBalance.Error('Киевстар показал форму входа без ошибки. Возможно, вы пытаетесь войти в кабинет через мобильный интернет. На стороне Киевстара сейчас с этим проблема. Попробуйте обновить провайдер через вайфай.');
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в систему. Сайт изменен?');
	}
	
	AnyBalance.trace('Успешный вход.');

	return html;
}