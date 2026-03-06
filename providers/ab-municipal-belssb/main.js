/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.belssb.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'lk/?login=yes', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'lk/?login=yes', {
		'backurl':'/lk/',
		'AUTH_FORM':'Y',
		'TYPE':'AUTH',
		'USER_LOGIN':prefs.login,
		'USER_PASSWORD':prefs.password,
		'Login':'Войти'
	}, addHeaders({Referer: baseurl + 'lk/?login=yes'}));
	
	if (!/logout/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неверный логин или пароль?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /<strong[^>]+class="fs16"[^>]*>([\s\S]*?)<\/strong>/i, [replaceTagsAndSpaces, /[Долг|Задолженность]*:?\s*/i, '-'], parseBalance);
	getParam(html, result, 'basetime', /Дата актуальности базы:([^>]*>){3}/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, '__tariff', /Номер счета:([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_num', /Номер счета:([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
	
	getParam(html, result, 'last_bill_date', /<tr[^>]+class="th-line"[^>]*>(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, ['last_bill_type', 'last_bill_sum'], /<tr[^>]+class="th-line"[^>]*>(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	var type = 3, regExp;
	if(/Оплата/i.test(result.last_bill_type)) type = 4;
	regExp = new RegExp('<tr[^>]+class="th-line"[^>]*>(?:[\\s\\S]*?<td[^>]*>){' + type + '}([\\s\\S]*?)<\\/td>', 'i');
	getParam(html, result, 'last_bill_sum', regExp, replaceTagsAndSpaces, parseBalance);
	
	getParam(html, result, 'meter', /Прибор учета:([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'meter_verification_date', /Дата поверки прибора учета:([^>]*>){2}/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'meter_verification_date_till', /Дата окончания поверки учета:([^>]*>){2}/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'meter_last_readings_date', /Дата последних принятых показаний:([^>]*>){2}/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'meter_readings_general', /Показания общие[\s\S]*?:([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'meter_readings_night', /Показания ночь[\s\S]*?:([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'meter_readings_peak', /Показания пик[\s\S]*?:([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	
	getParam(html, result, 'address', /Адрес:([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'email', /Эл\.\s*?почта:([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /<div[^>]+class="accountInfoNew">([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
	
	html = AnyBalance.requestGet(baseurl + 'lk/billing/full.php', g_headers);
	
	getParam(html, result, 'prev', /<tr[^>]+class="weight"(?:[^>]*>){2}\s*(?:\d{1,2}.\d{1,2}.\d{2,4})?(?:[^>]*>){2}(\d+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'current', /<tr[^>]+class="weight"(?:[^>]*>){2}\s*(?:\d{1,2}.\d{1,2}.\d{2,4})?(?:[^>]*>){4}(\d+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'diff', /<tr[^>]+class="weight"(?:[^>]*>){2}\s*(?:\d{1,2}.\d{1,2}.\d{2,4})?(?:[^>]*>){6}(\d+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'tarif', /<tr[^>]+class="weight"(?:[^>]*>){2}\s*(?:\d{1,2}.\d{1,2}.\d{2,4})?(?:[^>]*>){8}(\d+[.,]?\d+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'to_pay', /<tr[^>]+class="weight"(?:[^>]*>){2}\s*(?:\d{1,2}.\d{1,2}.\d{2,4})?(?:[^>]*>){12}(\d+[.,]?\d+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'last_pay_date', /<tr[^>]+class="weight"(?:[^>]*>){2}\s*(?:[^>]*>){16}(\d{1,2}.\d{1,2}.\d{2,4})/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'last_pay_sum', /<tr[^>]+class="weight"(?:[^>]*>){2}\s*(?:[^>]*>){16}(?:\d{1,2}.\d{1,2}.\d{2,4})(?:[^>]*>){18}(\d+[.,]?\d+)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}