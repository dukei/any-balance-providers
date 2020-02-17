
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 	'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36',
};

var cities = {
	51: 'Аксу',
	43: 'Актау',
	52: 'Актобе',
	42: 'Алматы',
	44: 'Астана',
	53: 'Атырау',
	45: 'Зыряновск',
	54: 'Караганда',
	46: 'Кокшетау',
	55: 'Костанай',
	47: 'Павлодар',
	56: 'Семей',
	48: 'Талдыкорган',
	57: 'Тараз',
	49: 'Уральск',
	58: 'Усть-Камнегорск',
	50: 'Шымкент',
	59: 'Экибастуз',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.almatv.kz/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 	 'Введите номер договора!');
	AB.checkEmpty(prefs.surname, 'Введите фамилию!');

	AnyBalance.setCookie('www.almatv.kz', 'CityName', encodeURIComponent(cities[prefs.city]));
	AnyBalance.setCookie('www.almatv.kz', 'City', 	  prefs.city);

	var html = AnyBalance.requestGet(baseurl + '?city=' + prefs.city, g_headers);
	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'include/check_balance.php', {
		number:  prefs.login,
		surname: prefs.surname,
		'g-recaptcha-response': solveRecaptcha('Пожалуйста, докажите, что вы не робот', baseurl, '6LdspA8UAAAAAMIdeMCBakhN0yGr4CHqgdHI_h7p')
	}, AB.addHeaders({
		Referer: baseurl + '?city=' + prefs.city,
		'X-Requested-With': 'XMLHttpRequest',
		'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
		'Accept': '*/*'
	}));

	if (!/check_balance__row/i.test(html)) {
		var error = AB.getParam(html, /<div[^>]+check_balance_err?or[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
		if(!error)
			error = AB.getElement(html, /<h4/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /Абонент не найден/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	AB.getParam(html, result, 'balance', 			/<td[^>]*>\s*Баланс(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, 	AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'cost', 				/Абонентская плата[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, 	AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'last_payment_sum', 	/Сумма последнего платежа[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, 		AB.replaceTagsAndSpaces, AB.parseBalance);

	AB.getParam(html, result, 'licschet', 			/Номер договора:([\s\S]*?)<\/span>/i, 						 AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'fio', 				/user_name[^>]*>([^<]*)/i, 						 AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'service', 			/Услуга(?:[\s\S]*?<td[^>]*>){4}([^<]*)/i, 		 AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'status', 			/<span[^>]+table_balance__status[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'debt', 				/Долг[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, 					 AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'deadline', 			/Оплачено по дату[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, 		 AB.replaceTagsAndSpaces, AB.parseDate);
	AB.getParam(html, result, 'last_payment_date',  /Дата последнего платежа[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, 	 AB.replaceTagsAndSpaces, AB.parseDate);

	AnyBalance.setResult(result);
}
