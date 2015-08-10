/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

PeopleNet – первый национальный CDMA оператор.
Сайт оператора: http://people.net.ua
Автоматическая Система Самообслуживания Абонентов (АССА): http://my.people.net.ua
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	var html = AnyBalance.requestPost('http://my.people.net.ua/TSU/WWW/ACCOUNT_INFO/', {
		"X_Username": prefs.login,
		"X_Password": prefs.password
	});
	if (html){
		var result = {success: true};
			var matches = html.match(/на тарифному плані [\s\S]*?<b>(.*?)</);
			if (matches) {
				result.__tariff = matches[1]
			} else {
				result.__tariff = 'Неопределенный тариф';
			}
		 // Баланс
		  if(AnyBalance.isAvailable('balance')){
		    if (matches=/ аванс [\s\S]*?(.*?)</.exec(html)){
			result.balance=parseFloat(matches[1]);
		    }
		  }
		AnyBalance.setResult(result);
	} else {
		throw new AnyBalance.Error('Не удалось получить данные');
	}
}