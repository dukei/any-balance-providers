/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Watsons - сеть магазинов товаров для красоты и здоровья
Сайт сети магазинов: http://watsons.com.ua
Личный кабинет: https://club.watsons.com.ua/club/
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	var pass = prefs.pass;
	var login = prefs.login;
	if (!prefs.login || prefs.login == '')
		throw new AnyBalance.Error ('Введите № карты');
	if (!prefs.pass || prefs.pass == '')
		throw new AnyBalance.Error ('Введите пароль');
	var html = AnyBalance.requestPost('https://club.watsons.com.ua/club/j_spring_security_check', {
			login: prefs.login,
			pass: prefs.pass
		}, 
		{"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11"}
	);
	if (html){
		var result = {success: true};
		//Бонусы накопленные по программе Watsons Club
		if (AnyBalance.isAvailable('bonus')) {
			var matches = html.match(/<div.+>Кількість балів:<\/div>\s*<div.+>(\d+?)<\/div>/i);
			if (matches) {
				result.bonus = parseFloat(matches[1]);
			} else {
				throw new AnyBalance.Error("Не удалось проверить бонусы");
			}
		}
		//ФИО
		html = AnyBalance.requestPost('https://club.watsons.com.ua/club/private/profile/view.dc',
		{"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11"}
		);
		if (matches=/<div .*>Прізвище:<\/div>\s*<div .*>(.*?)<\/div>/.exec(html)){
		str_tmp1=/<div .*>Ім’я:<\/div>\s*<div .*>(.*?)<\/div>/.exec(html), str_tmp2=/<div .*>По батькові:<\/div>\s*<div .*>(.*?)<\/div>/.exec(html)
		result.__tariff=matches[1]+' '+str_tmp1[1]+' '+str_tmp2[1];
		}
		AnyBalance.setResult(result);
	} else {
		throw new AnyBalance.Error('Не удалось получить данные');
	}
}
