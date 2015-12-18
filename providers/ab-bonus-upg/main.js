/**
 * Сеть АЗС
 * Сайт http://www.upg.ua
 * Личный кабинет https://upgood.com.ua/
 */

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.99 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://upgood.com.ua/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите номер телефона!');
	checkEmpty(prefs.password, 'Введите пароль!');

        var html = AnyBalance.requestGet(baseurl, g_headers);

        var execKey = getParam(html, null, null, /<input type="hidden" name="_csrf" value="([^"]*)">/i);

        html = AnyBalance.requestPost(baseurl, {
                _csrf: execKey,
		"LoginForm[login]": prefs.login,
		"LoginForm[password]": prefs.password
	});

	if (!/Выход/i.test(html)) {
		var error = getParam(html, null, null, /Исправьте следующие ошибки:<\/p><ul><li>([^<]*)<\/li><\/ul><\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Ввели неправильно номер телефона или пароль? Или возможно сайт изменен?');
	}

	var result = {success: true};

	//ФИО
	sumParam(html, result, '__tariff', /Account\[lastname\]" value="([^"]*)"/ig, null, html_entity_decode, create_aggregate_join(' '));
	sumParam(html, result, '__tariff', /Account\[name\]" value="([^"]*)"/ig, null, html_entity_decode, create_aggregate_join(' '));
	sumParam(html, result, '__tariff', /Account\[mname\]" value="([^"]*)"/ig, null, html_entity_decode, create_aggregate_join(' '));
	//Баланс 1 - накопленные бонусы
        getParam(html, result, 'balance1', /<h3>Баланс 1 - накопленные бонусы<\/h3>\s*<p>На Вашем счету: <strong>(\d+)<\/strong> бонусов<\/p>/i, replaceTagsAndSpaces, parseBalance);
	//Баланс который станет доступный в ближайшее время
        getParam(html, result, 'balance2', /<h3>Баланс 2 - общее количество посещений <\/h3>\s*<p>На Вашем счету: <strong>(\d+)<\/strong> посещений<\/p>/i, replaceTagsAndSpaces, parseBalance);
	//Баланс который сгорит в ближайшее время
        getParam(html, result, 'balance3', /<h3>Баланс 3 - общий обьем купленого топлива <\/h3>\s*<p>На Вашем счету: <strong>(\d+)<\/strong> литров<\/p>/i, replaceTagsAndSpaces, parseBalance);
	//№ карты
        getParam(html, result, 'cards', /<h1>Настройки карты (\d+)<\/h1>/i, replaceTagsAndSpaces, parseBalance);
        //Статус карты
        getParam(html, result, 'status', /<p><strong>\d+<\/strong><\/p> -->\s*<p[^>]*>Статус: <strong>([^<]*)<\/strong><\/p>/i, replaceTagsAndSpaces, html_entity_decode);

        var html = AnyBalance.requestGet(baseurl +'auth/logout', g_headers);

	AnyBalance.setResult(result);
}

