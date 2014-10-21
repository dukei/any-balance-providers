/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://my.kaspersky.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + '?logonSessionData=MyAccount&returnUrl=ru', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost('https://uis.kaspersky.com/Logon', {
        failureUrl:'index.html?error=1&logonSessionData=MyAccount&returnUrl=ru%2Factivations&login=' + encodeURIComponent(prefs.login) + '&rememberMe=false',
        returnUrl:'ru/activations',
        logonSessionData:'MyAccount',
		'user': prefs.login,
		'password': prefs.password
	}, addHeaders({Referer: baseurl + '?logonSessionData=MyAccount&returnUrl=ru'}));
	
    var params = createFormParams(html);
    html = AnyBalance.requestPost('https://my.kaspersky.com/', params, addHeaders({Referer: baseurl + '?logonSessionData=MyAccount&returnUrl=ru'}));
    
    html = AnyBalance.requestGet(baseurl, g_headers);
    
    var accId = getParam(AnyBalance.getCookie('MyAccount2'), null, null, /\d+/i);
    checkEmpty(accId , 'Не удалось найти ID аккаунта, сайт изменен?',true);
    
    html = AnyBalance.requestGet(baseurl + 'ru/activations?ajax_block=' + accId + '&_=' + new Date().getTime(), addHeaders({'X-Requested-With':'XMLHttpRequest'}));
    
    var id = prefs.lic_id || '[A-Z0-9]';
    
    var license = getParam(html, null, null, new RegExp('<h2\\s*>[^<]+' + id +'(?:[^>]*>){13}\\s*</div>', 'i'));
    checkEmpty(license , 'Не удалось найти ' + (prefs.lic_id ? 'лицензию с номером ' + prefs.lic_id : 'ни одной лицензии!'),true);

	var result = {success: true};

	getParam(license, result, '__tariff', /<h2\s*>[^<]+/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(license, result, 'devices', /<h2\s*>(?:[^>]*>){6}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(license, result, 'expires_date', /Дата окончания лицензии:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
	
	AnyBalance.setResult(result);
}