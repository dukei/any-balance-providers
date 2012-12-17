function getRateDate(result, info){
	var matches, regexp = /<td[^>]+class="date"[^>]*>([\s\S]*?)<\/td>/i;
	if(matches = info.match(regexp)){
		if(AnyBalance.isAvailable('date')){
			result.date = matches[1];
			result.__tariff = matches[1];
                }
	}
}

function getRate(result, info, namein, nameout){
	if(AnyBalance.isAvailable(nameout || namein)){
		var matches, regexp = new RegExp('<tr[^>]*>\\s*<td[^>]*>[^<]*</td>\\s*<td[^>]*>'+namein+'(?:[\\s\\S]*?<td[^>]*>){3}([^<]*)', 'i');
		if(matches = info.match(regexp)){
			result[nameout || namein] = parseFloat(matches[1].replace(',','.'));
		}
        }
}
	
function main(){
	AnyBalance.trace('Connecting to nbu...');
	
	var info = AnyBalance.requestGet('http://bank.gov.ua/control/uk/curmetal/detail/currency?period=daily');
	
	var result = {success: true};

	getRate(result, info, 'AUD');
	getRate(result, info, 'AZM');
	getRate(result, info, 'GBP');
	getRate(result, info, 'BYR');
	getRate(result, info, 'DKK');
	getRate(result, info, 'USD');
	getRate(result, info, 'EUR');
	getRate(result, info, 'ISK');
	getRate(result, info, 'KZT');
	getRate(result, info, 'CAD');
	getRate(result, info, 'LVL');
	getRate(result, info, 'LTL');
	getRate(result, info, 'MDL');
	getRate(result, info, 'NOK');
	getRate(result, info, 'PLN');
	getRate(result, info, 'RUB');
	getRate(result, info, 'SGD');
	getRate(result, info, 'XDR');
	getRate(result, info, 'TRL');
	getRate(result, info, 'TMM');
	getRate(result, info, 'HUF');
	getRate(result, info, 'UZS');
	getRate(result, info, 'CZK');
	getRate(result, info, 'SEK');
	getRate(result, info, 'CHF');
	getRate(result, info, 'CNY');
	getRate(result, info, 'JPY');
	
	getRateDate(result, info);
	
	AnyBalance.setResult(result);
}

