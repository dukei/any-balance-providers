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
	return getParam(html, null, null, /name="form_build_id"[^>]*value="([^"]+)"/i);
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
	var baseurl = 'https://www.racun.epcg.com/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Enter login!');
	checkEmpty(prefs.meterno, 'Enter meter number!');

	var html = AnyBalance.requestGet(baseurl + 'provjera-racuna', g_headers);

	html = AnyBalance.requestPost(baseurl + 'system/ajax', {
		'home_pretplatni_broj':prefs.login,
		'home_broj_brojila':prefs.meterno,
		'form_build_id':getFormId(html),
		'form_id':'bild_anonymouse_view_bills_view_home_bills_form',
		'_triggering_element_name':'op',
		'_triggering_element_value':'Provjerite vaše stanje'
	}, addHeaders({
		Referer: baseurl + 'provjera-racuna',
		'X-Requested-With':'XMLHttpRequest'
	}));
	
	var json = getJsonEval(html);
	
	if (!json[1].data) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Can`t find information. Is the site changed?');
	}
	
	var result = {success: true};
	
	var data = json[1].data || json[0].data;
	
	AnyBalance.trace(data);
	
	getParam(prefs.meterno, result, 'meter_num');
	// ФИО Dabovic Veselin
	getParam(data, result, 'fio', /<h2>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	//Район страны Sumet
	getParam(data, result, 'adress', /"subitle"([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
	//Всего к уплате –56,1 евро (минус также означает переплату, снимать показание надо с учетом знака перед цифрой)	
	getParam(data, result, 'balance', /"total"([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	//Предыдущий долг –61,67 евро (минус означает переплату, снимать показание надо с учетом знака перед цифрой)
	getParam(data, result, 'lastdebt', /"last-debt"([^>]*>){5}/i, replaceTagsAndSpaces, parseBalance);
	//Cчет за прошедший месяц (в данном случае февраль 2014) 5,57 евро
	getParam(data, result, 'last_bill', /"last-bill"([^>]*>){7}/i, replaceTagsAndSpaces, parseBalance);
	//Месяц счета февраль 2014
	getParam(data, result, 'last_bill_month', /"last-bill"([^>]*>){5}/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}