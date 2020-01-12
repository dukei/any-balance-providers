
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

function getPrice(cur)
{
    var prefs		= AnyBalance.getPreferences();
	var url			= prefs.item_url;
    
	AnyBalance.setCookie('.aliexpress.ru', 'aep_usuc_f', 'site=rus&region=RU&b_locale=ru_RU&c_tp=' + cur);
    
	var html		= AnyBalance.requestGet(url, g_headers);
	
	if(prefs.isDebug)
	{
		for(var i=0; i<html.length; i=i+790) AnyBalance.trace(html.substring(i, i+790));
	}
	
	var matches		= html.match(/"actSkuMultiCurrencyCalPrice":"([\d\.,]+)/);
	
	AnyBalance.trace('Результаты парсинга цены: ' + matches);
	
    if(matches)
	{
		var price	= matches[1].trim().replace(",", ".");
		AnyBalance.trace('Товар стоит ' + price + " " + cur);
		return price;
	}
	
    return null;
}

function main()
{
  	AnyBalance.setDefaultCharset('utf-8');
  
	var priceUSD	= getPrice('USD');
    var priceRUB	= getPrice('RUB');
	
    if(!priceUSD)
	{
    	throw new AnyBalance.Error('Не удалось найти цену', true);
	}
	
	var rate		= parseFloat((parseBalance(priceRUB)/parseBalance(priceUSD)).toFixed(4));

    var result = {
        success	: true,
        rate	: rate
    };
    
    if(AnyBalance.isAvailable('date')) {
        result.date = +new Date();
    }
    
    AnyBalance.setResult(result);
}
