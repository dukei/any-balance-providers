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

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lk.lukoil-garant.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(/^\d{11}$/.test(prefs.login), 'Не верный формат СНИЛС. Укажите 11 цифр без тире и пробелов, например 01234567891!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestGet(baseurl + '/ajax/get1.ashx', g_headers);

	var sesId = AnyBalance.requestGet(baseurl + '/ajax/get1.ashx', addHeaders({
		'X-Requested-With': 'XMLHttpRequest'
	}));

	if(!html.length)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestGet(baseurl + 
		'/ajax/conn1.ashx?pbs2=0&id=' + sesId +
		'&name=' + prefs.login +
		'&pwd=' + prefs.password,  
		addHeaders({
		'X-Requested-With': 'XMLHttpRequest'
	}));

	if(html !== '1'){
		if(html === '0')
			throw new AnyBalance.Error('Неверный СНИЛС или пароль.', null, null, true);
		else if(html === '-1')
			throw new AnyBalance.Error('Нет доступа в личный кабинет. Обратитесь, пожалуйста, на "Горячую линию" НПФ "ЛУКОЙЛ-ГАРАНТ" по телефону: 8-800-200-5-999 (Звонок бесплатный).');
		else if(html === '-2')
			throw new AnyBalance.Error('Разрешение ПФР на перевод средств накопительной части Вашей трудовой пенсии в НПФ "Лукойл-гарант" еще не получено.');
		else
			throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestGet(baseurl + '/Details.aspx', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /SALDO>([^&]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'account', /PRZY_NUMER>([^&]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /PRZY_STATUS>([^&]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}