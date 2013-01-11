/**
 * Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 * 
 * Watsons - сеть магазинов товаров для красоты и здоровья Сайт сети магазинов:
 * http://watsons.com.ua Личный кабинет: https://club.watsons.com.ua/club/
 */

function main() {
	var prefs = AnyBalance.getPreferences();
        var baseurl = "https://club.watsons.com.ua/club/";
	var pass = prefs.pass;
	var login = prefs.login;
	if (!prefs.login || prefs.login == '')
		throw new AnyBalance.Error('Введите № карты');
	if (!prefs.pass || prefs.pass == '')
		throw new AnyBalance.Error('Введите пароль');
	var html = AnyBalance.requestPost(baseurl + 'j_spring_security_check',
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

		// Срок действия бонусов и бонусы которые сгорят
                if(AnyBalance.isAvailable('bonus_burn', 'bonus_burn_date')){
                    var json = AnyBalance.requestPost(baseurl + 'private/account/balance/pointspage.dc', '{"pageNumber":"1"}', {
                        'Content-Type':'application/json',
                        'Accept':'application/json, text/javascript, */*; q=0.01',
		        "User-Agent" : "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.52 Safari/537.17",
                        'X-Requested-With':'XMLHttpRequest'
                    });
                    json = getJson(json);
 
                    if(json.records){
                        if(AnyBalance.isAvailable('bonus_burn'))
                            result.bonus_burn = json.rows[0].points;
                        if(AnyBalance.isAvailable('bonus_burn_date'))
                            result.bonus_burn_date = parseDateISO(json.rows[0].expirationDate);
                    }
                }

		// ФИО
		html = AnyBalance.requestGet(baseurl + 'private/profile/view.dc',
			{
				"User-Agent" : "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.52 Safari/537.17"
			});

                sumParam(html, result, '__tariff', /(?:Прізвище|Ім’я|По батькові):[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, html_entity_decode, create_aggregate_join(' '));

		AnyBalance.setResult(result);
	} else {
		throw new AnyBalance.Error('Не удалось получить данные');
	}
}
