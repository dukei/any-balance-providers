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
	var baseurl = 'http://lk2.ykstolica.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'billing/personal/', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'USER_LOGIN') 
			return prefs.login;
		else if (name == 'USER_PASSWORD')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'billing/personal/', params, addHeaders({Referer: baseurl + 'billing/personal/'}));
	
	if (!/logout/i.test(html)) {
		var error = getElement(html, /<[^>]+errortext/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'account', /Лицевой счет:[^>]*>\s*л.с[^<]+№(\d+)/i, replaceTagsAndSpaces);

	html = AnyBalance.requestGet(baseurl + 'billing/personal/circulating-sheet/', g_headers);
	var tbl = getElement(html, /<table[^>]+data-table/i);
	var tbody = getElement(tbl, /<tbody/i);
	var trs = getElements(tbody, /<tr/ig);

	getParam(trs[0], result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(trs[0], result, 'balance', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalanceRK);
	
	var services = getElement(trs[1], /<tbody/i);
	services = getElements(services, /<tr/ig);

	var sout = [];
	for(var i=0; i<services.length-1; ++i){
		sout.push(
			getParam(services[i], /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces) + ' ' +
			getParam(services[i], /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalanceRK)
		);
	}
	getParam(sout.join('\n'), result, 'all');
	
	AnyBalance.setResult(result);
}

function parseBalanceRK(_text) {
    var text = _text.replace(/\s+/g, '');
    var rub = getParam(text, null, null, /(-?\d[\d\.,]*)руб/i, replaceTagsAndSpaces, parseBalance) || 0;
    var _sign = rub < 0 || /-\d[\d\.,]*руб/i.test(text) ? -1 : 1;
    var kop = getParam(text, null, null, /(-?\d[\d\.,]*)коп/i, replaceTagsAndSpaces, parseBalance) || 0;
    var val = _sign*(Math.abs(rub) + kop / 100);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + _text);
    return val;
}
