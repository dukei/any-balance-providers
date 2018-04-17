
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

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://scanner.gfk.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);
	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'Account/Login', {
		UserName: prefs.login,
		Password: prefs.password,
		'RememberMe': 'false'
	}, AB.addHeaders({
		Referer: baseurl
	}));

	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /<div[^>]+class="validation-summary-errors"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /Неверные логин и\/или пароль/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	AB.getParam(html, result, 'balance', 		/баланс(?:[^>]*>){4}([^<]*)/i, 			 	 AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'DH_num',  		/Ваш личный номер ДХ(?:[^>]*>){2}([^<]*)/i,  AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'tutor',   		/Куратор:(?:[^>]*>){2}([^<]*)/i, 			 AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'tutors_phone',   /Телефон куратора(?:[^>]*>){2}([^<]*)/i, 	 AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
