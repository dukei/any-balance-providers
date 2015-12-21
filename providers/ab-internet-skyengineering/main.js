var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Encoding': 'gzip, deflate, sdch',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
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

	var result = {success: true};

	getParam(block, result, 'name', /клиент(?:[^>]*>){3}([\s\S]*?)</i, replaceTagsAndSpaces);
	getParam(block, result, 'login', /логин(?:[^>]*>){3}([\s\S]*?)</i, replaceTagsAndSpaces);
	getParam(block, result, 'contract', /договор(?:[^>]*>){3}([\s\S]*?)</i, replaceTagsAndSpaces);
	getParam(block, result, 'balance', /баланс(?:[^>]*>){4}([\s\S\d]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(block, result, 'payment', /рекомендуемый платеж(?:[^>]*>){4}([\s\S\d]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(block, result, 'status', /статус(?:[^>]*>){3}([\s\S]*?)</i, replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
