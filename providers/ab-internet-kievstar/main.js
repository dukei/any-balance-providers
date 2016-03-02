
/**
Plugin for AnyBalance (http://any-balance-providers.googlecode.com)

Kievstar
Site: https://my.kyivstar.ua/
Author: Viacheslav Sychov & Dmitry Kochin
*/
var headers = {
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'uk-UA,uk;q=0.8,en-US;q=0.6,en;q=0.4',
	'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11',
	'Connection': 'keep-alive'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	// var baseurl = "https://my.kyivstar.ua/";
	var
		baseurl = 'https://account.kyivstar.ua/';
	// var paUrl = 'https://my.kyivstar.ua/tbmb/disclaimer/show.do';

	var html = loginSite(baseurl);

	var result = {
			success: true
		},
		current_balance = '',
		current_currency = '';


	//тип ЛК
	if (/(?:мобильного|мобільного|Mobile\s+phone\s+number)/i.test(html)) {
		AnyBalance.trace('тип лк: Домашний интернет');

		// Баланс
		current_balance = getParam(html, null, null,
			/(?:Текущий\s+баланс|Поточний\s+баланс|Current\s+balance)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces,
			parseBalance);
		current_currency = getParam(html, null, null,
			/(?:Текущий\s+баланс|Поточний\s+баланс|Current\s+balance)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
			replaceTagsAndSpaces, parseCurrency);

		// Бонус
		getParam(html, result, 'bonusValue',
			/(?:Бонусный\s+баланс|Бонусний\s+баланс|Bonuses)(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i,
			replaceTagsAndSpaces, parseBalance);

		getParam(html, result, 'bonusDate',
			/(?:Бонусный\s+баланс|Бонусний\s+баланс|Bonuses)(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i,
			replaceTagsAndSpaces);

		//Номер телефона
		getParam(html, result, 'phone',
			/(?:Номер\s+мобильного\s+телефона|Номер\s+мобільного\s+телефону|Mobile\s+phone\s+number)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
			replaceTagsAndSpaces);

		//Статус
		getParam(html, result, 'status',
			/(?:Статус\s+услуги|Статус\s+послуги|state\s+of\s+service)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
			replaceTagsAndSpaces);

		// //Лицевой счет
		// getParam(html, result, 'licschet',
		// 	/(?:Лицевой\s+сч[её]т|Особовий\s+рахунок|Account:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
		// 	replaceTagsAndSpaces);

	} else {
		AnyBalance.trace('тип лк: Телефон');

		// //Срок действия номера
		// sumParam(html, result, 'till', /(?:Номер діє до:|Номер действует до:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
		// 	replaceTagsAndSpaces, parseDate, aggregate_sum);

		// Баланс (лк Телефон)
		current_balance = getParam(html, null, null,
			/(?:Остаток\s+на\s+сч[её]ту|Залишок\s+на\s+рахунку:)[\s\S]*?<tr[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces,
			parseBalance);
		current_currency = getParam(html, null, null,
			/(?:Остаток\s+на\s+сч[её]ту|Залишок\s+на\s+рахунку:)[\s\S]*?<tr[^>]*>([\s\S]*?)<\/td>/i,
			replaceTagsAndSpaces, parseCurrency);

		//Номер телефона (лк Телефон)
		getParam(html, result, 'phone',
			/Номер:[\s\S]*?<td[^>]*>([^<]*)/i,
			replaceTagsAndSpaces);

	}

	//все основные бонусы в виде текста
	// getFullBonusText(html, result);

	if (!current_balance) {
		current_balance = getParam(html, null, null,
			/(?:Поточний\s+баланс|Текущий\s+баланс):[\s\S]*?<\/td>([\s\S]*?)<a/i, replaceTagsAndSpaces, parseBalance);

		current_currency = getParam(html, null, null,
			/(?:Поточний\s+баланс|Текущий\s+баланс):[\s\S]*?<\/td>([\s\S]*?)<a/i, replaceTagsAndSpaces, parseCurrency);
	}


	getParam(current_balance, result, 'balance');
	getParam(current_currency, result, 'currency');



	getParam(html, result, 'name',
		/(?:Фамилия|Прізвище|First\s+name)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

	// getParam(html, result, 'balance',
	// 	/(?:Текущий\s+баланс|Поточний\s+баланс|Current\s+balance)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces,
	// 	parseBalance);
	//
	// getParam(html, result, ['currency', 'balance'],
	// 	/(?:Текущий\s+баланс|Поточний\s+баланс|Current\s+balance)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
	// 	replaceTagsAndSpaces, parseCurrency);

	getParam(html, result, 'licschet',
		/(?:Лицевой\s+сч[её]т|Особовий\s+рахунок|Account:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
		replaceTagsAndSpaces);

	getParam(html, result, '__tariff',
		/(?:Тарифный\s+план|Тарифний\s+план|Rate\s+Plan)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
		replaceTagsAndSpaces);

	getParam(html, result, 'status',
		/(?:Статус\s+услуги|Статус\s+послуги|state\s+of\s+service)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
		replaceTagsAndSpaces);

	getParam(html, result, 'bonusValue',
		/(?:Бонусный\s+баланс|Бонусний\s+баланс|Bonuses)(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i,
		replaceTagsAndSpaces, parseBalance);

	getParam(html, result, 'bonusDate',
		/(?:Бонусный\s+баланс|Бонусний\s+баланс|Bonuses)(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i,
		replaceTagsAndSpaces);

	//Дата подключения
	getParam(html, result, 'connection_date',
		/(?:Дата\s+подключения|Дата\s+підключення|Connection\s+date)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
		replaceTagsAndSpaces, parseDate);



	AnyBalance.setResult(result);
}
