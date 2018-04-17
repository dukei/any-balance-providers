/**
 * Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 * 
 * Watsons - мережа магазинів товарів для краси та здоров'я.
 * Сайт мережі магазинів: http://www.watsons.ua/
 */

function main() {
	var prefs = AnyBalance.getPreferences();
        var baseurl = "https://www.watsons.ua/";
	var pass = prefs.pass;
	var email = prefs.email;
	if (!prefs.email || prefs.email == '')
		throw new AnyBalance.Error('Введіть E-mail');
	if (!prefs.pass || prefs.pass == '')
		throw new AnyBalance.Error('Введіть пароль');
	var html = AnyBalance.requestPost(baseurl + 'j_spring_security_check',
		{
			j_username : prefs.email,
			j_password : prefs.pass
		},
		{
			"User-Agent" : "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.94 Safari/537.36"
		});

	if (/information_message negative/i.test(html)) {
		var error = getParam(html, null, null, /<div class="information_message negative">[\s\S]*?<span class="single"><\/span>[\s\S]*?<p>([^"]*)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не вдалося зайти в особистий кабінет. Сайт змінений?');
	}

	if (html) {
		var result = {
			success : true
		};
		getParam(html, result, 'bonus', /<div class="points-balance">[\s\S]*?<span class="value">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
                getParam(html, result, 'bonus_last', /Зароблено за останню покупку: ([\s\S]*?) балів/i, replaceTagsAndSpaces, parseBalance);
                getParam(html, result, 'bonus_burn', /скоро може згоріти: ([\s\S]*?)\./i, replaceTagsAndSpaces, parseBalance);
                
                html = AnyBalance.requestGet(baseurl + 'my-account/update-profile');

		getParam(html, result, '__tariff', /Редагувати дані<\/a><\/h5>[\s\S]*?<p>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);

		AnyBalance.setResult(result);
	} else {
		throw new AnyBalance.Error('Не вдалося отримати дані');
	}
}
