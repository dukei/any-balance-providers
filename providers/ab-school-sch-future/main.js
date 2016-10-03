
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://xn--90agc8a6d.xn--d1acj3b/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 	  'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);
	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	var option  = AB.getParam(html, null, null, /<input[^>]+name="option"[^>]+value="([^"]*)/i),
		task    = AB.getParam(html, null, null, /<input[^>]+name="task"[^>]+value="([^"]*)/i),
		ret	    = AB.getParam(html, null, null, /<input[^>]+name="return"[^>]+value="([^"]*)/i),
		param   = AB.getParam(html, null, null, /<div[^>]+form-login[^>]*>(?:[\s\S]*?<input){7}[^>]+name="([^"]*)/i),
		p_value = AB.getParam(html, null, null, /<div[^>]+form-login[^>]*>(?:[\s\S]*?<input){7}[^>]+value="([^"]*)/i);

	if(!option || !task || !ret || !param || !p_value) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error("Не удалось найти параметры авторизации. Сайт изменён?");
	}

	var params = {
		username: prefs.login,
		password: prefs.password,
		Submit: '',
		option: option,
		task: task,
		'return': ret
	};

	params[param] = p_value

	html = AnyBalance.requestPost(baseurl, params, AB.addHeaders({
		Referer: baseurl
	}));

	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /<p[^>]+alert-message[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /Имя пользователя и пароль не совпадают/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	var acc = AB.getParam(html, null, null, /<a[^>]+class='perselector'[^>]+data-usertab='([^']*)/i);
	if(!acc) {
		throw new AnyBalance.Error("Не удалось найти параметр для запроса баланса. Сайт изменён?")
	}

	AB.getParam(html, result, '__tariff', /<div[^>]+"profile\s*"([^>]*>){5}/i, AB.replaceTagsAndSpaces);

	html = AnyBalance.requestGet(baseurl + 'sf/data/data.php?r=paylog&c=00'+acc, addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		'Accept': 'text/html, */*; q=0.01'
	}));

	AB.getParam(html, result, 'balance', /<span[^>]+id="summ"[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	var tables = AB.getElements(html, /<table[^>]+sfprofile-paylog-head[^>]*>/ig);
	if(!tables) {
		AnyBalance.trace("Не удалось найти таблицы с подробным балансом.")
	} else {
		var current_month = tables[tables.length-1];
		AB.getParam(current_month, result, 'balance_start', /на начало(?:[\s\S]*?<tr[^>]*>){2}(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(current_month, result, 'income', 		/на начало(?:[\s\S]*?<tr[^>]*>){2}(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(current_month, result, 'days', 			/на начало(?:[\s\S]*?<tr[^>]*>){2}(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(current_month, result, 'offs', 			/на начало(?:[\s\S]*?<tr[^>]*>){2}(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(current_month, result, 'balance_ends', 	/на начало(?:[\s\S]*?<tr[^>]*>){2}(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	}

	if(isAvailable(['account', 'card_status', 'limit'])) {
		html = AnyBalance.requestGet(baseurl + 'sf/data/data.php?r=extralog&c=00' + acc, addHeaders({
			'X-Requested-With': 'XMLHttpRequest',
			'Accept': 'text/html, */*; q=0.01'
		}));

		AB.getParam(html, result, 'account',     /Лицевой счет:([\s\S]*?<\/strong>)/i,  AB.replaceTagsAndSpaces);
		AB.getParam(html, result, 'card_status', /Карта ученика:([\s\S]*?<\/strong>)/i, AB.replaceTagsAndSpaces);
		AB.getParam(html, result, 'limit',       /<span[^>]+'daylimit'[^>]*>([^<]*)/i,  AB.replaceTagsAndSpaces);
	}


	AnyBalance.setResult(result);
}
