/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
	'X-Requested-With':'XMLHttpRequest'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://bork.jbalance.org/CheckRegNum/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите регистрационный номер!');
	checkEmpty(prefs.birthdate, 'Введите дату рождения!');

	var captchaa;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet(baseurl+ 'GetCaptchaServlet');
		
		var src = getParam(captcha, null, null, /http:\/\/.\.captcha\.yandex\.net[^'"]+/i);
		if(!src)
			throw new AnyBalance.Error('Не удалось найти ссылку на качпу!');
		
		captcha = AnyBalance.requestGet(src);
		
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	} else {
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	
	var html = AnyBalance.requestGet(baseurl + 'ActionServlet?rn='+prefs.login+'&bd='+prefs.birthdate+'&conf='+(prefs.type+'').toLowerCase()+'&captcha_val=' + captchaa, g_headers);
	
	if (!/Регистрационный номер:/i.test(html)) {
		var error = getParam(html, null, null, /class="error"([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'status', /Статус:([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'year_num', /Номер в общей очереди по году рождения:([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'total_num', /Номер в общей очереди:([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}