/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function getRate(result, html, curr,suf){
    getParam(html.find(valut=>valut.ccy==curr).buy, result, curr + "_buy" + (suf||''), null, null, parseBalance);
    getParam(html.find(valut=>valut.ccy==curr).sale, result, curr + "_sell" + (suf||''), null, null, parseBalance);
}

function main() {
	AnyBalance.trace('Connecting to privatbank for get exchange');
	var info = getJson(AnyBalance.requestGet('https://api.privatbank.ua/p24api/pubinfo?exchange&coursid=5'));
	var result = {success: true};
        
	getRate(result, info, 'USD');
	getRate(result, info, 'EUR');
//	getRate(result, info, 'RUR');

        if(AnyBalance.isAvailable('USD_buy_card','USD_sell_card','EUR_buy_card','EUR_sell_card','RUR_buy_card','RUR_sell_card')){
	  AnyBalance.trace('Connecting to privatbank for get cardExchange');
	  var info = getJson(AnyBalance.requestGet('https://api.privatbank.ua/p24api/pubinfo?cardExchange'));

	  getRate(result, info, 'USD', '_card');
	  getRate(result, info, 'EUR', '_card');
//	  getRate(result, info, 'RUR');
	}

	result.__tariff=getFormattedDate('DD.MM.YYYY HH:NN')
	AnyBalance.setResult(result);
}
