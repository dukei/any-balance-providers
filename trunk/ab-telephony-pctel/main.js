/*
 
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

PCTEL IP-телефония
Сайт оператора: http://www.pctel.ru/
Личный кабинет: https://my.pctel.ru/pages/my_pctel/

*/

function main(){
	var prefs = AnyBalance.getPreferences();
    
	AnyBalance.setDefaultCharset('windows-1251');

	var info = AnyBalance.requestPost("https://my.pctel.ru/my_pctel/login/", {
		'data[User][login]': prefs.login,
		'data[User][password]': prefs.password,
		act: 'login'
	});
	
	var matches = info.match(/<b>(-?\d+) руб\. ?(\d*)?( коп\.)?<\/b>/i);
	if (matches) {
		var result = {success: true};
		result.balance = parseFloat(matches[1] + '.' + matches[2]);
		AnyBalance.setResult(result);
	} else {
		throw new AnyBalance.Error("Не удалось получить текущий баланс");
	}
	
}