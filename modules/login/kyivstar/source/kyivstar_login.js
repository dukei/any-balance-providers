/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
Киевстар мобильная связь и интернет
*/

var g_headers = {
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36',
	Connection: 'keep-alive'
};

var g_gwtCfg = {
	url: 'https://account.kyivstar.ua/cas/auth/',
	strong_name: '\\b%VARNAME_BROWSER%],(\\w+)\\)',
	auth_nocache: 'auth.nocache.js',
	magic_id: '42A93AE1AF903071A2E23DF4809A02D0'
};

function isLoggedIn(html) {
	return isLoggedInOld(html) || isLoggedInNew(html) || isNewDemo(html);
}

function isLoggedInOld(html) {
	return /\/tbmb\/logout\/perform/i.test(html);
}

function isNewDemo(html){
	return /<a[^>]+new.kyivstar.ua\/ecare\/[^>]+ks-button/i.test(html);
}

function isLoggedInNew(html){
	return /var\s+pageData\s*=/.test(html);
}

function checkGwtError(html) {
	try {
		return gwtGetJSON(html);
	} catch (e) {
		if (/AccountException\$Type\/603172321/i.test(e.message))
			throw new AnyBalance.Error('Превышено количество не успешных попыток входа. Ваша учетная запись временно заблокирована. Блокировка будет снята автоматически через 180 минут');
		if (/accountNotFound|AccountException|passwordNotFound/i.test(e.message))
			throw new AnyBalance.Error('Пользователь с таким логином не найден!', null, true);
		throw e;
	}
}

function initializeLogin() {
	var prefs = AnyBalance.getPreferences();

	checkEmpty(prefs.login,
		'Введите номер вашего телефона для входа в Мой Киевстар (в формате +380ХХХХХХХХХ), например +380971234567');
	checkEmpty(prefs.password, 'Введите пароль!');

	AnyBalance.setOptions({
		SSL_ENABLED_PROTOCOLS: ['TLSv1'] // https://my.kyivstar.ua очень смущается от присутствия TLSv1.1 и TLSv1.2
	});
}

function isThereLoginForm(html){
	var form = getElement(html, /<form[^>]+id="auth-form"[^>]*>/i);
	return form;
}

