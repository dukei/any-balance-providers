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
	var baseurl = 'https://www.manabite.lv/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login?language=ru', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
    var form_build_id = getParam(html, null, null, /"form_build_id"[\s\S]value="([^"]*)/i);
    
	html = AnyBalance.requestPost(baseurl + 'login?language=ru', {
		'login_username': prefs.login,
		'login_password': prefs.password,
        'form_build_id': form_build_id,
        'form_id': 'login_form'
	}, addHeaders({Referer: baseurl + 'login?language=ru'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /messages error(?:[^>]*>){3}([\s\S]*?)<\/div/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль|Неправильное эл.почта или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
    getParam(html, result, 'balance', /Доступный остаток кредита:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'account', /номер предоплаты:(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'expires_date', /Не забудь пополнить до:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);

    if(isAvailable('service_sum') || isAvailable('devices_sum')) {
    
        html = AnyBalance.requestGet(baseurl + 'payments-and-usage/the-current-period?language=ru', g_headers);
        getParam(html, result, 'service_sum', /Общая сумма к оплате за устройствa:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'devices_sum', /Общая сумма к оплате за услуги:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
        
    };
	
	AnyBalance.setResult(result);
}