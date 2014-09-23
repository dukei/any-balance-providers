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
	var baseurl = 'https://lk.asvt.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'billing/!w3_p_main.showform?CONFIG=CONTRACT', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	// var params = createFormParams(html, function(params, str, name, value) {
		// if (name == 'userlogin') 
			// return prefs.login;
		// else if (name == 'userpassword')
			// return prefs.password;

		// return value;
	// });
	
	html = AnyBalance.requestPost(baseurl + 'billing/!w3_p_main.showform?CONFIG=CONTRACT', {
        IDENTIFICATION: 'CONTRACT',
        FORMNAME: 'QFRAME',
        BUTTON: 'Войти',
        NAME_PASS: '',
		USERNAME: prefs.login,
		PASSWORD: prefs.password
	}, addHeaders({Referer: baseurl + 'billing/!w3_p_main.showform?CONFIG=CONTRACT'}));
    
	if (!/self\.location\.replace/i.test(html)) {
		var error = getParam(html, null, null, /class=ErrorText[^>]*>([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверное имя|Неверный пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var menu = getParam(html, null, null, /name="menu"\s+src="([^"]+)/i, replaceTagsAndSpaces, html_entity_decode);
    checkEmpty(menu, 'Не удалось найти ссылку на переадресацию, сайт изменен?', true);
    
    html = AnyBalance.requestGet(baseurl + 'billing/!w3_p_main.showform'+menu, g_headers);
    
    var contract = getParam(html, null, null, /\?FORMNAME=QCURRACC&CONTR_ID=\d+[^"']+/i, replaceTagsAndSpaces, html_entity_decode);
    checkEmpty(contract, 'Не удалось найти ссылку на информацию по контракту, сайт изменен?', true);
    
    html = AnyBalance.requestGet(baseurl + 'billing/!w3_p_main.showform'+contract, g_headers);    
    
    
	var result = {success: true};
    
	getParam(html, result, 'balance', /Текущий баланс \(на(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'recommended', /Рекомендуемая сумма платежа:(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'fio', /Абонент:[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'account', /Состояние счёта по договору № (\d+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'phone', /Внутренний идентификатор:(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'state', /Состояние:(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    
	AnyBalance.setResult(result);
}