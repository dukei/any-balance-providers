/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Интертелеком – первый национальный CDMA оператор.
Сайт оператора: http://www.intertelecom.ua/
Автоматическая Система Самообслуживания Абонентов (АССА): https://assa.intertelecom.ua/ru/login/
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	var html = AnyBalance.requestPost('https://assa.intertelecom.ua/ru/login/', {
		phone: prefs.phone,
		pass: prefs.pass
	});
	if (html){
		var result = {success: true};
		if (AnyBalance.isAvailable('saldo')) {
			var matches = html.match(/<td>Сальдо<\/td>\s*<td style="color:.+;">\s*(\d+\.\d\d)\s*<\/td>/i);
			if (matches) {
				result.saldo = matches[1]
			} else {
				throw new AnyBalance.Error("Не удалось проверить баланс");
			}
		}
		AnyBalance.setResult(result);
	} else {
		throw new AnyBalance.Error('Не удалось получить данные');
	}
}