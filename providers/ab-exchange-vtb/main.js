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
	var baseurl = 'http://www.vtb24.ru/_layouts/Vtb24.Pages/CurrencyRateAjaxRedesign.aspx';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if (!/Конвертация в офисе/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить информацию по курсам валют. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'usd_buy', /USD(?:[^>]*>){4}([\s\d,.]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'usd_sell', /USD(?:[^>]*>){7}([\s\d,.]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'eur_buy', /eur(?:[^>]*>){3}([\s\d,.]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'eur_sell', /eur(?:[^>]*>){6}([\s\d,.]+)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}