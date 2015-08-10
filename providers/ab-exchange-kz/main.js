/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.nationalbank.kz/rss/rates_all.xml';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	var result = {success: true};
	
	getRate(html, result, 'USD');
	getRate(html, result, 'EUR');
	getRate(html, result, 'RUB');
	
	AnyBalance.setResult(result);
}

function getRate(html, result, counter){
	getParam(html, result, counter, '<title>\\s*' + counter + '\\s*</title>(?:[^>]*>){2}\\s*<description>([\\s\\d.,]+)', replaceTagsAndSpaces, parseBalance);
}