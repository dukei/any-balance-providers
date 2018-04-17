
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 	'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
};

function main() {
	var prefs   = AnyBalance.getPreferences(),
		baseurl = 'http://complatezh.info/';

	AnyBalance.setDefaultCharset('windows-1251');

	AB.checkEmpty(prefs.login, 	   'Введите логин!');
	AB.checkEmpty(prefs.password,  'Введите пароль!');
	AB.checkEmpty(prefs.card, 	   'Введите номер муниципальной карты!');
	AB.checkEmpty(prefs.house, 	   'Введите номер дома!');
	AB.checkEmpty(prefs.apartment, 'Введите номер квартиры!');

	var html = AnyBalance.requestGet(baseurl + 'login.php', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'login.php', {
		user_name: prefs.login,
		user_pass: prefs.password,
		login: 'Войти'
	}, AB.addHeaders({
		Referer: baseurl + 'login.php'
	}));

	if (!/location\.href/i.test(html)) {
		var error = AB.getParam(html, null, null, /<strong[^>]*>([\s\S]*?)<\/strong>/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /Неправильное имя или пароль/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	html = AnyBalance.requestPost(baseurl + 'eao/show.php', {
		mcard: prefs.card,
		build: prefs.house,
		flat: prefs.apartment,
		post: 'Просмотр счетов'
	}, addHeaders({
		Referer: baseurl + 'viewpage.php?page_id=9'
	}));

	if(!/расшифровка начислений и оплат /.test(html)) {
		throw new AnyBalance.Error("Не удалось зайти на странциу со счетами. Сайт изменён?");
	}

	var table = AB.getParam(html, null, null, /<table[^>]+'eao_table'[^>]*>([\s\S]*?)Оплаты, ещё не прошедшие/i),
		rows  = AB.getElements(table, /<tr[^>]*>[\s\S]*?<\/tr>/ig);

	if(!table || !rows) {
		throw new AnyBalance.Error("Не удалось таблицу со счетами. Сайт изменён?");
	}

	for(var i = 0; i < rows.length; i++) {
		var counter_name = null;

		if(/ГОРЭЛЕКТРОСЕТИ ДНЕПРОПЕТРОВСКА/i.test(rows[i])) {
			counter_name = 'gorsety'
		} else if (/КП "Жилсервис-1"/i.test(rows[i])) {
			counter_name = 'jilserv'
		} else if (/Водоканал/i.test(rows[i])) {
			counter_name = 'vodokanal'
		} else if (/КП "ТЕПЛОЭНЕРГО"/i.test(rows[i])) {
			counter_name = 'teploenergo'
		} else if (/ТДВ «Дніпрокомунтранс»/i.test(rows[i])) {
			counter_name = 'komuttrans'
		} else if (/"ЛИФТРЕММОНТАЖ ДНЕПР"/i.test(rows[i])) {
			counter_name = 'liftmontage'
		}

		if(counter_name) {
			AB.getParam(rows[i], result, counter_name, /<font[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
		}
	}

	AnyBalance.setResult(result);
}
