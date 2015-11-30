/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://my.docs-group.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
		
	var html = AnyBalance.requestPost(baseurl + 'cabinet.html', {
        login:prefs.login,
        pass:prefs.password,
    }, addHeaders({Referer: baseurl + 'cabinet.html'}));
	
	if(!/logout/i.test(html)) {
		var error = getParam(html, null, null, /АВТОРИЗАЦИЯ<[^>]*> или[\s\S]*?<td colspan=2>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if(error && /Неправильный логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    var result = {success: true};
	getParam(html, result, 'balance', /Ваш баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance', 'lastpay_sum'], /Ваш баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'sms_russia', /Вам доступны СМС[^>]*>\s*Russia:[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
	if(isAvailable(['lastpay_date', 'lastpay_sum'])) {
		html = AnyBalance.requestGet(baseurl + getParam(html, null, null, /<a href="\/(cabinet\/\d+\/report.html)/i), g_headers);
		
		getParam(html, result, 'lastpay_date', /Поступившие средства(?:[\s\S]*?<td class="trd"[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'lastpay_sum', /Поступившие средства(?:[\s\S]*?<td class="trd"[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	}
    AnyBalance.setResult(result);
}