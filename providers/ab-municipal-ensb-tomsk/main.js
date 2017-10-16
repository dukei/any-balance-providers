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

var baseurl = 'http://www.ensb.tomsk.ru/';

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);

	html = AnyBalance.requestPost(baseurl, {
        'backurl':'/',
        'AUTH_FORM':'Y',
        'TYPE':'AUTH',
        'USER_LOGIN': prefs.login,
        'USER_PASSWORD': prefs.password,
        'Login':'Войти'
	}, addHeaders({Referer: baseurl}));
    
	if (!/logout/i.test(html)) {
		var error = getParam(html, /[^>]+class="errortext"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
    html = AnyBalance.requestGet(baseurl + 'profile/', g_headers);

    var invoice_form = getElement(html, /<form[^>]+id="new_report"/i);
    if(!invoice_form){
        AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось найти форму получения квитанции!');
    }

    var actID = getParam(invoice_form, null, null, /name="actID"[^>]*value="([^"]+)/i, replaceHtmlEntities);
    
    var today = new Date();
    var lastMonth = new Date(today.getFullYear(), today.getMonth()-1, 15);
    var monthNumber = n2(lastMonth.getMonth() + 1);
    var report_year = lastMonth.getFullYear(); 

	var result = {success: true}, pdftext;

	getParam(html, result, 'fio', /<div[^>]+profile-item1[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'acc_number', /Л\/СЧЕТ(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces);

	try{
		pdftext = getBillForPeriod(actID, monthNumber, report_year);
	}catch(e){
		AnyBalance.trace('Не получилось: ' + e.message);
    	lastMonth = new Date(today.getFullYear(), today.getMonth()-2, 15);
    	var monthNumber = n2(lastMonth.getMonth() + 1);
    	var report_year = lastMonth.getFullYear(); 
		pdftext = getBillForPeriod(actID, monthNumber, report_year);
	}

	getParam(monthNumber + '/' + report_year, result, 'period');
	getParam(monthNumber + '/' + report_year, result, '__tariff');
	getParam(pdftext, result, 'balance', /Итого к оплате([^\n]*\d+[^\n*])/i, replaceTagsAndSpaces, parseBalance);
	getParam(pdftext, result, 'balance_water', /\(Факт\)([^\n]*)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}

function getBillForPeriod(actID, monthNumber, report_year){
	AnyBalance.trace('Пытаемся получить квитанцию за ' + monthNumber + '/' + report_year);

    var json = callApi({
		action: 'createReport',
		BC: actID,
		month: monthNumber,
		year: report_year
	});

	var access_token = json.access_token, max_tries = 25;

	for(var i=0; i<max_tries; ++i){
		AnyBalance.sleep(2000);
		json = callApi({action: 'reportState'});
		AnyBalance.trace('Ожидаем ' + (i+1) + '/' + max_tries + ': ' + JSON.stringify(json));
		if(json.state == 'error')
			throw new AnyBalance.Error(json.message);
		if(json.state == 'ready')
			break;
	}

	if(i >= max_tries)
		throw new AnyBalance.Error('Не удалось дождаться формирования квитанции!');

	var pdf = AnyBalance.requestGet(baseurl + '/soap/report.php?access_token=' + access_token, addHeaders({
		Referer: baseurl + 'profile/'
	}), {options: {
		FORCE_CHARSET: 'base64'
	}});

	var pdf2text = new PdfToText();
	var text = pdf2text.convert(pdf);
	return text;
}

function callApi(params){
	var html = AnyBalance.requestGet(baseurl + 'soap/?' + createUrlEncodedParams(params), addHeaders({
		Referer: baseurl + 'profile/',
		'X-Requested-With': 'XMLHttpRequest'
	}));

    var json = getJson(html);
    if(!json.state == 'success'){
    	var error = json.message;
    	if(error)
    		throw new AnyBalance.Error(error);
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось получить квитанцию (' + params.action + ')!'); 
   	}

   	return json;
}