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

function getFormId(html) {
	return getParam(html, null, null, /name="form_build_id"[^>]*value="([^"]+)"[^>]*>[^>]*form-individual/i);
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://beltelecom.by/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер телефона!');
	checkEmpty(prefs.surname, 'Введите фамилию!');
	
	var html = AnyBalance.requestGet(baseurl + 'subscribers/phone-debt', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'subscribers/phone-debt', {
		'phone_bill[cityin]':prefs.region || 16,
		'phone_bill[region]':'',
		'phone_bill[phone]':prefs.login,
		'phone_bill[surname]':prefs.surname,
		'op':'Показать',
		'form_build_id':getFormId(html),
		'form_id':'beltelirc_form_individual',
	}, addHeaders({Referer: baseurl + 'subscribers/phone-debt'}));
	
	if (!/Абонент:/i.test(html)) {
		var error = getParam(html, null, null, /"messages error"([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /не существуют/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Общая сумма неоплаченных услуг:([^>]*>){4}/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}