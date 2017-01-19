
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
		'Номер телефона должен быть без пробелов и разделителей, в формате 7XXxxxxxxx!');

	var baseurl = "https://cabinet.altel.kz/";
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
	AB.getParam(html, result, 'till', /(?:Дата следующего списания абонентской платы|Абоненттік төлемді келесі шығынға жазу күні)[\s\S]*?<div[^>]+tab-section-value[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, parseDateISO);

	var bonuses = getElements(html, [/<div[^>]+container-fluid[\s>"]/ig, /<div[^>]+tab-section-field[^>]*>\s*Бонусы/i])[0];
	if(!bonuses)
		AnyBalance.trace('Бонусы не найдены');
	else 
		bonuses = getElements(bonuses, /<li/ig);

	for(var i=0; bonuses && i<bonuses.length; ++i){
		var text = replaceAll(bonuses[i], replaceTagsAndSpaces);
		var units = getParam(text, /\S+$/i);
		var value = getParam(text, /(\S+)\s+\S+$/i);
		var name = getParam(text, /([\s\S]*?)\S+\s+\S+$/i);
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
					value_max = getParam(it.value, /(?:of|из)(.*\d.*)/);
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

	AnyBalance.trace('Найдено ' + name + ' ' + value + ' ' + units);
	if (/шт|sms|смс/i.test(bigname)) {
		sumParam(value + '', result, 'sms_left', null, null, parseBalance, aggregate_sum);
	} else if (/mms|ммс/i.test(bigname)) {
		sumParam(value + '', result, 'mms_left', null, null, parseBalance, aggregate_sum);
	} else if (/gsm/i.test(bigname) && /минут|min/i.test(bigname)) {
		sumParam(value + '', result, 'min_left_gsm', null, [/[\.,].*/, ''], parseBalance, aggregate_sum);
	} else if (/на город|на др\.\s*сети/i.test(bigname) && /минут|min/i.test(bigname)) {
		sumParam(value + '', result, 'min_left_city', null, [/[\.,].*/, ''], parseBalance, aggregate_sum);
	} else if (/минут|min/i.test(bigname)) {
		sumParam(value + '', result, 'min_left', null, [/[\.,].*/, ''], parseBalance, aggregate_sum);
	} else if (/[гкмgkm][бb]/i.test(bigname) || /интернет/i.test(name)) {
		var night = /с 00|ноч/i.test(bigname) ? '_night' : '';
		night = /с 08/i.test(bigname) ? '_day' : night;

		sumParam(value + units, result, 'traffic_left' + night, null, null, parseTraffic, aggregate_sum);
	} else {
		AnyBalance.trace('Неизвестная опция: ' + name);
	}
}
