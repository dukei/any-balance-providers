var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Encoding': 'gzip, deflate, sdch',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36',
};



function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://portal-irkutsk.itgkh.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');


	var html = AnyBalance.requestGet(baseurl, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}


	var form = getElement(html, /<form[^>]+id="form-office"[^>]*>/i);

	if(!form) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error("На странице не найдена форма авторизации. Сайт изменен?");
	}

	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'form[login]') 
			return prefs.login;
		else if (name == 'form[password]')
			return prefs.password;
		return value;
	});



	html = AnyBalance.requestPost(
		baseurl + 'index/login/', 
		params,
		addHeaders({
			'X-Requested-With': 'xmlhttprequest',
			'HTTP_X_REQUESTED_WITH': 'xmlhttprequest',
			Referer: baseurl,
			Origin: baseurl,
		})
	);

	// вдруг вернули не json
	try{

		html = JSON.parse(html);

	} catch(e) {

		AnyBalance.trace(html);
		AnyBalance.trace(e.name + ": " + e.message);
		throw new AnyBalance.Error("Неправильный ответ сервера.");

	}

	if(html.error) {
		AnyBalance.trace(html.error.message);
		throw new AnyBalance.Error("Ошибка авторизации.");
	}

	if(html.status && html.status == "success") {
		html = AnyBalance.requestGet(baseurl + 'account/');
	} else {
		// эта ошибка на практике вряд ли возникнет, 
		// но я точно не понимаю, что отвечает сервер в различных ситуациях,
		// поэтому наверно лучше ее оставить
		AnyBalance.trace(JSON.stringify(html));
		throw new AnyBalance.Error("Что-то пошло не так.");
	}

	if(!/logout/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error("Ошибка авторизации");
	}


	var result = {success: true};

	form = getElements(html, /<form[^>]*>/gi);
	if(!form) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error("Данные не найдены. Сайт изменен?");
	}

	// беру последнюю форму и удаляю коментарии, а то они тоже парсятся в getElements

	form = replaceAll(form[ form.length - 1 ], [[/\n+/gmi, ''], [/<!--.*-->/gmi, '']]);

	var controls = getElements(form, /<div[^>]*class="[^"]*controls[^"]*"[^>]*>/gi);

	getParam(controls[0], result, 'abonent', /value="([^"]*)"/i, [replaceTagsAndSpaces, replaceHtmlEntities]);
	getParam(controls[1], result, 'address', /value="([^"]*)"/i, [replaceTagsAndSpaces, replaceHtmlEntities]);
	getParam(controls[2], result, 'apart_num', /value="([^"]*)"/i, [replaceTagsAndSpaces, replaceHtmlEntities]);
	getParam(controls[3], result, 'space', /value="([^"]*)"/i, [replaceTagsAndSpaces, replaceHtmlEntities], parseBalance);
	getParam(controls[4], result, 'min_vznos', /value="([^"]*)"/i, [replaceTagsAndSpaces, replaceHtmlEntities], parseBalance);
	getParam(controls[5], result, 'dop_vznos', /value="([^"]*)"/i, [replaceTagsAndSpaces, replaceHtmlEntities], parseBalance);
	getParam(controls[6], result, 'owner_part', /value="([^"]*)"/i, [replaceTagsAndSpaces, replaceHtmlEntities], parseBalance);
	getParam(controls[7], result, 'fund_form_method', /value="([^"]*)"/i, [replaceTagsAndSpaces, replaceHtmlEntities]);
	getParam(controls[8], result, 'account_num', /value="([^"]*)"/i, [replaceTagsAndSpaces, replaceHtmlEntities]);
	getParam(controls[9], result, 'bank', /value="([^"]*)"/i, [replaceTagsAndSpaces, replaceHtmlEntities]);
	getParam(controls[10], result, 'korrs', /value="([^"]*)"/i, [replaceTagsAndSpaces, replaceHtmlEntities]);
	getParam(controls[11], result, 'bik', /value="([^"]*)"/i, [replaceTagsAndSpaces, replaceHtmlEntities]);

	AnyBalance.setResult(result);
}