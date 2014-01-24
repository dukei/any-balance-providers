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

function getViewState(html) {
	return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html) {
	return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://newcab.tbt.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин или номер счета!');
	
	var html = AnyBalance.requestGet(baseurl + 'index.php', g_headers);

	var captchaa;
	var captchaID = getParam(html, null, null, /images\/captcha\/([^.]*)/i);
	
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet(baseurl+ 'images/captcha/' + captchaID + '.png');
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	
	var type = 0;
	
	if(prefs.login && !prefs.password) {
		AnyBalance.trace('Пробуем войти по номеру счета...');
	} else {
		AnyBalance.trace('Пробуем войти по логину и паролю...');
		checkEmpty(prefs.password, 'Введите пароль!');
		type = 1;
	}
	
	html = AnyBalance.requestPost(baseurl + 'index.php', {
		page:'2',
		__EVENTVALIDATION:getEventValidation(html),
		__VIEWSTATE:getViewState(html),
		type:type,
		userlogin:prefs.login,
		userpass: (type == 1 ? prefs.password : ''),
		'captcha[id]':captchaID,
		'captcha[input]':captchaa,
		Submit:'Войти',
		option:'login'
	}, addHeaders({Referer: baseurl + 'index.php'}));

	if (!/Завершить сеанс/i.test(html)) {
		var error = sumParam(html, null, null, /class="error"[^>]*>([^<]*)/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	getParam(html, result, 'account', [/Ваш лицевой счет:[^>]*>([^<]*)/i, /№ Абонемента(?:[^>]*>){17}([^<]*)/i], replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Остаток на счете:[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /size="4"\s*>\s*Баланс(?:[^>]*>){6}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);

	AnyBalance.setResult(result);
}