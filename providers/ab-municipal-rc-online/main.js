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
	var baseurl = 'https://cabinet.rc-online.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
		
	var html = AnyBalance.requestPost(baseurl + 'go/', {
        e_login:prefs.login,
        e_password:prefs.password,
		e_cookie:'on',
        form_logon_submitted:'yes'
    }, addHeaders({Referer: baseurl + 'login'}));
	
	if(!/logout/i.test(html)) {
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    var result = {success: true};
	
	var balance = getParam(html, null, null, /(?:Баланс по счету|Переплата)[^>]*>\s*<[^>]+>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	if(!isset(balance))
		balance = getParam(html, null, null, /Долг[^>]*>\s*<[^>]+>([^<]*)/i, replaceTagsAndSpaces, parseBalance) * -1;
	
	getParam(balance, result, 'balance');
	
	getParam(html, result, 'fio', /Абонент:(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
	if(isAvailable(['nachisl'])) {
		html = AnyBalance.requestGet(baseurl+'go/charges', g_headers);
		getParam(html, result, 'nachisl', /Итого:(?:[^>]*>){24}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	}
	if(isAvailable(['last_pay_date','last_pay_sum'])) {
		html = AnyBalance.requestGet(baseurl+'go/pays_history', g_headers);
		getParam(html, result, 'last_pay_date', /<table[^>]*class="list_table"(?:[\s\S]*?<td[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'last_pay_sum', /<table[^>]*class="list_table"(?:[\s\S]*?<td[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	}	
	
    AnyBalance.setResult(result);
}