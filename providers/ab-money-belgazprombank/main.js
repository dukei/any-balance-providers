/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.e-bgpb.by/';
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	if(prefs.num && !/\d{4}/.test(prefs.num))
		throw new AnyBalance.Error('Необходимо ввести последние 4 цифры номера карты, по которой вы хотите получить данные.');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'sso/!ClientAuth.Authentication?auth_gui=mobile', {
		sso_p_Login: prefs.login,
		sso_p_Password: prefs.password,
		auth_return_url: '/iPWD/!iSOU.Authentication',
		auth_return_url_mobile: '/miPWD/!iSOU.Authentication',
		auth_login_type: 'PWD'
	}, addHeaders({
		'Content-Type': 'application/x-www-form-urlencoded',
		'Referer': baseurl + 'sso/!ClientAuth.Login?auth_return_url=/iPWD/!iSOU.Authentication&auth_return_url_mobile=/miPWD/!iSOU.Authentication',
	}));

	checkErrors(html);

	html = AnyBalance.requestPost(baseurl + 'miPWD/!iSOU.Authentication', {
		'auth_sid': AnyBalance.getCookie('auth_sid')
	}, addHeaders({
		'Content-Type': 'application/x-www-form-urlencoded',
		'Referer': baseurl + 'sso/!ClientAuth.Authentication?auth_gui=mobile',
	}));

	if (!/logout/i.test(html)) {
		checkErrors(html);
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	fetchCard(html, baseurl, prefs);
}

function fetchCard(html, baseurl, prefs){
	var html = AnyBalance.requestGet(baseurl + 'miPWD/!iSOU.AccList?acc_type=1', g_headers),
		cardRegexp = prefs.num ? '{12}' + prefs.num : '{16}',
		cardInfo = getParam(html, null, null, new RegExp('<div[^>]+class="section"[^>]*>((?:[\\s\\S](?!cardName))*[^\\d]*[\\d*]' + cardRegexp + '[\\s\\S]*?Баланс<\\/a>)', 'i')),
		result = {success: true};

	if(!cardInfo) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.num ? 'карту с последними цифрами ' + prefs.num : 'ни одной карты!'));
	}

	if(isAvailable('balance')){
		var href = getParam(cardInfo, null, null, /<a href=['"]([^'"]*)['"][^<]*title="Баланс"/i, replaceTagsAndSpaces, html_entity_decode);
		if(href){
			html = AnyBalance.requestGet(baseurl + 'miPWD/' + href, g_headers);
			getParam(html, result, 'balance', /Доступно: [^<]+/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'currency', /Доступно: [^<]+/i, replaceTagsAndSpaces, parseCurrency);
		} else {
			AnyBalance.trace('Ошибка при получении ссылки на страницу баланса.');
		}
	}
	
	getParam(cardInfo, result, 'end_date', /Окончание действия[^<]+/i, replaceTagsAndSpaces, parseDate);
	getParam(cardInfo, result, 'cardname', /card_text[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(cardInfo, result, 'cardnum', /cardName[^>]*>([\d*]{16})/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}

function checkErrors(html){
	var error = getParam(html, null, null, /<font[^>]+class="error_text"[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode),
		isFatal = /Незарегистрированное имя пользователя/i.test(error) || /Неправильный пароль/i.test(error);

	if(error)
		throw new AnyBalance.Error(error, null, isFatal);
}