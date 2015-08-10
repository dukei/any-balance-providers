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
	var baseurl = 'https://abonent.redcom.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	//Старый сервер оракл 10g имеет баг в TSL, приходится явно перейти на SSL
	AnyBalance.setOptions({SSL_ENABLED_PROTOCOLS: ['SSLv3']});
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestPost(baseurl + 'fastcom/!w3_p_main.showform?CONFIG=CONTRACT', {
		'IDENTIFICATION':'CONTRACT',
		'USERNAME':prefs.login,
		'PASSWORD':prefs.password,
		'FORMNAME':'QFRAME',
    }, addHeaders({Referer: baseurl + 'fastcom'}));
	
	var href = getParam(html, null, null, /Click[^']*'([^']*QCURRACC[^']*)/i);
	
	if(!href)
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен, либо не верные логин-пароль');

	html = AnyBalance.requestGet(baseurl + 'fastcom/!w3_p_main.showform' + href, g_headers);
	
    var result = {success: true};
	getParam(html, result, 'fio', /Клиент:[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Текущий баланс(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'recomend', /Рекомендуемая сумма платежа[^>]*>\s*<TD[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}