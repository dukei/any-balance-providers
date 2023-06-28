/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
};

var serviceNo10 = {
	zavodskoy: 4445641,
	leninskiy: 4445811,
	moskovskiy: 4446041,
	oktjabrskiy: 4445801,
	partizanskiy: 4446051,
	pervomaiskiy: 4445791,
	sovetskiy: 4446061,
	frunzenskiy: 4445821,
	centralniy: 4446031
};

var serviceNo16 = {
	zavodskoy: 4511691,
	leninskiy: 4511711,
	moskovskiy: 4511731,
	oktjabrskiy: 4511681,
	partizanskiy: '',
	pervomaiskiy: 4511701,
	sovetskiy: '',
	frunzenskiy: 4511721,
	centralniy: 4511741
};

var baseurl = 'https://pay.wmtransfer.by';

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите учетный номер ученика!');
	
	var serviceNo, infoText;
	
	if(!/^\d{10}$/.test(prefs.login) && !/^\d{16}$/.test(prefs.login)){
		throw new AnyBalance.Error('Учетный номер ученика должен состоять из 10 или 16 цифр!', null, true);
	}
	
	if(/^\d{10}$/.test(prefs.login)){
	    serviceNo = serviceNo10;
		infoText = '0B0C01CFE8F2E0EDE8E5';
	}else if(/^\d{16}$/.test(prefs.login)){
	    serviceNo = serviceNo16;
		infoText = '0B0C01CFE8F2E0EDE8E52028EAE0F0F2E020F3F7E0F9E5E3EEF1FF29';
	}
	
	var serviceNum = serviceNo[prefs.district];
	
	var html = AnyBalance.requestGet('https://wmtransfer.by/pay.asp', g_headers);
		
    if(!html || AnyBalance.getLastStatusCode() > 400){
	    AnyBalance.trace(html);
	    throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}

	var form = getElement(html, /<form[^>]+id="pay"[^>]*>/i);
	    
	if(!form){
	    AnyBalance.trace(html);
	    throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}

	var params = createFormParams(form, function(params, str, name, value) {

	    return value;
	});
		
	var action = getParam(form, null, null, /<form[\s\S]*?action="([^"]*)/i, replaceHtmlEntities);
	
	html = AnyBalance.requestPost(action, params, addHeaders({
		'Content-Type': 'application/x-www-form-urlencoded', 
		'Origin': 'https://pay.wmtransfer.by', 
		'Referer': 'https://pay.wmtransfer.by/pls/iSOU/!iSOU.ServiceTree'
	}));
		
	var form = getElement(html, /<form[^>]+name="frm"[^>]*>/i);
	    
	if(!form){
	    AnyBalance.trace(html);
	    throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}

	var params = createFormParams(form, function(params, str, name, value) {
	    if (name == 'service_no') {
	    	return serviceNum;
	    } else if (name == 'ExtraInfoText') {
	    	return infoText;
	    }

	    return value;
	});
		
	var action = getParam(form, null, null, /<form[\s\S]*?action="([^"]*)/i, replaceHtmlEntities);
	
	html = AnyBalance.requestPost('https://pay.wmtransfer.by/pls/iSOU/!iSOU.PaymentPrepare', params, addHeaders({
		'Content-Type': 'application/x-www-form-urlencoded', 
		'Origin': 'https://pay.wmtransfer.by', 
		'Referer': 'https://pay.wmtransfer.by/pls/iSOU/!iSOU.ServiceTree'
	}));
		
	var form = getElement(html, /<form[^>]+name="frm"[^>]*>/i);
	    
	if(!form){
	    AnyBalance.trace(html);
	    throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}

	var params = createFormParams(form, function(params, str, name, value) {
	    if (name == 'param2') {
	    	return prefs.login;
	    }

	    return value;
	});
		
	var action = getParam(form, null, null, /<form[\s\S]*?action="([^"]*)/i, replaceHtmlEntities);
	
	html = AnyBalance.requestPost('https://pay.wmtransfer.by/pls/iSOU/!iSOU.PaymentPrepare', params, addHeaders({
		'Content-Type': 'application/x-www-form-urlencoded', 
		'Origin': 'https://pay.wmtransfer.by', 
		'Referer': 'https://pay.wmtransfer.by/pls/iSOU/!iSOU.ServiceTree'
	}));
	
	if(!/!iSOU.PaymentCheck/i.test(html)) {
		var error = getParam(html, null, null, /class="error_text"[^>]*>(?:&lt;)?([\s\S]*?)(?:&gt;)?</i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /номер|не найден/i.test(error));
		
	    AnyBalance.trace(html);
	    throw new AnyBalance.Error('Не удалось получить параметры платежа. Сайт изменен?');
	}
	
	var result = {success: true};
	
	var tablePayment = getParam(html, null, null, /<table[^>]+class=payment[^>]*>([\s\S]*?)<\/table>/i);
    if(!tablePayment){
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не найдена таблица предварительного расчета платежа');
	}
	
	getParam(tablePayment, result, 'balance', /(?:<PRE>)Баланс:([\s\S]*?)\s*?\n/i, replaceTagsAndSpaces, parseBalance);
	getParam(tablePayment, result, 'topay', /Сумма к оплате(?:[\s\S]*?=){3}\s*([\s\S]*?)\s*?\n/i, replaceTagsAndSpaces, parseBalance);
	getParam(tablePayment, result, 'days', /учебных дней(?:[\s\S]*?=)\s*([\s\S]*?)\s*?\n/i, replaceTagsAndSpaces, parseBalance);
	getParam(tablePayment, result, 'norm', /норма в день(?:[\s\S]*?=)\s*([\s\S]*?)\s*?\n/i, replaceTagsAndSpaces, parseBalance);
	getParam(tablePayment, result, 'saldo', /сальдо(?:[\s\S]*?=)\s*([\s\S]*?)\s*?\n/i, replaceTagsAndSpaces, parseBalance);
	getParam(tablePayment, result, 'paid', /оплачено за период(?:[\s\S]*?=)\s*([\s\S]*?)\s*?\n/i, replaceTagsAndSpaces, parseBalance);
	
	var dt = new Date();
	
	var monthes = {0: 'Январь', 1: 'Февраль', 2: 'Март', 3: 'Апрель', 4: 'Май', 5: 'Июнь', 6: 'Июль', 7: 'Август', 8: 'Сентябрь', 9: 'Октябрь', 10: 'Ноябрь', 11: 'Декабрь'}
	getParam(monthes[dt.getMonth()] + ' ' + dt.getFullYear(), result, 'period');
	
	getParam(html, result, '__tariff', /Учетный номер ученика:[\s\S]*?value="([^"]*)/i, replaceTagsAndSpaces);
	getParam(html, result, 'number', /Учетный номер ученика:[\s\S]*?value="([^"]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'code', /Код платежа в бюджет:[\s\S]*?value="([^"]*)/i, replaceTagsAndSpaces);
	
	var person = {};
	sumParam(html, person, '__n', /Фамилия:[\s\S]*?value="([^"]*)/i, replaceTagsAndSpaces, null, create_aggregate_join(' '));
	sumParam(html, person, '__n', /Имя:[\s\S]*?value="([^"]*)/i, replaceTagsAndSpaces, null, create_aggregate_join(' '));
	sumParam(html, person, '__n', /Отчество:[\s\S]*?value="([^"]*)/i, replaceTagsAndSpaces, null, create_aggregate_join(' '));
	getParam(person.__n, result, 'fio');
	
	AnyBalance.setResult(result);
}
