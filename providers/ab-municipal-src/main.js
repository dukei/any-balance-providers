/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://lc.irc-saransk.ru';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl+'/Account/LogOn', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl+'/Account/LogOn', {
		UserName: prefs.login,
		Password: prefs.password
	}, addHeaders({
		Referer: baseurl
	}));
	
	if (!/logoff/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="validation-summary-errors"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /введена неправильная пара логин\/пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};

	html = AnyBalance.requestGet(baseurl+'/Counters/InputData', g_headers);

	var table = getParam(html, null, null, /<table[^>]+id="test_tbl2"[^>]*>(?:[\s\S]*?<tr[^>]*>){1}([\s\S]*?)<\/table>/i);
	var services = sumParam(table, null, null, /<tr[^>]*>([\s\S]*?)<\/tr>/ig);
	AnyBalance.trace('Количество найденных услуг: ' + services.length);

	for (var i=0; i<services.length; ++i) {
		var counter_name = null;
		var service = services[i];

		if(/Хвс/i.test(service))
			counter_name = "hvs";
		else if(/гвс/i.test(service))
			counter_name = "gvs";
		else if(/Д\(([\s\S]*?)Электросчетчик/i.test(service))
			counter_name = "electricityMeterD";
		else if(/Н\(([\s\S]*?)Электросчетчик/i.test(service))
			counter_name = "electricityMeterN";

		if(!counter_name)
			AnyBalance.trace('Неизвестная услуга: ' + service);
		else
			getParam(service, result, counter_name, /<td[^>]*>([^>]*)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	}

	AnyBalance.setResult(result);
}