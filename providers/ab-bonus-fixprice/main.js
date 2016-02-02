
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
	var baseurl = 'http://bonus.fix-price.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'login', {
		login: prefs.login,
		password: prefs.password,
	}, AB.addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		Referer: baseurl + 'login'

	}));

	var json = AB.getJson(html);

	if (!json.success === true) {
		var error = json.message;
		if (error) {
			throw new AnyBalance.Error(error, null, /найден|пароль/i.test(error));
		}
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + 'profile', g_headers);
	var result = {
		success: true
	};

	AB.getParam(html, result, 'balance', /<div[^>]*class="[^"]*bonus-info[^"]*"[\s\S]*?(<h2[\s\S]*?<\/h2>)/i, AB.replaceTagsAndSpaces,
		AB.parseBalance);
	AB.getParam(html, result, 'fio', /<div[^>]*class="[^"]*user[^"]*"[^>]*>[\s\S]*?(<p[\s\S]*?)<\/a>/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'card', /на\s+вашей\s+карте\s+№([\s\S]*?)<\/p>/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
