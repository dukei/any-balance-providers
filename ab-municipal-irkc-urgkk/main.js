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
	var baseurl = 'http://irkc.urgkk.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'index.php?Itemid=72&option=com_irkc&view=irkc', g_headers);

	html = AnyBalance.requestPost(baseurl + 'index.php?option=com_irkc&view=irkc&Itemid=72', {
		your_account: prefs.login,
		option: 'com_irkc',
		view: 'irkc',
		search_account: '1',
	}, addHeaders({Referer: baseurl + 'index.php?Itemid=72&option=com_irkc&view=irkc'}));

	if (!/Найдены\s+ваши\s+данные/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error && /Неверный логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	var balance = getParam(html, null, null, /Сумма к оплате на(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance) || 0;
	var penalty = getParam(html, null, null, /Сумма к оплате на(?:[^>]*>){3}[^<]*пени([^<]*)/i, replaceTagsAndSpaces, parseBalance) || 0;
	getParam(balance + penalty, result, 'balance');
	
	getParam(html, result, 'month_start', /Остаток на начало месяца([^<]*)/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}