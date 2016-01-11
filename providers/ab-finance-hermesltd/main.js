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
	
	html = AnyBalance.requestPost(baseurl + '/lk/aut?from=autpage', {
		nomer_s: prefs.login, 
		pass: prefs.password
	}, addHeaders({
		'Origin':baseurl,
		'Referer':baseurl+'/lk/aut'
	}));
	
	var capcha = getElement(html, /<img\b[^>]*id="img_capcha"[^>]*>/i);
	
	if(capcha) {
		var captchaimg = AnyBalance.requestGet(baseurl + '/secpic.php');
		var value = AnyBalance.retrieveCode("Пожалуйста, введите цифры с картинки.", captchaimg, {inputType: 'string'});
		html = AnyBalance.requestPost(baseurl + '/lk/aut?from=autpage', {
			nomer_s: prefs.login, 
			pass: prefs.password, 
			capcha: value
		}, addHeaders({
			'Origin':baseurl,
			'Referer':baseurl+'/lk/aut?from=autpage'
		}));
	}
	
	if (!/logaut/i.test(html)) {
		var authBox = getElement(html, /<div class="auth_box">/i);
		var error = getParam(authBox, null, null, /<span[^>]*style="display:block;[^>]*font-size:20px[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Введены неверно/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = { success: true };

	getParam(html, result, 'balance', /Баланс:([\s\S]*?)<\/tr>/, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance', 'loan', 'deposit', 'available', 'contract', 'profit'], /Баланс:([\s\S]*?)<\/tr>/, replaceTagsAndSpaces, parseCurrency);

	getParam(html, result, 'loan', /Займ:([\s\S]*?)<\/tr>/, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'deposit', /Залог:([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'available', /Доступно:([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'premium', /Ажио:([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'contract', /Контракт:([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'loan_rate', /Ставка по займу:([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /Статус счета:([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'profit', /Прибыль за всё время:([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'name', /Владелец счета:(?:[\s\S]*?<\/td>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}