
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
	var baseurl = 'https://i.elnet.by/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);
	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl, {
		login: 	  prefs.login,
		password: prefs.password,
		'submit': 'Войти'
	}, AB.addHeaders({
		Referer: baseurl
	}));

	if (!/выход/i.test(html)) {
		var error = AB.getParam(html, null, null, /<div[^>]+class='errmsg'[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /Вы ввели неправильный логин/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	AB.getParam(html, result, 'balance',  /Баланс(?:[^>]*>){3}([^<]*)/i,  	 				AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'p_to_p',   /Обещанный платёж[^>]*>([^<]*)/i,  				AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'deadline', /Время жизни обещанного платежа[^>]*>([^<]*)/i,  	AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'fio', 	  /Ф\.И\.О[^>]*>([^<]*)/i, 		  	 				AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'address',  /Адрес[^>]*>([^<]*)/i, 		  	 				AB.replaceTagsAndSpaces);
	AB.getParam(html, result, '__tariff', /Тарифный план[^>]*>([^<]*)/i,  	 				AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
