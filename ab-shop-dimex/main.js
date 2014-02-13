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
	var baseurl = 'http://www.auto-dimex.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	html = AnyBalance.requestPost(baseurl, {
		loginform:'1',
		userlogin: prefs.login,
		userpassword: prefs.password,
		'login': 'Вход'
	}, addHeaders({Referer: baseurl}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /"#FF0000"[^>]*>(Ошибка[^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /логин и пароль в базе данных не найдены/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'cart_items', /в вашей корзине([^>]*>){10}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cart_sum', /в вашей корзине([^>]*>){18}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance', /на счету([^>]*>){5}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'saldo', /сальдо баланса([^>]*>){5}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'needtopay', /в заказе без оплаты([^>]*>){5}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'free', /остаток средств для заказа([^>]*>){5}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'usd', /доллар,\s*\$([^>]*>){4}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'eur', /евро,([^>]*>){4}/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}