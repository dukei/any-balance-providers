/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
	'X-Requested-With':'XMLHttpRequest'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');	
	
	if(prefs.type == 'inet') {
		mainInet(prefs);
	} else {
		mainTV(prefs);
	}
}

function mainInet(prefs) {
	var baseurl = 'http://inet.itce.ru/';
	var html = AnyBalance.requestPost(baseurl + 'core.php', {
		'host':'inet.itce.ru',
		'options[page]':'billing',
		'module':'inetBilling',
		'account':prefs.login,
		'password':prefs.password,
		'undefined':'Вход',
    }, addHeaders({Referer: baseurl + 'core.php'}));
	
	if(!/>выход<|^ok$/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	html = AnyBalance.requestPost(baseurl + 'core.php', {
		'host':'inet.itce.ru',
		'options[page]':'billing',
		'module':'inetBilling',
    }, addHeaders({Referer: baseurl + 'core.php'}));
	
    var result = {success: true};
	getParam(html, result, 'balance', /Ваш баланс:[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /<h2>([^<.]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}

function mainTV(prefs) {
	var baseurl = 'http://tv.itce.ru/';
	var html = AnyBalance.requestPost(baseurl + 'core.php', {
		'host':'tv.itce.ru',
		'options[page]':'billing',
		'module':'ctvBilling',
		'account':prefs.login,
		'password':prefs.password,
		'undefined':'Вход',
    }, addHeaders({Referer: baseurl + 'core.php'}));
	
	if(!/ok/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	html = AnyBalance.requestPost(baseurl + 'core.php', {
		'host':'tv.itce.ru',
		'options[page]':'billing',
		'module':'ctvBilling',
    }, addHeaders({Referer: baseurl + 'core.php'}));
	
    var result = {success: true};
	getParam(html, result, 'balance', /Ваш баланс:[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /<h2>([^\.]*)\.\s*Договор/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}