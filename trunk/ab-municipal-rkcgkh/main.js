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
	var baseurl = 'https://lc.rkcgkh.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'app/Cabinet.aspx/LogOn', g_headers);
	var captchaguid = getParam(html, null, null, /"captcha-guid"[^>]*value="([^"]*)/i);

	var captchaa;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet(baseurl+ 'app/captcha.ashx?guid='+captchaguid);
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	} else {
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}

	html = AnyBalance.requestPost(baseurl + 'app/Cabinet.aspx/LogOn', {
		'captcha-guid': captchaguid,
		UserName: prefs.login,
		Password: prefs.password,
		captcha: captchaa
	}, addHeaders({Referer: baseurl + 'app/Cabinet.aspx/LogOn'}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /Войти не удалось:(?:[^>]*>\s*){1}(<ul[\s\S]*)<\/ul/i, replaceTagsAndSpaces, html_entity_decode);
		if (error && /Неверный логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true, all:''};
	
	html = AnyBalance.requestGet(baseurl + 'app/Payment.aspx/Next', g_headers);
	
	sumParam(html, result, 'balance', />((?:Долг:|На счету)[\s\S]*?р)/ig, [replaceTagsAndSpaces, /Долг:([\s\S]*?)р/ig, '-$1'], parseBalance, aggregate_sum);
	
	var uslugi = sumParam(html, null, null, /<div\s+class="brick-block block-content">\s*<b>([\s\S]*?)<\/div>/ig);
	for(var i = 0; i<uslugi.length; i++) {
		var usluga = getParam(uslugi[i], null, null, /([\s\S]*?\d{20})/i, replaceTagsAndSpaces);
		var balance = getParam(uslugi[i], null, null, /"more-info"[^>]*>([^<]*)р/i);
		
		result.all += usluga+ ': <br /><b>' + balance + (i < uslugi.length-1 ? '</b><br /><br />' :'</b>');
	}
	
	AnyBalance.setResult(result);
}