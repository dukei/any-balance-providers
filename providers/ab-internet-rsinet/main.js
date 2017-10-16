
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://bill.rsi-net.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	var form = AB.getElement(html, /<form[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'username') {
			return prefs.login;
		} else if (name == 'password') {
			return prefs.password;
		}

		return value;
	});

	html = AnyBalance.requestPost(baseurl, params, AB.addHeaders({
		Referer: baseurl + 'login'
	}));

	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /<div[^>]+alert-danger[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	AB.getParam(html, result, 'balance', /<td[^>]*>\s*Баланс[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'status', /<td[^>]*>\s*Статус интернета[\s\S]*?<td[^>]*>([\s\S]*?)(?:<a|<\/td>)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'status_block', /<td[^>]*>\s*Состояние блокировки[\s\S]*?<td[^>]*>([\s\S]*?)(?:<a|<\/td>)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'nds', /<td[^>]*>\s*НДС[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'licschet', /<td[^>]*>\s*Основной лицевой счёт[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, '__tariff', /<th[^>]*>\s*Название тарифа[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
