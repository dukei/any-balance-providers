
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':  'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.87 Safari/537.36',
};

function main() {
	var prefs 	= AnyBalance.getPreferences(),
		baseurl = 'https://portal.plusofon.ru';

	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '/signin', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var CSRF = getParam(html, null, null, /<input[^>]+name="_csrf"[^>]+value="([^"]*)/i);
	if(!CSRF) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error("Не удалось найти параметр запроса. Сайт изменён?");
	}
	html = AnyBalance.requestPost(baseurl + '/signin', {
		'LoginForm[username]': 	 prefs.login,
		'LoginForm[rememberMe]': 0,
		'LoginForm[password]':   prefs.password,
		'_csrf':				 CSRF
	}, AB.addHeaders({
		Referer: baseurl + '/signin'
	}));

	if (!/signout/i.test(html)) {
		var error = AB.getParam(html, null, null, /<input[^>]+password(?:[^>]*>){2}([^<]*)/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	//Состояние счёта
	AB.getParam(html, result, 'balance', /Текущий баланс[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	if(isAvailable(['spent_the_day', 'subscriber_customer', 'subscriber_accounts'])) {
		html = AnyBalance.requestGet(baseurl + '/site/get-balance', addHeaders({
			'X-Requested-With': 'XMLHttpRequest'
		}));
		var json = getJson(html);

		AB.getParam(json.spent_the_day, 	  result, 'spent_the_day',       null, null, AB.parseBalance);
		AB.getParam(json.subscriber_customer, result, 'subscriber_customer', null, null, AB.parseBalance);
		AB.getParam(json.subscriber_accounts, result, 'subscriber_accounts', null, null, AB.parseBalance);
	}

	//Статистика за сегодня
	if(isAvailable(['calls_missed', 'redirected_to_mobile', 'redirected_to_voicemail'])) {
		html = AnyBalance.requestGet(baseurl + '/site/get-stat', addHeaders({
			'X-Requested-With': 'XMLHttpRequest'
		}));
		var json = getJson(html);

		AB.getParam(json.calls_missed + '', 			result, 'calls_missed', 		   null, null, AB.parseBalance);
		AB.getParam(json.redirected_to_mobile + '', 	result, 'redirected_to_mobile',    null, null, AB.parseBalance);
		AB.getParam(json.redirected_to_voicemail + '', 	result, 'redirected_to_voicemail', null, null, AB.parseBalance);
	}

	//Номера
	if(isAvailable(['c_outside', 'c_mobile', 'c_800'])) {
		html = AnyBalance.requestGet(baseurl + '/site/get-num-info', addHeaders({
			'X-Requested-With': 'XMLHttpRequest'
		}));
		var json = getJson(html);

		AB.getParam(json.c_outside + '', result, 'c_outside', null, null, AB.parseBalance);
		AB.getParam(json.c_mobile + '',  result, 'c_mobile',  null, null, AB.parseBalance);
		AB.getParam(json.c_800 + '', 	 result, 'c_800',     null, null, AB.parseBalance);
	}

	//Персональный менеджер
	if(isAvailable(['c_outside', 'c_mobile', 'c_800'])) {
		html = AnyBalance.requestGet(baseurl + '/site/get-assigned', addHeaders({
			'X-Requested-With': 'XMLHttpRequest'
		}));
		var json = getJson(html);

		AB.getParam(json.fio + '', 	  result, 'fio_manager');
		AB.getParam(json.email + '',  result, 'email_manager');
		AB.getParam(json.phone + '',  result, 'phone_manager');
	}

	if(isAvailable('agreement')) {
		html = AnyBalance.requestGet(baseurl + '/agreement', g_headers);
		AB.getParam(html, result, 'agreement', /Информация по договору:([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);
	}

	html = AnyBalance.requestGet(baseurl + '/tariff', g_headers);
	AB.getParam(html, result, '__tariff', /Управление тарифом[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);

	if(isAvailable(['fio', 'sip', 'phone'])) {
		html = AnyBalance.requestGet(baseurl + '/profile/account/update', addHeaders({
			'X-Requested-With': 'XMLHttpRequest'
		}));

		var name       = AB.getParam(html, null, null, /Имя(?:[^>]*>){4}([^<]*)/i,      AB.replaceTagsAndSpaces),
			surname    = AB.getParam(html, null, null, /фамилия(?:[^>]*>){4}([^<]*)/i,  AB.replaceTagsAndSpaces),
			patronymic = AB.getParam(html, null, null, /Отчество(?:[^>]*>){4}([^<]*)/i, AB.replaceTagsAndSpaces);

		AB.getParam(name  + ' ' + patronymic + ' ' + surname + ' ', result, 'fio');
		AB.getParam(html, result, 'sip',   /SIP аккаунт[\s\S]*?логин:([^<]*)/i, 	AB.replaceTagsAndSpaces);
		AB.getParam(html, result, 'phone', /Телефонный номер(?:[^>]*>){4}([^<]*)/i, AB.replaceTagsAndSpaces);
	}

	//Обработка подключенных номеров, может быть понадобится в будущем.
	  /*if(isAvailable('all_nums')) {
		html = AnyBalance.requestGet(baseurl + 'phone/number/my', g_headers);

		var phones_table = AB.getElement(html, /Подключенные номера[\s\S]*?(<table[^>]*>)/i),
			phones       = AB.getElements(phones_table, /<tr[^>]+data-key[^>]*>/ig);

		if(!phones.length) {
		  if(/ничего не найдено/i.test(phones_table)) {
			AnyBalance.trace("Номера телефонов отсутствуют в таблице 'Подключённые номера'");
		  } else {
			AnyBalance.trace(html);
			AnyBalance.trace("Не удалось найти номера телефонов. Сайт изменён?");
		  }
		} else {
		  var list = [];

		  for(var i = 0; i < phones.length; i++) {
			var city   = AB.getParam(phones[i], null, null, /(?:[\s\S]*?<td[^>]*>){2}([^<]*)/i) || '-',
				number = AB.getParam(phones[i], null, null, /(?:[\s\S]*?<td[^>]*>){3}([^<]*)/i) || '-',
				user   = AB.getParam(phones[i], null, null, /(?:[\s\S]*?<td[^>]*>){4}([^<]*)/i) || '-';

			list.push('#' + (i+1) + ' ' + city + ', ' + number + ', ' + user);
		  }

		  AB.getParam(list.join(';\n'), result, 'all_nums');
		}
	  }*/
	AnyBalance.setResult(result);
}
