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
	var htmlinfo = AnyBalance.requestGet(baseurl,
	{
		"Accept-Encoding": "deflate"
	}
	);
    var result = {success: true};
    
    var res,regexp = /currency\W*h2\W*h2\D*USD\D*([\d\.,]*)\/([\d\.,]*)\D*([\d\.,]*)\D*EUR\D*([\d\.,]*)\/([\d\.,]*)\D*([\d\,]*)\D*([\d\.\/]*)\./;
	//AnyBalance.trace(htmlinfo);
	if(res=regexp.exec(htmlinfo)) {
		result.USD = parseFloat(res[3].split(',').join('.'));
		result.USD_out = parseFloat(res[2].split(',').join('.'));
		result.USD_in = parseFloat(res[1].split(',').join('.'));
		result.EUR = parseFloat(res[6].split(',').join('.'));
		result.EUR_out = parseFloat(res[5].split(',').join('.'));
		result.EUR_in = parseFloat(res[4].split(',').join('.'));
		result.date = res[7];
		result.RUB_summa = result[prefs.currency.toUpperCase()+'_out']*parseFloat(prefs.cur_summa);
	}
	//AnyBalance.trace(result[prefs.currency.toUpperCase()+'_out']);
	//AnyBalance.trace(prefs.cur_summa);
	
	
	
	// Баланс
	//getParam (htmlinfo, result, 'balance', />Текущий баланс[\D]*[\d{2}:]*\):[\D]*>([-\d\.]*)/, [/ |\xA0/, "", ",", "."], parseFloat);
	
 	// Абоненская плата
	//getParam (htmltarif, result, 'monthlypay', /Абон.плата - ([\d\.]*)/, [/ |\xA0/, "", ",", "."], parseFloat);
	
	// Лицевой счет
	//getParam (htmlinfo, result, 'license', /><TD[\D]*\d*>Лицевой счёт[:<>\D]*(\d{6})</);
 
 	AnyBalance.setResult(result);

 }
