
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.idomen.ru/';
	AnyBalance.setDefaultCharset('windows-1251');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + '?p=login', {
		'login': prefs.login,
		'password': prefs.password
	}, AB.addHeaders({
		Referer: baseurl + ''
	}));

	if (!/logout|Выход/i.test(html)) {
		var error = AB.getParam(html, null, null, /Ваше\s+имя[\s\S]*?<\/p>([\s\S]*?)<table/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /логин|паол/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	if (AnyBalance.isAvailable('balance', 'account_balance')) {
		try {
			html = AnyBalance.requestGet(baseurl + '?p=balance', g_headers);

			AB.getParam(html, result, 'balance', /Суммарный\s+оборот\s+на\s+балансе:([\s\S]*?)Остаток/i, AB.replaceTagsAndSpaces, AB.parseBalance);
			AB.getParam(html, result, 'account_balance', /Остаток на счету:([\s\S]*?)<form/i, AB.replaceTagsAndSpaces, AB.parseBalance);
			AB.getParam(html, result, ['currency', 'balance', 'account_balance'], /Остаток\s+на\s+сч[её]ту:([\s\S]*?)<form/i, AB.replaceTagsAndSpaces,
				AB.parseCurrency);

		} catch (e) {
			AnyBalance.trace('Не удалось получить данные по балансам ' + e);
		}

	}

	if (AnyBalance.isAvailable('domains')) {
		try {
			html = AnyBalance.requestGet(baseurl + '?p=domains', g_headers);

			var
				table = html.match(/<form[^>]*method="POST"[^>]*>[\s\S]*?(<table[\s\S]*?<\/table>)/i)[1],
				rows = AB.sumParam(table, null, null, /<tr[^>]*>([\s\S]*?)<\/tr>/gi, AB.replaceTagsAndSpaces),
				domens = [];

			for (var i = 1; i < rows.length - 1; i++) {
				domens.push(rows[i]);
			}

			AB.getParam(domens.join(', '), result, 'domains');

		} catch (e) {
			AnyBalance.trace('Не удалось получить данные по доменам ' + e);
		}

	}

	AnyBalance.setResult(result);
}
