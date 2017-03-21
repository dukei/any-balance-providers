
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

function getPrice(cur){
    var url = 'https://gpsfront.aliexpress.com/queryGpsProductAjax.do?&callback=jQuery18308581276012533401_1490101903659&widget_id=5041187&platform=pc&limit=12&offset=0&locale=ru_RU&phase=1&_=';
    AnyBalance.setCookie('.aliexpress.com', 'aep_usuc_f', 'site=rus&region=RU&b_locale=ru_RU&c_tp=' + cur);
    var html = AnyBalance.requestGet(url, g_headers);
    var json = getParam(html, /jQuery18308581276012533401_1490101903659\s*\(([\s\S]*)\)/, null, getJson);

    var good = json.gpsProductDetails[0];
    var price = parseBalance(good.minPrice);
    AnyBalance.trace('Товар "' + good.productTitle + '" стоит ' + good.minPrice);

    return price;
}

function main() {

  	AnyBalance.setDefaultCharset('utf-8');
  
    var usd = getPrice('USD');
    var rub = getPrice('RUB');

    var result = {
        success: true,
        rate: parseFloat((rub/usd).toFixed(4))
    };
    
    if(AnyBalance.isAvailable('date')) {
        result.date = +new Date();
    }
    
    AnyBalance.setResult(result);
}
