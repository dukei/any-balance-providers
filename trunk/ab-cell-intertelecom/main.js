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
			var matches = html.match(/<td>Тарифный план<\/td>\s*<td style="color:.+;">\s*(.*)\s*<\/td>/i);
			if (matches) {
				result.__tariff = matches[1]
			} else {
				throw new AnyBalance.Error("Не удалось проверить тариф");
			}
		if (AnyBalance.isAvailable('saldo')) {
			var matches = html.match(/<td>Сальдо<\/td>\s*<td style="color:.+;">\s*(\d+\.\d\d)\s*<\/td>/i);
			if (matches) {
				result.saldo = matches[1]
			} else {
				throw new AnyBalance.Error("Не удалось проверить Сальдо");
			}
		}
		if (AnyBalance.isAvailable('predoplata')) {
			var matches = html.match(/<td>Предоплаченые услуги на месяц<\/td>\s*<td style="color:.+;">\s*(\d+\.\d\d)\s*<\/td>/i);
			if (matches) {
				result.predoplata = matches[1]
			} else {
				throw new AnyBalance.Error("Не удалось проверить Предоплаченые услуги на месяц");
			}
		}
		if (AnyBalance.isAvailable('bonus')) {
			var matches = html.match(/<td>Неактивированные бонусы \(с 094\)<\/td>\s*<td style="color:.+;">\s*(\d+\.\d\d)\s*<\/td>/i);
			if (matches) {
				result.bonus = matches[1]
			} else {
				throw new AnyBalance.Error("Не удалось проверить Неактивированные бонусы");
			}
		}
		AnyBalance.setResult(result);
	} else {
		throw new AnyBalance.Error('Не удалось получить данные');
	}
}