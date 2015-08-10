/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36',
	'Accept-Language':'ru,en;q=0.8'
};

function getParamByName(html, name) {
	return getParam(html, null, null, new RegExp('name="' + name + '"[^>]*value="([^"]*)"'));
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://81.23.146.8/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер карты!');
	
	var html = AnyBalance.requestGet(baseurl + 'default.aspx', g_headers);
	
	var captchaa;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		var src = getParam(html, null, null, /(CaptchaImage\.axd\?[^"]+)"/i);
		if(!src)
			throw new AnyBalance.Error('Не найдено изображение капчи, сайт имзменен!');
		
		var captcha = AnyBalance.requestGet(baseurl + src);
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
		AnyBalance.sleep(5000);
	} else {
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	
	html = AnyBalance.requestPost(baseurl + 'default.aspx', {
		'__EVENTTARGET':'',
		'__EVENTARGUMENT':'',
		'__VIEWSTATE':getParamByName(html, '__VIEWSTATE'),
		'cardnum':prefs.login,
		'checkcode':captchaa,
		'Button2':'Выполнить запрос',
		'__EVENTVALIDATION':getParamByName(html, '__EVENTVALIDATION')	
	}, addHeaders({
		'Referer':'http://81.23.146.8/default.aspx',
		'Cache-Control':'max-age=0',
		'Origin':'http://81.23.146.8',
	}));
	
	if (!/"PageHeader">Карта №/i.test(html)) {
		var error = getParam(html, null, null, /"CustomValidator[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти информацию по карте. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Ресурс сейчас:(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'deadline', /Действует(?:[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
	
	AnyBalance.setResult(result);
}