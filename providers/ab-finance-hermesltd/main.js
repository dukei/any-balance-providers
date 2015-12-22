var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Encoding':'gzip, deflate, sdch',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36'
};



function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://hermes-ltd.com';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');


	var html = AnyBalance.requestGet(baseurl + '/lk/aut', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}


	html = AnyBalance.requestPost(baseurl + '/lk/aut?from=autpage', {nomer_s: prefs.login, pass: prefs.password}, addHeaders({
		'Origin':baseurl,
		'Referer':baseurl+'/lk/aut'
	}));


	var capcha = getElement(html, /<img\b[^>]*id="img_capcha"[^>]*>/gi);
	html = false;

	if(capcha) {
		var captchaimg = AnyBalance.requestGet(baseurl + '/secpic.php');
		var value = AnyBalance.retrieveCode("Пожалуйста, введите цифры с картинки.", captchaimg, {inputType: 'string'});
		html = AnyBalance.requestPost(baseurl + '/lk/aut?from=autpage', {nomer_s: prefs.login, pass: prefs.password, capcha: value}, addHeaders({
			'Origin':baseurl,
			'Referer':baseurl+'/lk/aut?from=autpage'
		}));
	} else {
		// в качесве ошибки получаю первый span страницы,
		// очень ненадежно, но по другому не смог до ошибки добраться
		// это ошибки до капчи
		var err = getElement(html, /<span\b[^>]*>([^>]*)/);
		err = replaceAll(err, replaceTagsAndSpaces);
		AnyBalance.trace(html);
		throw new AnyBalance.Error(err);
	}
	

	html = AnyBalance.requestGet(baseurl + "/lk/my_ch", null, addHeaders({'Referer':baseurl+'/lk/aut?from=autpage'}));

	// именно logaut
	if(!/logaut/.test(html)) {
		var err = getElement(html, /<span\b[^>]*>([^>]*)/);
		err = replaceAll(err, replaceTagsAndSpaces);
		AnyBalance.trace(html);
		// тут ошибка - не всегда ошибка, может попасться бред какой нибудь (хотя я не смог добиться такой ситуации)
		// но другого способа показать хоть что-то не нашел)
		throw new AnyBalance.Error("Не удалось авторизоваться. Возможная ошибка: " + err);
	}

	// вроде прошли все круги ада

	var result = { success: true };

	getParam(html, result, 'balance', /баланс:(?:[^>]*>){4}([\s\S]*?)</gi, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'loan', /займ:(?:[^>]*>){4}([\s\S]*?)</gi, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'deposit', /Залог:(?:[^>]*>){4}([\s\S]*?)</gi, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'available', /Доступно(?:[^>]*>){4}([\s\S]*?)</gi, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'premium', /Ажио:\s*(?:[^>]*>){4}([\s\S]*?)</i, replaceTagsAndSpaces);
	getParam(html, result, 'currency', /Валюта счета:\s*(?:[^>]*>){4}([\s\S]*?)</i, replaceTagsAndSpaces);
	getParam(html, result, 'contract', /Контракт:\s*(?:[^>]*>){4}([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'loan_rate', /Ставка по займу:\s*(?:[^>]*>){4}([\s\S]*?)</i, replaceTagsAndSpaces);
	getParam(html, result, 'status', /Статус счета:\s*(?:[^>]*>){7}([\s\S]*?)</i, replaceTagsAndSpaces);
	getParam(html, result, 'profit', /Прибыль за всё время:\s*(?:[^>]*>){4}([\s\S]*?)</gi, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'name', /Владелец счета:\s*(?:[^>]*>){4}([\s\S]*?)</i, replaceTagsAndSpaces);


	AnyBalance.setResult(result);
}