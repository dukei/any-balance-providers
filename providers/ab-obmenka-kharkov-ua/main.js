/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main() {
  var prefs = AnyBalance.getPreferences();
  var opt = prefs.checkboxPref;

	var info = AnyBalance.requestGet('https://obmenka.kharkov.ua');
	
	if(!info || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	var result = {success: true};
	
	if (opt == true) {
	 AnyBalance.trace('opt=true');
	   if(matches = info.match(/amountWholesaleFrom([^>]){7}/g)){
                        result.USDpok = parseBalance(matches[0]);
                        result.EURpok = parseBalance(matches[1]);
                        result.RUBpok = parseBalance(matches[2]);
                        }
        if(matches = info.match(/amountWholesaleTo([^>]){7}/g)){
                        result.USDpro = parseBalance(matches[0]);
                        result.EURpro = parseBalance(matches[1]);
                        result.RUBpro = parseBalance(matches[2]);
                        }                
                     }
	else {
	   if(matches = info.match(/amountRetailFrom([^>]){7}/g)){
                        result.USDpok = parseBalance(matches[0]);
                        result.EURpok = parseBalance(matches[1]);
                        result.RUBpok = parseBalance(matches[2]);
                        }
        if(matches = info.match(/amountRetailTo([^>]){7}/g)){
                        result.USDpro = parseBalance(matches[0]);
                        result.EURpro = parseBalance(matches[1]);
                        result.RUBpro = parseBalance(matches[2]);
                        }                
                     }				 

	AnyBalance.setResult(result);
	
}