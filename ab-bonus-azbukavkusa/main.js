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
	var baseurl = 'http://www.av.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите номер карты!');

	var html = AnyBalance.requestGet(baseurl + 'index.aspx?sPage=42', g_headers);

	var captchaa;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet(baseurl+ 'img.aspx?21108');
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}

	html = AnyBalance.requestPost(baseurl + 'index.aspx?sPage=42', {
		't': 1,
		n: prefs.login,
		vv:captchaa,
		send: 'Проверить информацию'
	}, addHeaders({Referer: baseurl + 'index.aspx?sPage=42'}));

	if (!/<p>\s*Размер\s+скидки\s+по\s+карте/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	getParam(html, result, '__tariff', /Размер скидки по карте[^>]*>\s*(№\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, ['discount', 'next_discount'], /составляет\s*(\d+)\s*%/i, replaceTagsAndSpaces, parseBalance);
	
	if(isset(result.discount)) {
		var next = getParam(html, null, null, /для увеличения скидки на\s*(\d+)\s*%/i, replaceTagsAndSpaces, parseBalance);
		getParam(next + result.discount, result, 'next_discount');
	}
	
	getParam(html, result, 'to_reach_next_discount', /необходимо совершить покупок([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'last_purch_date', /Дата последней покупки:([^<]*)/i, replaceTagsAndSpaces, parseDate);
	
	AnyBalance.setResult(result);
}