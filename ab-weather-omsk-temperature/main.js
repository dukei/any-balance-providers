/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main() {
	var text = AnyBalance.requestGet("http://myxa.opsb.ru/files/weather.js");
	var result = {success: true};
	
	var temp = getParam(text, null, null, /Therm\s*=\s*"([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	
	if(!isset(temp)) {
		AnyBalance.trace(text);
		throw new AnyBalance.Error('Не удалось получить температуру, проблемы на сайте или сайт изменен?');
	}
	
	getParam(temp, result, 'temperature');
	AnyBalance.setResult(result);
}