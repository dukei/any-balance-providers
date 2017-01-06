/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

 Получает баланс и информацию из личного кабинета "Мониторинг Жилищного Фонда" Тверской области
 */

var g_headers = {
	'Accept': 			'*/*',
	'Origin': 			'https://portal-tver.itgkh.ru',
	'Accept-Charset': 	'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();

	var baseurl = 'https://portal-tver.itgkh.ru/';

	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');


	var html = AnyBalance.requestGet(baseurl + '', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'index/login/', {
		'form[login]': prefs.login,
		'form[password]': prefs.password
	}, AB.addHeaders({
		Referer: baseurl,
		HTTP_X_REQUESTED_WITH: 'xmlhttprequest',
		'X-Requested-With': 'xmlhttprequest',
	}));

	var json = AB.getJson(html);
	if (json.status != 'success') {
		var error = json.message;
		if(error)
			throw new AnyBalance.Error(error, null, /пользователь не найден!/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + 'account', g_headers);

	 if (!/logout/i.test(html)) {

	 	AnyBalance.trace(html);
	 	throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	 }

	var result = { success: true };

	var dataForm = AB.getElement(html, /\<form[^>]+class=\"\s*form-horizontal\s*\"[^>]*\>/i);

	AB.getParam(dataForm, result, 'debt',    /Задолженность\s+по\s+сч[ёе]ту[\s\S]*?<input[^>]*value=\"([^"]*)\"/i, AB.replaceHtmlEntities, AB.parseBalance);
	AB.getParam(dataForm, result, 'balance', /Остаток\s+на\s+сч[ёе]те[\s\S]*?<input[^>]*value=\"([^"]*)\"/i,	   AB.replaceHtmlEntities, AB.parseBalance);

	if(isAvailable(['freshPeriod', 'inSaldo', 'accruedMoney', 'paidMoney', 'out_saldo'])) {
		html = AnyBalance.requestGet(baseurl + 'account/accrual', g_headers);

		var tableData = AB.getElement(html, /<table\s+class="[^"]*data_table[^"]*"[^>]*>/i);

		var items = parseTable(tableData);
		result.__tariff = items[0];
		result['freshPeriod'] = AB.parseDateWord(items[0]);
		result['inSaldo'] = parseBalance(items[1]);
		result['accruedMoney'] = parseBalance(items[2]);
		result['paidMoney'] = parseBalance(items[4]);
		result['out_saldo'] = parseBalance(items[5]);
	}

	AnyBalance.setResult(result);
}

function parseTable(html)
{
	var items = [],
		match = 1,
		i = 0,
		regexp = /<td>(.*)<\/td>/g;

	while (match != null) {
		i++;
		match = regexp.exec(html);
		if (match) items.push(replaceAll(match[1], replaceTagsAndSpaces));
		if (i > 5) break;
	}

	return items;
}