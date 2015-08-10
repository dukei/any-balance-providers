/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий температура воздуха с сайта www.krastemp.ru
*/

function main(){
	AnyBalance.setDefaultCharset('KOI8-R');
	
	var result = {success: true};
	AnyBalance.trace("Loading www.krastemp.ru");
	var html = AnyBalance.requestGet('http://www.krastemp.ru');
	
	AnyBalance.trace("Parsing current temperature");
	var regexp = /Текущая температура:[\s\S]*?<font[^>]*>(.*?)<\//;
	result.temperature = parseFloat(html.match(regexp)[1]);
	
	AnyBalance.setResult(result);
}
