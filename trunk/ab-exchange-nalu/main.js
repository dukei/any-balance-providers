/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function getRate(result, info, currency) {
	// $1 - покупка $2 - продажа
	var match = new RegExp('"currency_'+currency+'"(?:[^>]*>){2}[^>]*bid_value[^>]*>([^<]+)(?:[^>]*>){6}([^<]+)', 'i').exec(info);
	if(!match)
		throw new AnyBalance.Error("Не удалось получить данные, свяжитесь с разработчиком.");
	
	getParam(match[1], result, currency + 's', null, replaceTagsAndSpaces, parseBalance);
	getParam(match[2], result, currency + 'p', null, replaceTagsAndSpaces, parseBalance);
}

function main() {
	if (AnyBalance.getLevel() < 5)
		throw new AnyBalance.Error("Для этого провайдера необходимо AnyBalance API v.5+");

	var info = AnyBalance.requestGet('http://banker.ua/marketindex/course/');
	var result = {success: true};
	
	getRate(result, info, 'USD');
	getRate(result, info, 'EUR');
	getRate(result, info, 'RUB');
	
	AnyBalance.setResult(result);
}