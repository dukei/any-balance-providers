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
	var baseurl = 'http://crimeagasnet.ru:8106';
	AnyBalance.setDefaultCharset('utf-8');

	return createList();
	
	checkEmpty(prefs.fam, 'Введите фамилию!');
	checkEmpty(prefs.licschet, 'Введите лицевой счет!');
	
	var html = AnyBalance.requestGet(baseurl + '/custom_scripts/abonent.php', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var captchaUrl = getParam(html, null, null, /<img[^>]+id="captcha"[^>]*src="([^"]*)/i, null, html_entity_decode);
	var img = AnyBalance.requestGet(baseurl + captchaUrl, g_headers);
	var captcha = AnyBalance.retrieveCode('Введите код с картинки', img);
	
	html = AnyBalance.requestPost(baseurl + '/custom_scripts/abonent.php', {
		fam: prefs.fam,
		nl: prefs.licschet,
		uegh: prefs.region,
		captcha_code: captcha,
		search:'Отправить'
	}, addHeaders({Referer: baseurl + '/custom_scripts/abonent.php'}));
	
	if (!/<input[^>]+id="fam_res"/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="err"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Пользователь не найден/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Долг на (?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /<input[^>]+id="fam_res"[^>]*value="([^"]*)/i, null, html_entity_decode);
	sumParam(html, result, '__tariff', /<input[^>]+id="fam_res"[^>]*value="([^"]*)/i, null, html_entity_decode, aggregate_join);
	sumParam(prefs.licschet, result, '__tariff', null, null, null, aggregate_join);
	
	AnyBalance.setResult(result);
}

function createList(){
	var baseurl = 'http://crimeagasnet.ru:8106';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl + '/custom_scripts/abonent.php', g_headers);
	var options = getElements(html, /<option[^>]*>/ig);
	var values = [], names = [];
	for(var i=0; i< options.length; ++i){
		var name = getParam(options[i], null, null, null, replaceTagsAndSpaces, html_entity_decode);
		var value = getParam(options[i], null, null, /<option[^>]+value="([^"]*)/i, null, html_entity_decode);
		values.push(value);
		names.push(name);
	}

	AnyBalance.setResult({success: true, values: values.join('|'), names: names.join('|')});
}