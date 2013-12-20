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
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://mozayka.com.ua/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '!processing/login.php?cardNum='+encodeURIComponent(prefs.login)+'&cardPin='+encodeURIComponent(prefs.password), g_headers);

	if (!/"success":"2"/i.test(html)) {
		var error = getParam(html, null, null, /error"\s*:\s*"([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};

	html = AnyBalance.requestGet(baseurl + '!processing/bill.php', g_headers);
	var json = getJson(html);
	if(!json)
		throw new AnyBalance.Error('Не удалось найти информацию, сайт изменился?');

	//ФИО
	sumParam(json.buyer.lastName+'', result, '__tariff', null, replaceTagsAndSpaces, html_entity_decode, create_aggregate_join(' '));
	sumParam(json.buyer.firstName+'', result, '__tariff', null, replaceTagsAndSpaces, html_entity_decode, create_aggregate_join(' '));
	sumParam(json.buyer.middleName+'', result, '__tariff', null, replaceTagsAndSpaces, html_entity_decode, create_aggregate_join(' '));
	//Баланс
	getParam(json.buyer.activeBalance+'', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	//Баланс который станет доступный в ближайшее время
	getParam(json.buyer.inactiveBalance+'', result, 'balance_inactive', null, replaceTagsAndSpaces, parseBalance);
	//Баланс который сгорит в ближайшее время
	getParam(json.buyer.discount+'', result, 'balance_discount', null, replaceTagsAndSpaces, parseBalance);
	//№ карты
	getParam(json.buyer.cards+'', result, 'cards', null, replaceTagsAndSpaces, parseBalance);

	html = AnyBalance.requestGet(baseurl + '!processing/status.php', g_headers);

	//Баланс который станет доступным к списанию
	//Не получается через json
        //getParam(json.balanceAccount.balance+'', result, 'balance_available', null, replaceTagsAndSpaces, parseBalance);
	//А так получается
	getParam(html, result, 'balance_available', /balance\":\"([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	//Балансы выбраны наугад, при наличии значений, которые однозначно можно сопоставить со значения в html версии в личного кабинета, нужно будет откорректировать провайдер!!!

	AnyBalance.setResult(result);
}
