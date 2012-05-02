/*
 
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)Zadarma IP-телефония
Сайт оператора: http://www.zadarma.com/
Личный кабинет: https://ss.zadarma.com/

*/

function main(){
	var prefs = AnyBalance.getPreferences();
    
	AnyBalance.setDefaultCharset('utf-8');

	var auth = AnyBalance.requestPost("https://ss.zadarma.com/auth/login/", {
		email: prefs.login,
		password: prefs.password
	});
	
	var info = AnyBalance.requestGet("https://ss.zadarma.com");

	var balance = info.match(/<span class="balance">.*\$(-?\d+[\.,]\d+).*<\/span>/i);
	var tariff = info.match(/<p><strong>(.*)<\/strong>( \(стоимость \d+\.\d+.*\))<\/p>/i);

	if (balance) {
		var result = {success: true};
		result.balance = parseFloat(balance[1].replace(/,/g, '.'));
		if (tariff) {
        	    result.__tariff = tariff[1] + tariff[2];
		}
		AnyBalance.setResult(result);
	} else {
		throw new AnyBalance.Error("Не удалось получить текущий баланс");
	}
	
}