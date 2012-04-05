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
	if (!prefs.login || prefs.login == '')
		throw new AnyBalance.Error ('Введите № карты');
	if (!prefs.pass || prefs.pass == '')
		throw new AnyBalance.Error ('Введите пароль');
	var html = AnyBalance.requestPost('http://club.watsons.com.ua/club/j_spring_security_check', {
			login: prefs.login,
			pass: prefs.pass
		}, 
		//Приходится указывать юзерагент, иначе их сервер падает
		{"User-Agent":"Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.142 Safari/535.19"}
	);
	if (html){
		var result = {success: true};
		if (AnyBalance.isAvailable('bonus')) {
			//AnyBalance.trace(html); //С помощью этого на телефоне в окне "показать последний лог" можно увидеть, какой тут html
			var matches = html.match(/<div.+>Кількість балів:<\/div>\s*<div.+>(\d+?)<\/div>/i);
			if (matches) {
				result.bonus = parseFloat(matches[1]);
			} else {
				throw new AnyBalance.Error("Не удалось проверить бонусы");
			}
		}
		AnyBalance.setResult(result);
	} else {
		throw new AnyBalance.Error('Не удалось получить данные');
	}
}
