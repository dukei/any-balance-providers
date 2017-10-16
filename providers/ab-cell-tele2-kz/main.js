
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.101 Safari/537.36',
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Connection': 'keep-alive',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	if (!/\d{10}/i.test(prefs.login)) throw new AnyBalance.Error(
		'Номер телефона должен быть без пробелов и разделителей, в формате 707XXXXXXX или 747XXXXXXX!');

	var baseurl = "https://iself.tele2.kz/";
	AnyBalance.setDefaultCharset('utf-8');

	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	html = AnyBalance.requestPost(baseurl + 'login', {
		loginId: prefs.login,
		password: prefs.password
	}, addHeaders({
		Referer: baseurl + 'login'
	}));

	if (!/tab-balance/i.test(html)) {
		//Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
		var error = getElement(html, /<div[^>]+alert-danger/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	

	// Получаем данные о балансе
	var result = {
		success: true
	};

	AB.getParam(html, result, 'fio', /<li[^>]+user[^>]*>([\s\S]*?)(?:\(|<\/li>)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'balance', /<div[^>]+id="tab-balance"[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, '__tariff', /<div[^>]+id="tab-plan"[\s\S]*?<h2[^>]*>([\s\S]*?)(?:<a|<\/h2>)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'phone', /<li[^>]+user[^>]*>[\s\S]*?\(([^)]*)/i, AB.replaceTagsAndSpaces);

	var bonuses = getElements(html, [/<div[^>]+container-fluid[\s>"]/ig, /<div[^>]+tab-section-field[^>]*>\s*Бонусы/i])[0];
	if(!bonuses)
		AnyBalance.trace('Бонусы не найдены');
	else 
		bonuses = getElements(bonuses, /<div[^>]+class="row"/ig);

	for(var i=0; bonuses && i<bonuses.length; ++i){
		var bonus = bonuses[i];
		var units = getParam(bonus, /(?:[\s\S]*?<div[^>]+tab-section-bonus[^>]*>){3}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrency);
		var value = getParam(bonus, /(?:[\s\S]*?<div[^>]+tab-section-bonus[^>]*>){3}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		var name = getParam(bonus, /(?:[\s\S]*?<div[^>]+tab-section-bonus[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		sumDiscount(result, name, units, value);
	}

	try {
		if (AnyBalance.isAvailable('internet_trafic', 'internet_trafic_night', 'min_left', 'sms_left', 'mms_left')) {

			// Сайт возвращает JSON c доп. балансами, они -то нам и нужны
			html = AnyBalance.requestGet(baseurl + 'getTariffResources', AB.addHeaders({
				'X-Requested-With': 'XMLHttpRequest',
				Referer: baseurl
			}));

			json = AB.getJson(html);

			for (var i = 0; i < json.length; ++i) {
				var it = json[i];
				var name = it.title,
					units = getParam(it.value, /\S+$/),
					value = getParam(it.value, /([\s\S]*?)(?:of|$)/);
					value_max = getParam(it.value, /of(.*)/);
				sumDiscount(result, name, units, value, value_max);
			}
		}
	} catch (e) {
		AnyBalance.trace('Ошибка при получении ресурсов тарифного плана: ' + e);
	}

	AnyBalance.setResult(result);
}

function sumDiscount(result, name, units, value, value_max) {
	var bigname = name + units;
	function parseBalanceMinus(str){
		var balance = parseBalance(str);
		if(!balance)
			return balance;
		return value_max ? -balance : balance;
	}

	function parseTrafficMinus(str){
		var balance = parseTraffic(str);
		if(!balance)
			return balance;
		return value_max ? -balance : balance;
	}

	AnyBalance.trace('Найдено ' + name + ' ' + value + ' ' + units);
	if (/шт|sms|смс/i.test(bigname)) {
		sumParam(value + '', result, 'sms_left', null, null, parseBalanceMinus, aggregate_sum);
		sumParam(value_max, result, 'sms_left', null, null, parseBalance, aggregate_sum);
	} else if (/mms|ммс/i.test(bigname)) {
		sumParam(value + '', result, 'mms_left', null, null, parseBalanceMinus, aggregate_sum);
		sumParam(value_max, result, 'mms_left', null, null, parseBalance, aggregate_sum);
	} else if (/минут|min/i.test(bigname)) {
		sumParam(value + '', result, 'min_left', null, [/[\.,].*/, ''], parseBalanceMinus, aggregate_sum);
		sumParam(value_max, result, 'min_left', null, [/[\.,].*/, ''], parseBalance, aggregate_sum);
	} else if (/[гкмgkm][бb]/i.test(bigname) || /интернет/i.test(name)) {
		var night = /ноч/i.test(bigname) ? '_night' : '';
		sumParam(value + units, result, 'internet_trafic' + night, null, null, parseTrafficMinus, aggregate_sum);
		sumParam(value_max && value_max + units, result, 'internet_trafic' + night, null, null, parseTraffic, aggregate_sum);
	} else {
		AnyBalance.trace('Неизвестная опция: ' + name);
	}
}