function loginBasic(html) {
	var prefs = AnyBalance.getPreferences();
	var referer = AnyBalance.getLastUrl();

	var form = isThereLoginForm(html);
	if (!form) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}

	AnyBalance.trace('форма входа найдена');


	var strongName = gwtLoadStrongName(g_gwtCfg),
		checkRequest =
		'7|0|6|%url%|%magic_id%|ua.kyivstar.cas.shared.rpc.AuthSupportRPCService|getAccountShortDetails|java.lang.String/2004016611|%LOGIN%|1|2|3|4|1|5|6|',
		authRequest =
		'7|0|9|%url%|%magic_id%|ua.kyivstar.cas.shared.rpc.AuthSupportRPCService|authenticate|java.lang.String/2004016611|Z|%LOGIN%|%PASSWORD%|https://account.kyivstar.ua/cas/login?service=http%3A%2F%2Fmy.kyivstar.ua%3A80%2Ftbmb%2Fdisclaimer%2Fshow.do&locale=ua#password:|1|2|3|4|5|5|5|5|6|5|7|8|0|0|9|';
		authRequestCaptcha =                                                                                                                                                                                                                                                               
		'7|0|10|%url%|%magic_id%|ua.kyivstar.cas.shared.rpc.AuthSupportRPCService|authenticate|java.lang.String/2004016611|Z|%LOGIN%|%PASSWORD%|%RECAPTCHA%|https://account.kyivstar.ua/cas/login?service=http%3A%2F%2Fmy.kyivstar.ua%3A80%2Ftbmb%2Fdisclaimer%2Fshow.do&locale=ua#password:|1|2|3|4|5|5|5|5|6|5|7|8|9|0|10|';
	//Проверяем телефон
	//https://account.kyivstar.ua/cas/auth/authSupport.rpc
	// html = AnyBalance.requestPost(g_gwtCfg.url + 'cas/auth/authSupport.rpc',
	html = AnyBalance.requestPost(g_gwtCfg.url + 'authSupport.rpc',
		makeReplaces(checkRequest, g_gwtCfg).replace(/%LOGIN%/g, gwtEscape(prefs.login)),
		gwtHeaders(strongName, g_gwtCfg));

	var types = {
		msisdn: 'MSISDN_PASSWORD',
		fttb: 'ACCOUNT_PASSWORD'
	};

	var type = getParam(html, null, null, /"([^"]*)"\]/i, replaceSlashes);
	if (!types[type]) {
		AnyBalance.trace('Неизвестный тип входа: ' + type + '\n' + html);
		type = 'msisdn';
	}

	var json = checkGwtError(html), recaptchaResponse;
	if (json[12] >= 3){
		AnyBalance.trace('Потребовалась рекапча...');
		recaptchaResponse = solveRecaptcha('К сожалению, Киевстар потребовал ввода капчи для этого номера. Решите её или зайдите в личный кабинет один раз через браузер.',
			referer, "6LdmHxMTAAAAAOC1FPK3u0jx00AbkUj_OvQXN0yR");
	}

	//Получаем токен для входа
	// html = AnyBalance.requestPost(g_gwtCfg.url + 'cas/auth/authSupport.rpc',
	AnyBalance.trace('Получаем токен для входа...');
	html = AnyBalance.requestPost(g_gwtCfg.url + 'authSupport.rpc',
		makeReplaces(recaptchaResponse ? authRequestCaptcha : authRequest, g_gwtCfg)
			.replace(/%LOGIN%/g, gwtEscape(prefs.login.replace(/\D+/g, '')))
			.replace(/%PASSWORD%/g, gwtEscape(prefs.password))
			.replace(/%RECAPTCHA%/g, gwtEscape(recaptchaResponse || '')),
		gwtHeaders(strongName, g_gwtCfg));

	checkGwtError(html);

	var token = getParam(html, null, null, /AuthResult[^"]*","([^"]*)/, replaceSlashes);

	if (!token) { //Токен не получаем в случае неверного пароля
		throw new AnyBalance.Error('Персональный пароль указан неверно!', null, true);
	}


	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'username')
			return prefs.login.replace(/\D+/g, '');
		else if (name == 'password')
			return prefs.password;
		else if (name == 'authenticationType')
			return types[type];
		else if (name == 'rememberMe')
			return "false";
		else if (name == 'token') {
			return token;
		}

		return value;
	});

	var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
	AnyBalance.trace('Завершаем вход...');
	html = AnyBalance.requestPost(joinUrl(referer, action), params, addHeaders({
		Referer: referer
	}));

	var domain = getParam(referer, null, null, /https?:\/\/[^\/]*/i);
	if (AnyBalance.getLastUrl().indexOf(domain) === 0) { //если остались на сайте авторизации
		AnyBalance.trace('Переадресовали на ' + AnyBalance.getLastUrl() + ':\n' + html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	AnyBalance.trace('В результате входа перешли на ' + AnyBalance.getLastUrl());

	return html;
}

function loadAuthorizationPage(paramstr){
	//Куки надо удалить, иначе посчитает, что авторизация уже есть
	clearAllCookies();
	AnyBalance.trace('Удалили все куки');
	var html = AnyBalance.requestGet('https://account.kyivstar.ua/cas/login?' + paramstr, g_headers);
	return html;
}

function goToOldSite(html){
	if(isLoggedInNew(html) || isNewDemo(html)){
		AnyBalance.trace('Новый лк или его реклама, переходим на старый');
		html = AnyBalance.requestGet('https://account.kyivstar.ua/cas/login?service=http%3A%2F%2Fmy.kyivstar.ua%3A80%2Ftbmb%2FMK2.do', g_headers);
	}
	return html;
}

function goToNewSite(html){
	if(!isLoggedInNew(html))
		html = AnyBalance.requestGet('https://new.kyivstar.ua/ecare/', g_headers);
	return html;
}

function goToSite(html){
	if(isNewDemo(html)){
		AnyBalance.trace('Показана страница рекламы нового кабинета, переходим в новый кабинет');
		html = AnyBalance.requestGet('https://new.kyivstar.ua/ecare/', g_headers);
	}
	return html;
}

function loginSite(baseurl) {
	var prefs = AnyBalance.getPreferences();

	initializeLogin();

	AnyBalance.trace('Логин на сайт.');

	AnyBalance.trace('Соединение с ' + baseurl);
	// var html = AnyBalance.requestGet(baseurl + 'tbmb/login/show.do', g_headers);
	var html = AnyBalance.requestGet(baseurl + 'tbmb/disclaimer/show.do', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	AnyBalance.trace('Успешное соединение.');

	function doLogout(html){
		if(isLoggedInNew(html) || isNewDemo(html)){ 
			AnyBalance.trace('Выходим из нового ЛК');
			html = AnyBalance.requestGet('https://new.kyivstar.ua/ecare/logout', g_headers);
		}else{
			AnyBalance.trace('Пытаемся выйти ' + (isLoggedIn(html) ? ' из старого ЛК' : ' (но не залогинены?)'));
			html = AnyBalance.requestGet(baseurl + 'tbmb/logout/perform.do', g_headers);
			var anotherLogoutPage = getParam(html, null, null, /<a[^>]+id="submitBtn"[^>]*href="([^"]*)/i, replaceHtmlEntities);
			if(anotherLogoutPage){
				AnyBalance.trace('Переход на страницу входа.');
				html = AnyBalance.requestGet(anotherLogoutPage, g_headers);
			}
		}
		return html;
	}

	if (isLoggedIn(html)) {
		AnyBalance.trace('Уже в системе.');
  		html = goToSite(html); 
		if (html.indexOf(prefs.login.substr(-10)) < 0) {
			var num = getParam(html, null, null, [/Номер:[\s\S]*?<td[^>]*>([^<]*)/i, /"subscriptionIdentifier"\s*:\s*"([^"]*)/], replaceTagsAndSpaces);
			AnyBalance.trace('Не тот аккаунт, выход (нужно ' + prefs.login + ', вошли на ' + num + ').');
			html = doLogout(html);
		}
	}

	if (!isLoggedIn(html)) {
		if(!isThereLoginForm(html)){ 
			AnyBalance.trace(html); //А то иногда показывается реклама нового ЛК
			AnyBalance.trace('Не найдена форма входа. Выходим и явно переходим на авторизацию.');
			html = doLogout(html);
			AnyBalance.trace('Сейчас мы на ' + AnyBalance.getLastUrl() + '. Переходим на авторизацию.');
			html = loadAuthorizationPage('service=http%3A%2F%2Fmy.kyivstar.ua%3A80%2Ftbmb%2Fdisclaimer%2Fshow.do&locale=ua');
		}
		html = loginBasic(html);
    	html = goToSite(html); 
	}

	if (!isLoggedIn(html)) {
		var error = getParam(html, null, null, /<td[^>]+class="(?:redError|casError)"[^>]*>([\s\S]*?)<\/td>/i,
			replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Перевірте правильність введення логіну|введіть правильний пароль/i.test(
				error));
		if (/<form[^>]+action="[^"]*perform.do"/i.test(html))
			throw new AnyBalance.Error(
				'Киевстар показал форму входа без ошибки. Возможно, вы пытаетесь войти в кабинет через мобильный интернет. На стороне Киевстара сейчас с этим проблема. Попробуйте обновить провайдер через вайфай.'
			);

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в систему. Сайт изменен?');
	}

	AnyBalance.trace('Успешный вход.');

	return html;
}

function loginMobile(baseurl) {
	initializeLogin();

	if (!baseurl)
		baseurl = "https://my.kyivstar.ua/";

	AnyBalance.trace('Логин в мобильное приложение.');
	var html = loadAuthorizationPage('locale=ru_ru&service=https://my.kyivstar.ua/tbmb/_assets_mobconv/portmone/index.html&renew=true&compact=1');

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	AnyBalance.trace('Успешное соединение.');

	html = loginBasic(html);
	return html;
}
