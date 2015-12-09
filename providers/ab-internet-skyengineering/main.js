var g_headers = {
	'Host': 'sky-en.ru',
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Encoding': 'gzip, deflate, sdch',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Upgrade-Insecure-Requests': 1,
	'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36'
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

	var form = getElement(html, /<section[^>]+id="main-content"[^>]*>/i);

	if(!form) {

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка. На странице не найдена форма входа. Сайт изменен?');

	}

	var params = createFormParams(form, function(params, str, name, value){

		if (name == 'LOGIN') 
			return prefs.login;
		else if (name == 'PASSWD')
			return prefs.password;
		return value;

	});

	html = AnyBalance.requestPost(baseurl, params, addHeaders({ Referer: baseurl, Origin: 'http://sky-en.ru' }));

	if(!html || AnyBalance.getLastStatusCode() > 400){

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');

	}

	// к сожалению при вводе неправильных данных не обнаружил никакого выхлопа - 
	// сервер просто перенаправляет на ту же страницу входа и все...
	// поэтому вся проверка авторизации свелась к проверке слова logout

	if(!/logout/.test(html)) {

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проверьте правильность логина и пароля.');

	}


	var block = getElement(html, /<div[^>]+id="text-3"[^>]*>/i);

	if(!block) {

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Блок данных не найден на странице. Сайт изменен?');

	}

	var data = getElements(block, /<div[^>]+class="[^\"\']*user-data[^\"\']*"[^>]*>/gi);

	console.log(data);

	var result = {success: true};

	getParam(data[0], result, 'name', null, [replaceTagsAndSpaces, replaceHtmlEntities]);
	getParam(data[1], result, 'login', null, [replaceTagsAndSpaces, replaceHtmlEntities]);
	getParam(data[2], result, 'contract', null, [replaceTagsAndSpaces, replaceHtmlEntities]);
	getParam(data[3], result, 'balance', null, [replaceTagsAndSpaces, replaceHtmlEntities], parseBalance);
	getParam(data[4], result, 'payment', null, [replaceTagsAndSpaces, replaceHtmlEntities], parseBalance);
	getParam(data[5], result, 'status', null, [replaceTagsAndSpaces, replaceHtmlEntities]);

	AnyBalance.setResult(result);
}