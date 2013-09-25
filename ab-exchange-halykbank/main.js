
function getRate(result, info, counter){
	var regexp = new RegExp(counter+'(?:[\\s\\S]*?<td[^>]*>){2}([^<]*)', 'i');
	
	getParam(info, result, counter, regexp, null, parseBalance);
}
	
function main(){
	AnyBalance.setDefaultCharset('utf-8');
	var info = AnyBalance.requestGet('http://halykbank.kz/ru/currency-rates');
	
	var table = getParam(info, null, null, /Курсы конвертации для физических[\s\S]*?(<table[\s\S]*?<\/table>)/i);
	if(!table)
		throw new AnyBalance.Error('Не удалось найти таблицу с валютами, сайт изменен?');


	var result = {success: true};
	var currs = ['USD', 'EUR', 'RUR', 'GBP', 'CHF', 'XAU', 'XAG'];
	
	for(i = 0; i < currs.length; i++) {
		getRate(result, info, currs[i]);	
	}

	AnyBalance.setResult(result);
}
