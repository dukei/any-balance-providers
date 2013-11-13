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
	var baseurl = 'http://stroisouz-s.ru.omega.mtw.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'auth/?login=yes', g_headers);

	html = AnyBalance.requestPost(baseurl + 'auth/', {
		'AUTH_FORM': 'Y',
		TYPE:'AUTH',
		backurl:'/auth/',
		USER_LOGIN: prefs.login,
		USER_PASSWORD: prefs.password,
	}, addHeaders({Referer: baseurl + 'auth/'}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'personal/charges/', g_headers);
	
	var result = {success: true};
	getParam(html, result, 'balance', /Задолженность:(?:[^>]*>){3}([\s\S]*?<\/td)/i, replaceTagsAndSpaces, parseBalanceRK);
	
	var usluga = prefs.usluga || '[^>]*';
	
	var trRegExp = new RegExp('(<tr>\\s*<td>'+usluga+':</td>[\\s\\S]*?</tr>)', 'i');
	var tr = getParam(html, null, null, trRegExp);
	
	if(!tr) {
		AnyBalance.trace('Не удалось найти ' + (prefs.usluga ? 'услугу с именем ' +prefs.usluga : 'ни одной услуги.'));
	} else {
		getParam(tr, result, 'db_usluga', /(?:[\s\S]*?<td>){1}([^:]*)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(tr, result, 'db_nachisleno', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?<\/td)/i, replaceTagsAndSpaces, parseBalanceRK);
		getParam(tr, result, 'db_k_oplate', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?<\/td)/i, replaceTagsAndSpaces, parseBalanceRK);
	}
	
	if(isAvailable(['db_counter_name', 'last_val', 'curr_val'])) {
		html = AnyBalance.requestGet(baseurl + 'personal/meters/', g_headers);
		
		var counter = prefs.pr_counter || '[^>]*';
		var trRegExp2 = new RegExp('(<td\\s*class="meter-name"[^>]*>'+counter+':[\\s\\S]*?</tr>)', 'i');
		tr = getParam(html, null, null, trRegExp2);
		
		if(!tr) {
			AnyBalance.trace('Не удалось найти ' + (prefs.pr_counter ? 'счетчик с именем ' +prefs.pr_counter : 'ни одного счетчика.'));
		} else {
			getParam(tr, result, 'db_counter_name', /(?:[\s\S]*?<td[^>]*>){1}([^:]*)/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(tr, result, 'last_val', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?<\/td)/i, replaceTagsAndSpaces, parseBalance);
			getParam(tr, result, 'curr_val', /(?:[\s\S]*?<td[^>]*>){3}[^>]*value="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
		}		
	}
	
	AnyBalance.setResult(result);
}

function parseBalanceRK(_text){
    var text = _text.replace(/\s+/g, '');
    var rub = getParam(text, null, null, /(-?\d[\d\.,]*)\s*руб/i, replaceFloat, parseFloat) || 0;
    var kop = getParam(text, null, null, /(-?\d[\d\.,]*)\s*коп/i, replaceFloat, parseFloat) || 0;
    var val = rub+kop/100;
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + _text);
    return val;
}