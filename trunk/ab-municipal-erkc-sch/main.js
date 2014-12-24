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

var g_months = [
	'Январь',
	'Февраль',
	'Март',
	'Апрель',
	'Май',
	'Июнь',
	'Июль',
	'Август',
	'Сентябрь',
	'Октябрь',
	'Ноябрь',
	'Декабрь'
];

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://erkc-sch.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите Имя пользователя!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'modules/alcom_konsalt', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'name') 
			return prefs.login;
		else if (name == 'pass')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'modules/alcom_konsalt?destination=modules/alcom_konsalt', params, addHeaders({Referer: baseurl + 'modules/alcom_konsalt'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /Сообщение об ошибке\s*<\/h2>([^(<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Логин или пароль введены неверно/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(getValue(html, 'Начислени(?:е|я)'), result, 'balance');
	// ИТОГО со страхованием жилья
	getParam(getValue(html, 'Страхование жилья'), result, 'balance_ins');
	// ИТОГО со страх.гражданской ответственности
	getParam(getValue(html, 'Гражданская отвественность'), result, 'balance_go');
	// ИТОГО со страхо.жилья и страх.гражданской ответственности
	getParam(getValue(html, 'Полное страхование'), result, 'balance_total');
	
	// Отчетный период - не правильно работает
	/*var dt = new Date();
	var month = dt.getMonth();
	var year = dt.getFullYear();
	
	if (month != 0)
		var period = g_months[month-1] + ' ' + year;
	else
		var period = g_months[11] + ' ' + (--year);
	
	getParam(period, result, 'period_total');
	getParam(period, result, '__tariff');*/
	
	if(isAvailable(['pay_date', 'pay_sum', 'pay_place'])) {
		html = AnyBalance.requestGet(baseurl + 'modules/alcom_konsalt/payment', g_headers);
		
		var tr = getParam(html, null, null, /<tr>\s*<td[^>]*>\d{1,2}\.\d{1,2}\.\d{4}(?:[^>]*>){5}\s*<\/tr>\s*<\/table/i);
		if(tr) {
			getParam(tr, result, 'pay_date', /\d{1,2}\.\d{1,2}\.\d{4}/i, replaceTagsAndSpaces);
			getParam(tr, result, 'pay_sum', /<tr>\s*(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
			getParam(tr, result, 'pay_place', /<tr>\s*(?:[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces);
		} else {
			AnyBalance.trace('Не удалось найти платежи.');
		}
	}
	
	AnyBalance.setResult(result);
}

function getValue(html, name) {
	var balance = getParam(html, null, null, new RegExp(name + '[^<]*</strong>(?:[^>]*>){5}[^>]*value=([-\\d\\s,."]+)', 'i'), replaceTagsAndSpaces, parseBalance);
	var comission = getParam(html, null, null, new RegExp(name + '[^<]*</strong>(?:[^>]*>){20,30}\\*?Комиссия[^>]*>([^<]+)', 'i'), replaceTagsAndSpaces, parseBalance);
	
	if(isset(balance) && isset(comission))
		return (balance-comission).toFixed(2);
	else
		return 0;
}