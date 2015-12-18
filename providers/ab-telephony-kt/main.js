/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://abonent.kt.kg/';
	AnyBalance.setDefaultCharset('windows-1251');
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	AnyBalance.setAuthentication(prefs.login, prefs.password);
	var html = AnyBalance.requestGet(baseurl+'pls/webbil/create_session');

	if(!/logout/i.test(html))
	{
		var error = getParam(html, null, null, /<\/h1>([\s\S]*?)<p/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
		AnyBalance.trace(html);
		throw new AnyBalance.Error("Не удалось войти в личный кабинет. Сайт изменен?")
	}

	var result = {success: true};

	getParam(html, result, 'accountNumber', /Лицевой счёт[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /Абонент[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'phone', /Телефонный номер[^:]*:([\s\S]*?);/i, replaceTagsAndSpaces, html_entity_decode);

	var selectCurrentMonth = getParam(html, null, null, /<select[^>]+name="v_bill_id"[^>]*>(?:[\s\S]*?<option[^>]+value=(\d+)){1}/i, replaceTagsAndSpaces, parseBalance);
	var selectVSid = getParam(html, null, null, /name="v_sid"[^>]+value=(\d+)/i, replaceTagsAndSpaces, parseBalance);
	html = AnyBalance.requestPost(baseurl+'pls/webbil/dispatcher', {
		v_bill_id: selectCurrentMonth,
		v_sid: selectVSid,
		v_selpage: 1
	});
	getParam(html, result, 'incomingBalance', /(?:[\s\S]*?<table[^>]*>){6}(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'charged', /(?:[\s\S]*?<table[^>]*>){6}(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'paid', /(?:[\s\S]*?<table[^>]*>){6}(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'outgoingBalance', /(?:[\s\S]*?<table[^>]*>){6}(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance', /Всего к оплате[\s\S]*?<th[^>]*>([\s\S]*?)<\/th>/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}