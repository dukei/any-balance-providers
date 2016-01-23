var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Encoding': 'gzip, deflate, sdch',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36'
};

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://sky-en.ru/cabinet/welcome-2/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = createFormParams(html, function(params, str, name, value){
		if (name == 'LOGIN')
			return prefs.login;
		else if (name == 'PASSWD')
			return prefs.password;
		return value;
	});

	html = AnyBalance.requestPost(baseurl, params, addHeaders({
		Referer: baseurl,
		Origin: 'http://sky-en.ru'
	}));

	if(!/logout/.test(html)) {
		var error = getParam(html, null, null, /<span[^>]+class="sr-only"(?:[^>]*>){3}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if(error)
			throw new AnyBalance.Error(error, null, /Неправильный (пароль|логин)/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?.');

	}

	var result = {success: true};

	getParam(html, result, 'fio', /клиент(?:[^>]*>){3}([\s\S]*?)</i, replaceTagsAndSpaces);
	getParam(html, result, 'contract', /договор(?:[^>]*>){3}([\s\S]*?)</i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /баланс(?:[^>]*>){4}([\s\S\d]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'payment', /рекомендуемый платеж(?:[^>]*>){4}([\s\S\d]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /статус(?:[^>]*>){3}([\s\S]*?)</i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /<td[^>]+class="tarif-head tarif-current"[^>]*>([^:]*):/i, replaceTagsAndSpaces);
	getParam(html, result, 'costTariff', /<td[^>]+class="tarif-head tarif-current"[^>]*>[\s\S]*?:([\s\S]*?)<\/h4>/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}
