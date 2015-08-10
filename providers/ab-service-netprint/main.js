/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'X-Requested-With':'XMLHttpRequest',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.netprint.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestPost(baseurl + 'xml/777', {
		'operation':'stdlogin',
		'POST_AUTH_USER':prefs.login,
		'POST_AUTH_PASSWD':prefs.password,
		'please_remember_me':'false'
	}, addHeaders({Referer: baseurl + ''}));

	if (!/"code":100/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	html = AnyBalance.requestGet(baseurl + 'ru/73/', g_headers);
	
	var result = {success: true};

	getParam(AnyBalance.getCookie('my_money') || 0, result, 'balance', null, replaceTagsAndSpaces, parseBalance);

	if(isAvailable('bonuses')){
		html = AnyBalance.requestGet(baseurl + 'ru/306/', g_headers);
		getParam(html, result, 'bonuses', /var my_balance=([^;]+)/i, replaceTagsAndSpaces, parseBalance);
	}
	
	AnyBalance.setResult(result);
}

// function parseBalanceRK(_text){
//     var text = _text.replace(/\s+/g, '');
//     var rub = getParam(text, null, null, /(-?\d[\d\.,]*)(?:руб)/i, replaceFloat, parseFloat) || 0;
//     var kop = getParam(text, null, null, /руб[\s\S]*?(-?\d[\d\.,]*)/i, replaceFloat, parseFloat) || 0;
//     var val = rub+kop/100;
//     AnyBalance.trace('Parsing balance (' + val + ') from: ' + _text);
//     return val;
// }