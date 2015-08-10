/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://svet.kaluga.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
		
	var html = AnyBalance.requestGet(baseurl + 'ieps/Login.aspx?ReturnUrl=%2fieps%2f', g_headers);

	var error = getParam(html, null, null, /(Вход в систему временно невозможен.[^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	if(error)
		throw new AnyBalance.Error(error);

	var params = createFormParams(html, function(params, str, name, value){
		if(name == 'ctl00$cphBody$txtAccount')
			return prefs.login;
		if(name == 'ctl00$cphBody$txtPassword')
			return prefs.password;			
		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'ieps/Login.aspx?ReturnUrl=%2fieps%2f', params, addHeaders({Referer: baseurl + 'ieps/Login.aspx?ReturnUrl=%2fieps%2f'}));
	
	if(!/cmdLogoff/i.test(html)) {
		error = getParam(html, null, null, /class="error-text"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error, null, /Неверный номер лицевого счета или пароль/i.test(error));
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    var result = {success: true};
	getParam(html, result, 'acc_num', /Лицевой счет:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Расчетный период[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'counter_end', /Показания счетчика на конец периода[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'counter_last', /Предыдущие показания счетчика[^<]*?(\d+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'potreblenie', /Потребление за период[^<]*?(\d+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance', /Итого к оплате[^>]*>[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'pay_to', /Итого к оплате[^>]*>[^>]*>[^>]*>[^>]*>Оплатить до([^<]*)/i, replaceTagsAndSpaces, parseDate);
	
    AnyBalance.setResult(result);
}