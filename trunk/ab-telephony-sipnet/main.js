 /*
 
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

SIPNET IP-телефония
Сайт оператора: http://www.sipnet.ru/
Личный кабинет: https://customer.sipnet.ru/cabinet/

*/

function main(){
	var prefs = AnyBalance.getPreferences();
    
	var info = AnyBalance.requestPost("https://customer.sipnet.ru/cabinet/", {
		Name: prefs.login,
		Password: prefs.password,
		CabinetAction: 'login'
	});
	
	var matches = info.match(/<div>(\d+?\.\d+?)[^\d]+?<span style="font-size: 80%">.+?<\/span><\/div>/i);
	if (matches) {
		var result = {success: true};
		result.balance = matches[1];
		AnyBalance.setResult(result);
	} else {
		throw new AnyBalance.Error("Не удалось получить текущий баланс");
	}
	
}