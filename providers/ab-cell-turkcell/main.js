/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'utf-8, iso-8859-1, utf-16, *;q=0.7',
	'Accept-Language':'ru-RU, en-US',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Linux; U; Android 4.0.4; ru-ru; Android SDK built for x86 Build/IMM76D) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
	'Origin':'http://m.turkcell.com.tr/',
};

function requestBonuses() {
	return AnyBalance.requestPost('http://m.turkcell.com.tr/accountremainingusage.json?t2=' + new Date().getTime(), {
		'title':'TURKCELL - Hat Özetim',
		'uri':'/accountsummary.aspx',
	}, addHeaders({Referer: 'http://m.turkcell.com.tr/accountsummary.aspx', Accept: 'application/json, text/javascript, */*; q=0.01'}));
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://m.turkcell.com.tr';
	var baseurlApi = 'https://tsdk.turkcell.com.tr';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Enter login!');
	checkEmpty(prefs.password, 'Enter password!');
	
	var html = AnyBalance.requestGet(baseurl + '/giris', g_headers);

	html = AnyBalance.requestPost(baseurlApi + '/SERVICE/AuthAPI/serviceLogin.json', JSON.stringify({
		"appId": "215302", "username": prefs.login, "password": prefs.password, "rememberMe" : "true"
	}), addHeaders({Accept: 'application/json, text/javascript, */*; q=0.01', 'Content-Type': 'application/json', Referer: baseurl + '/giris'}));

	var json = getJson(html);

	if(json.message != 'Success'){
		var error = json.message;
		if(error)
			throw new AnyBalance.Error(error, null, /Lütfen girmiş olduğunuz bilgileri kontrol ederek tekrar deneyiniz/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Can`t login? Is the site changed?');
	}
	
	html = AnyBalance.requestPost(baseurl + '/giris', {
		authToken: json.rememberMeToken,
		clientSecret: json.clientSecret
	}, addHeaders({Referer: baseurl + '/giris'}));
	
	if(!/logout_button/i.test(html)) {
		var error = getElement(html, /<div[^>]+error_main[^>]*>([\s\S]*?)<\/div>/i, [/<a[^>]+type="submit"[^>]*>[^]*?<\/a>/i, '', replaceTagsAndSpaces], html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Can`t login? Is the site changed?');
	}
	
	var result = {success: true};
	// Одинаковые данные для всех линий
	getParam(html, result, 'balance', /<span[^>]+class="price"[^>]*>([^]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'phone', /<div[^>]*media__number[^>]*>([^]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /<div[^>]*media__title[^>]*>([^]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	
	// Для постоплаты, дата платежа и сумма счета
	if(isAvailable(['fatura', 'fatura_date'])) {
		html = AnyBalance.requestGet(baseurl + '/hesabim/faturalar/fatura-ozet', addHeaders({Referer: baseurl + '/giris'}));
		
		getParam(html, result, 'fatura', /Toplam Tutar[^>]*>\s*Son ödeme tarihi(?:[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		if(isset(result.fatura))
			result.balance = undefined;
		
		getParam(html, result, 'deadline', /Son ödeme tarihi([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	}
	
	// Пакеты
	if(isAvailable(['sms_days', 'sms_left', 'sms_total', 'sms_used', 
		'minutes_local_days', 'minutes_local_left', 'minutes_local_total', 'minutes_local_used', 
		'minutes_days', 'minutes_left', 'minutes_total', 'minutes_used', 
		'minutes_group_total', 'minutes_group_used', 'minutes_group_left', 
		'data_days', 'data_left', 'data_total', 'data_used', '__tariff'])) {
		
		html = AnyBalance.requestGet(baseurl + '/hesabim', g_headers);

		sumParam(html, result, 'minutes_local_total', /class="media__body"(?:[\s\S]*?<\/div)(?:[^>]*>){2}TURKCELL'LİLERLE\s*-([^<]*DK)/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
		sumParam(html, result, 'minutes_local_used', /([\d.,]+)(?:<[^<]*){6}TURKCELL'LİLERLE[^<]*DK/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
		sumParam(html, result, 'minutes_local_left', /([\d.,]+)(?:<[^<]*){13}TURKCELL'LİLERLE[^<]*DK/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
		
		sumParam(html, result, 'minutes_total', /class="media__body"(?:[\s\S]*?<\/div)(?:[^>]*>){2}HER YÖNE\s*-([^<]*DK)/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
		sumParam(html, result, 'minutes_used', /([\d.,]+)(?:<[^<]*){6}HER YÖNE[^<]*DK/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
		sumParam(html, result, 'minutes_left', /([\d.,]+)(?:<[^<]*){13}HER YÖNE[^<]*DK/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
		
		sumParam(html, result, 'minutes_group_total', /class="media__body"(?:[\s\S]*?<\/div)(?:[^>]*>){2}GRUP[^-]*-([^<]*DK)/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
		sumParam(html, result, 'minutes_group_used', /([\d.,]+)(?:<[^<]*){6}GRUP[^<]*DK/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
		sumParam(html, result, 'minutes_group_left', /([\d.,]+)(?:<[^<]*){13}GRUP[^<]*DK/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
		// Интернет 
		var dataTable = getParam(html, null, null, /<h3(?:[^>]*>){3}\s*İNTERNET\s*<\/h3>\s*<div[^>]*data-toggle="carousel"[\s\S]*?<\/ul>/i, [/<!--[\s\S]*?-->/ig, '']);
		if(dataTable) {
			sumParam(dataTable, result, 'data_used', /((?:<[^<]*){2})(?:[^>]*>){1}MB KULLANILDI/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
			sumParam(dataTable, result, 'data_left', /((?:<[^<]*){2})(?:[^>]*>){1}MB KALDI/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
			if(isset(result.data_left) && isset(result.data_used))
				getParam(result.data_left+result.data_used, result, 'data_total');
		}
		// SMS
		var smsTable = getParam(html, null, null, /<h3(?:[^>]*>){3}\s*SMS\s*<\/h3>\s*<div[^>]*data-toggle="carousel"[\s\S]*?<\/ul>/i, [/<!--[\s\S]*?-->/ig, '']);
		if(smsTable) {
			sumParam(smsTable, result, 'sms_used', /((?:<[^<]*){2})(?:[^>]*>){1}ADET KULLANILDI/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
			sumParam(smsTable, result, 'sms_left', /((?:<[^<]*){2})(?:[^>]*>){1}ADET KALDI/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
			if(isset(result.sms_left) && isset(result.sms_used))
				getParam(result.sms_left+result.sms_used, result, 'sms_total');
		}

		getParam(html, result, '__tariff', /<div[^>]+credit__tariff[^>]*>([^]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	}
	
    AnyBalance.setResult(result);
}