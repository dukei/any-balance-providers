/**
 * Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 * 
 * Watsons - сеть магазинов товаров для красоты и здоровья Сайт сети магазинов:
 * http://watsons.com.ua Личный кабинет: https://club.watsons.com.ua/club/
 */

function main() {
	var prefs = AnyBalance.getPreferences();
	var pass = prefs.pass;
	var login = prefs.login;
	if (!prefs.login || prefs.login == '')
		throw new AnyBalance.Error('Введите № карты');
	if (!prefs.pass || prefs.pass == '')
		throw new AnyBalance.Error('Введите пароль');
	var html = AnyBalance.requestPost('https://club.watsons.com.ua/club/j_spring_security_check',
		{
			login : prefs.login,
			pass : prefs.pass
		},
		{
			"User-Agent" : "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.52 Safari/537.17"
		});

	if (html) {
		var result = {
			success : true
		};
		// Бонусы накопленные по программе Watsons Club
		getParam(html, result, 'bonus', /<div[^>]*>Кількість балів:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

		sumParam(html, result, 'termin_bonus',
				/<div[^>]*>Станом на:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i,
				replaceTagsAndSpaces, parseDate, aggregate_min);

		// ФИО
		html = AnyBalance.requestGet('https://club.watsons.com.ua/club/private/profile/view.dc',
			{
				"User-Agent" : "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.52 Safari/537.17"
			});

                sumParam(html, result, '__tariff', /(?:Прізвище|Ім’я|По батькові):[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, html_entity_decode, create_aggregate_join(' '));

		AnyBalance.setResult(result);
	} else {
		throw new AnyBalance.Error('Не удалось получить данные');
	}
}
