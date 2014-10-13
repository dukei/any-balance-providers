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
	var baseurl = 'https://online.cetelem.ru';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.contractNumber, 'Введите номер договора!');
	checkEmpty(prefs.passportNumber, 'Введите номер паспорта!');
	
	var html = AnyBalance.requestGet(baseurl + '/login.jsp', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    
    var params = {
        captchaCode: "",
		contractNumber: prefs.contractNumber,
		mobileNumber: '',
		passportNumber: prefs.passportNumber
	};
    
	html = AnyBalance.requestPost(baseurl + '/cetelemauthservlet', JSON.stringify(params), addHeaders({Referer: baseurl + '/login.jsp'}));
	
    var json = getJson(html);
    
	if (json.state != 'authorized_without_mob') {
		var error = json.err_msg;
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль|не найдена/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
    html = AnyBalance.requestGet(baseurl + json.redirect_url, g_headers);
    
	var result = {success: true};
	
	getParam(html, result, 'balance', /СОБСТВЕННЫЕ СРЕДСТВА(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'account', /Информация по договору №(?:[^>]){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'next_payment_date', /ДАТА СЛЕДУЮЩЕГО ПЛАТЕЖА(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'next_payment_sum', /СУММА СЛЕДУЮЩЕГО ПЛАТЕЖА(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'debt_sum', /СУММА ПРОСРОЧЕННОЙ ЗАДОЛЖЕННОСТИ(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}