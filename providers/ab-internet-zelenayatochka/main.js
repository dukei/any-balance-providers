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

var g_regions = {
	lipetsk: getUnified,
	stavr: getStavr,
	nal: getNal,
	ufa: getUnified,
	belgorod: getUnified,
	tomsk: getUnified,
	vladivostok: getUnified

};

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	checkEmpty(prefs.region, 'Выберите регион!');
	
	AnyBalance.trace('Регион: ' + prefs.region);
	g_regions[prefs.region](prefs);
}

function getUnified(prefs) {
	var baseurl = 'https://lk.' + prefs.region + '.zelenaya.net/';
	
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	html = AnyBalance.requestPost(baseurl + 'login', {
		user: prefs.login,
		pass: prefs.password,
		uri: '',
		AuthSubmit: 'ВОЙТИ'
	}, addHeaders({Referer: baseurl + 'login'}));

	if (!/logout/i.test(html)) {
		var error = getElement(html, /<div[^>]*alert/i, replaceTagsAndSpaces);
		if(error) {
			throw new AnyBalance.Error(error, null, /пользовател|логин|парол/i.test(error));
        }
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /Клиент:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /Баланс:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cred_balance', /необходимо оплатить:\s*<span[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'acc_num', /Личный счет №([^<]+)/i, replaceTagsAndSpaces);
	getParam(getElement(html, /<div[^>]+tariffBlock/i), result, '__tariff', /<h3[^>]*>([\s\S]*?)<\/h3>/i, [replaceTagsAndSpaces, /^тариф\s*/i, '', /\s+/g, ' ']);
	
	AnyBalance.setResult(result);
}

function getNal(prefs) {
	var baseurl = 'http://abonent.naltel.ru/';
	
	var html = AnyBalance.requestGet(baseurl, g_headers);

	html = AnyBalance.requestPost(baseurl, {
		login: prefs.login,
		password: prefs.password,
	}, addHeaders({Referer: baseurl}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<p style='color:red'>([\s\S]*?)<\//i, replaceTagsAndSpaces);
		if (error && /Неверно указаны логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	getParam(html, result, 'fio', /ФИО(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /Баланс(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cred_balance', /Кредит(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}

function getStavr(prefs) {
	var baseurl = 'https://personal.ooonet.ru/';
	
	var html = AnyBalance.requestGet(baseurl, g_headers);

	html = AnyBalance.requestPost(baseurl, {
		login: prefs.login,
		password: prefs.password,
		uri: '/',
		'submit':'Войти',
	}, addHeaders({Referer: baseurl}));

	if (!/logout/i.test(html)) {
		var error = getElement(html, /<div[^>]+alert/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин\/ЛС или пароль/i.test(error));
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};

	if(/navbar-main-container/i.test(html)){
		//Новый кабинет
	    AnyBalance.trace('Обнаружен новый дизайн');
		getParam(html, result, 'fio', /<span[^>]+navbar-second-user[^>]*>([\s\S]*?)(?:»|<\/span>)/i, [/[«»]+/g, '', replaceTagsAndSpaces]);
		getParam(html, result, 'acc_num', /<span[^>]+account-id[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
		getParam(html, result, 'balance', /<span[^>]+navbar-second-refresh[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	//	getParam(html, result, 'bonuses', /\d+\s*бону/i, replaceTagsAndSpaces, parseBalance);
	//	getParam(html, result, 'cred_balance', /Рекомендуемая сумма к оплате:([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'status', /<span[^>]+navbar-second-is-active[^>]*>([\s\S]*?)<\/span>/i, [/Статус:/ig, '', replaceTagsAndSpaces]);
	}else{
	    AnyBalance.trace('Обнаружен старый дизайн');
		getParam(html, result, 'fio', /<tr[^>]*>((?:[\s\S](?!<\/tr>))*).<\/tr>\s*<tr[^>]*>\s*<td[^>]*>\s*№ счета/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'acc_num', /№ счета([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'balance', /<tr[^>]*>((?:[\s\S](?!<\/tr>))*?).<\/tr>\s*<tr[^>]*>(?:[\s\S](?!<\/tr>))*?refresh\/account/i, replaceTagsAndSpaces, parseBalance);
	//	getParam(html, result, 'bonuses', /\d+\s*бону/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cred_balance', /Рекомендуемая сумма к оплате:([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'status', /Статус([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	}

	AnyBalance.setResult(result);
}