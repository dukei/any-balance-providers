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
	var baseurl = 'http://lk.tverregiongaz.ru';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl+'/lk/login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});

	if (/<input[^>]+name="captcha_token"/i.test(html)) {
		params = createFormParams(html, function(params, str, name, value) {
			if (name == 'login')
				return prefs.login;
			else if (name == 'password')
				return prefs.password;
			return value;
		});
		var captchaSRC = getParam(html, null, null, /<div[^>]+class\s*=\s*"captcha"[^>]*>[\s\S]*?src="([\s\S]*?)"/i);
		var captchaIMG = AnyBalance.requestGet(baseurl + captchaSRC, g_headers);
		if (captchaIMG) {
			params.captcha_response = AnyBalance.retrieveCode("Введите код с картинки.", captchaIMG, {
				inputType: 'text',
				time: 300000
			});
			html = AnyBalance.requestPost(baseurl + '/lk/login', params, addHeaders({Referer: baseurl}))
		}
		else {
			throw new AnyBalance.Error("Капча не найдена.", null, true);
		}
	}
	else {
		html = AnyBalance.requestPost(baseurl+'/lk/login', params, addHeaders({Referer: baseurl}));
	}

	if (!/submit_exit/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="messages error"[^>]*>[\s\S]*?<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, true);
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	getParam(html, result, 'balance', /Информация о расчетах(?:[\s\S]*?<tr[^>]*>){3}(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /^-$/i, '0'], parseBalance);
	getParam(html, result, 'charged', /Информация о расчетах(?:[\s\S]*?<tr[^>]*>){3}(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /^-$/i, '0'], parseBalance);
	getParam(html, result, 'recalculation', /Информация о расчетах(?:[\s\S]*?<tr[^>]*>){3}(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /^-$/i, '0'], parseBalance);
	getParam(html, result, 'paid', /Информация о расчетах(?:[\s\S]*?<tr[^>]*>){3}(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /^-$/i, '0'], parseBalance);
	getParam(html, result, 'total', /Информация о расчетах(?:[\s\S]*?<tr[^>]*>){3}(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /^-$/i, '0'], parseBalance);

	 AnyBalance.setResult(result);
}