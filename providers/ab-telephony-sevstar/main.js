
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
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://stat.sevstar.net/';
	AnyBalance.setDefaultCharset('windows-1251');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'auth.php', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'auth.php', {
		login: prefs.login,
		password: prefs.password,
		go: ''
	}, AB.addHeaders({
		Referer: baseurl + 'auth.php'
	}));

	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /<div[^>]+class="s-error"[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /Неверныe логин или пароль/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	AB.getParam(html, result, 'balance',  	/текущий баланс:[^>]*>([^<]*)/i,          AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'block_sum',  /Сумма блокировки:(?:[^>]*>){3}([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'auto_block', /Автоблокировка:(?:[^>]*>){3}([^<]*)/i,   AB.replaceTagsAndSpaces);

	AB.getParam(html, result, 'uniq_num',    /Регистрационные данные[\s\S]*?Уникальный номер:(?:[\s\S]*?)<td[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, '__tariff',    /Регистрационные данные[\s\S]*?Тарифный план:(?:[^>]*>){4}([^<]*)/i,            AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'pay_day',     /Расчётный день:(?:[^>]*>){4}([^<]*)/i, 										 AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'date_start',  /Дата подключения:(?:[^>]*>){3}([^<]*)/i, 									     AB.replaceTagsAndSpaces, AB.parseDateWord);

	AB.getParam(html, result, 'status_internet', /Блокировка интернета:(?:[^>]*>){3}([^<]*)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'status_network',  /Блокировка сети:(?:[^>]*>){3}([^<]*)/i,      AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
