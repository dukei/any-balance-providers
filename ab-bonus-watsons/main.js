/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Watsons - сеть магазинов товаров для красоты и здоровья
Сайт сети магазинов: http://http://watsons.com.ua
Личный кабинет: http://club.watsons.com.ua/club/
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	var pass = prefs.pass;
	var login = prefs.login;
/**	if (!prefs.login || prefs.login == '')
		throw new AnyBalance.Error ('Введите № карты');
	if (!prefs.pass || prefs.pass == '')
		throw new AnyBalance.Error ('Введите пароль');**/
	var html = AnyBalance.requestPost('http://club.watsons.com.ua/club/j_spring_security_check', {
		login: prefs.login,
		pass: prefs.pass
	});
/**	AnyBalance.requestPost('http://club.watsons.com.ua/club/', {
		login: prefs.login,
		pass: prefs.pass
	});
	var html = AnyBalance.requestGet('http://club.watsons.com.ua/club/private/account/balance.dc');**/
	if (html){
		var result = {success: true};
		if (AnyBalance.isAvailable('bonus')) {
			var matches = html.match(/<div.+>Кількість балів:<\/div>\s*<div.+>(\d+?)<\/div>/i);
			if (matches) {
				result.bonus = matches[1]
			} else {
				throw new AnyBalance.Error("Не удалось проверить бонусы");
			}
		}
		AnyBalance.setResult(result);
	} else {
		throw new AnyBalance.Error('Не удалось получить данные');
	}
}
