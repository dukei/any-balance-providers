/**
 * Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 *
 * Лінія магазинів EVA (косметика, парфумерія, побутова хімія)
 * Сайт http://www.eva.dp.ua
 * Личный кабинет http://mozayka.com.ua
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
	var baseurl = 'https://mozayka.com.ua/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

    var html = AnyBalance.requestGet(baseurl + 'account/enter/', g_headers);
    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    html = AnyBalance.requestGet(baseurl + '!processing/api.js.php', addHeaders({Referer: baseurl + 'account/enter/'}));
   	var token = getParam(html, null, null, /MP.token\s*=\s*["']([^"']*)/);
   	if(!token){
   		AnyBalance.trace(html);
   		throw new AnyBalance.Error('Не удалось найти идентификатор сессии. Сайт изменен?');
   	}

   	html = AnyBalance.requestPost(baseurl + '!processing/ajax.php', {
	   	cardNum: prefs.login,
		cardPin: prefs.password,
		mp_m: 'login',
		token: token
	}, addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		Referer: baseurl + 'account/enter/'
	}));

	var json = getJson(html);

	if (json.success != -1) {
		var error = json.error;
		if (error)
			throw new AnyBalance.Error(error, null, /не знайдена|неправильный пароль/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};
	
	//ФИО
	getParam(json.user_fio, result, '__tariff');

    html = AnyBalance.requestGet(baseurl + 'account/my-card/bill/', g_headers);

    var bill = getElement(html, /<div[^>]+\bbill\b[^>]*>/i);

	//Баланс
	getParam(bill, result, 'balance', /У вас[\s\S]*?<span[^>]+num[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	//Баланс доступный для списания
	getParam(bill, result, 'balance_available', /з них[\s\S]*?<span[^>]+num[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	//Баланс который станет доступный в ближайшее время
	getParam(bill, result, 'balance_inactive', /Стануть доступні[\s\S]*?<span[^>]+num[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	//Баланс который сгорит в ближайшее время
	getParam(bill, result, 'balance_discount', /Згорять найближчим[\s\S]*?<span[^>]+num[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	//№ карты
	getParam(prefs.login, result, 'cards');

	AnyBalance.setResult(result);
}
