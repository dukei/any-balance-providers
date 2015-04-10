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
	var baseurl = 'http://123.plitv.tv/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'login.php', g_headers);

	var href = getParam(html, null, null, /<img\s*src="(includes\/securimage\/securimage_show[^"]*)/i);
	
	var captchaa;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet(baseurl + href);
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}

	html = AnyBalance.requestPost(baseurl + 'login.php', {
		field_login: prefs.login,
		field_password: prefs.password,
		captcha:captchaa,
		submit_login: 'Login'
	}, addHeaders({Referer: baseurl + 'login.php'}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /'msg-error'(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error && /Wrong login or password/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	getParam(html, result, 'balance', /Balance:(?:[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'srv_number', /Server №:(?:[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'srv_name', /Selected Server IP:(?:[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Selected Server IP:(?:[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
	if(isAvailable(['subscription_0', 'subscription_1', 'subscription_2', 'subscription_date_0', 'subscription_date_1', 'subscription_date_2'])) {
		html = AnyBalance.requestGet(baseurl + 'packets.php', g_headers);
		
		var allSubscr = sumParam(html, null, null, /<tr[^>]*>(?:[^>]*>){9}[^>]*"timeTill">\s*\d+\.\d+\.\d{2,4}(?:[^>]*>){2}/ig);
		AnyBalance.trace('Найдено подписок с датами: ' + allSubscr.length);
		
		for(var i = 0; i < allSubscr.length; i++) {
			var curr = allSubscr[i];
			getParam(curr, result, 'subscription_'+i, /<a [^>]*>([^<]*)<\/a>/i, [replaceTagsAndSpaces, /◄{1,}\s{1}/i, ''], html_entity_decode);
			getParam(curr, result, 'subscription_date_'+i, /class="timeTill"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseDate);
			// В манифесте только 3 объявлено
			if(i >= 3)
				break;
		}
	}
	
	AnyBalance.setResult(result);
}