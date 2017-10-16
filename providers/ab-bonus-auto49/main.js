/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': '*/*',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

var g_levels = {
	'STANDARD': 'Стандарт',
	'undefined': 'Неизвестный',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://bonus.auto49.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	AB.checkEmpty(prefs.login, 'Введите номер карты!');
	
	var html = AnyBalance.requestGet(baseurl + 'ajax/card.php?id_card=' + prefs.login, addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		'Referer': baseurl + 'personal/',
	}));
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var json = getJsonObject(html);
	AnyBalance.trace('getJsonObject output: ' + JSON.stringify(json));
	
	var balance = AB.getParam(json.usage + '', null, null, null, AB.replaceTagsAndSpaces, AB.parseBalance);
	if (!isset(balance)) {
		var error = json.usage;
		if (error)
			throw new AnyBalance.Error(error, null, /Карта не найдена/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	AB.getParam(balance, result, 'balance');
	AB.getParam(g_levels[json.level], result, 'level');
	AB.getParam(json.last_date, result, 'last_time', null, AB.replaceTagsAndSpaces, AB.parseDateWord);
	
	AnyBalance.setResult(result);
}