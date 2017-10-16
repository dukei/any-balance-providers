 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

РОСБАНК (курсы,расчет)
Сайт банка: http://www.rosbank.ru/
*/
var currencylist = {usd:''};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');    
	var baseurl = 'http://www.rosbank.ru/ru/currency.php';
	var htmlinfo = AnyBalance.requestGet(baseurl, {"Accept-Encoding": "deflate" });
    var result = {
        success: true
    };

    AB.getParam(htmlinfo, result, 'USD', /USD\D*\d*\D*([\d\.,]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(htmlinfo, result, 'EUR', /EUR\D*\d*\D*([\d\.,]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(htmlinfo, result, 'USD_in', /безналичных операций[\s\S]*?<td>([\d,.]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(htmlinfo, result, 'USD_out', /безналичных операций[\s\S]*?<td>[\d,.]+\D+([\d,.]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(htmlinfo, result, 'EUR_in', /безналичных операций[\s\S]*?<td>[^<]+[^/]*\D+([\d.,]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(htmlinfo, result, 'EUR_out', /безналичных операций[\s\S]*?<td>[^<]+[^/]*\D+[\d.,]+\D+([\d.,]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(htmlinfo, result, 'date', /Центральный банк[^<]+<b>([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseDate);

    if (prefs.currency && prefs.cur_summa) {
        var curr = result[prefs.currency.toUpperCase() + '_out'];
        AB.getParam(curr * parseFloat(prefs.cur_summa), result, 'RUB_summa');
    }

 	AnyBalance.setResult(result);

 }
