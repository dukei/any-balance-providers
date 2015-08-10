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
	var baseurl = 'https://contulmeu.moldcell.md/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'ps/selfcare_uni/login.php?lang_id=ru', g_headers);

	var captchaa;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet(baseurl+ 'ps/selfcare_uni/crypt/cryptographp.php?cfg=0&&'+Math.round(Math.random(0)*1000)+1);
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	
	html = AnyBalance.requestPost(baseurl + 'ps/selfcare_uni/login.php', {
		'X_Username': prefs.login,
		'X_Password': prefs.password,
		'code': captchaa
	}, addHeaders({Referer: baseurl + 'ps/selfcare_uni/login.php?lang_id=ru'}));
	
	var href = getParam(html, null, null, /<a\s+href="\/(UWWW\/ACCOUNT_INFO[^"]*)/i);
	
	if (!href) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error && /Неверный логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	html = AnyBalance.requestGet(baseurl+ href);
	
	var result = {success: true};
	
	getParam(html, result, '__tariff', /Текущий тарифный план(?:[^>]*>){22}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /Клиент(?:[^>]*>){7}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Баланс(?:[^>]*>){6}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /Баланс(?:[^>]*>){6}([^<]*)/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'phone', /<select[^>]*>\s*<option[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_name', /№ счета(?:[^>]*>){6}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	// Минуты внутри сети
	sumParam(html, result, 'mins_net_left', /Звонки в сети(?:[^>]*>){11}(\d+:\d+[^<]*мин)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	// Минуты 
	sumParam(html, result, 'mins_left', /Звонки по Молдове(?:[^>]*>){11}(\d+:\d+[^<]*мин)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	// трафик
	sumParam(html, result, 'traf_left', /Интернет трафик(?:[^>]*>){8}([^<]*)/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);

	AnyBalance.setResult(result);
}