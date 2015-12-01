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
	var baseurl = 'http://www.adamas.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'LOGIN')
			return prefs.login;
		else if (name == 'PASSWORD')
			return prefs.password;
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'index.php', params, addHeaders({Referer: baseurl}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="erorrs"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};

	html = AnyBalance.requestGet(baseurl + 'personal/', g_headers);

	var fName = getParam(html, null, null, /name="name"[^>]+value="([\s\S]*?)"/i, replaceTagsAndSpaces, html_entity_decode) || '';
	var lName = getParam(html, null, null, /name="last_name"[^>]+value="([\s\S]*?)"/i, replaceTagsAndSpaces, html_entity_decode) || '';
	var patronymic = getParam(html, null, null, /name="SECOND_NAME"[^>]+value="([\s\S]*?)"/i, replaceTagsAndSpaces, html_entity_decode) || '';

	getParam(lName + ' ' + fName + ' ' + patronymic, result, 'fio');
	getParam(html, result, 'phone', /Мобильный телефон:([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /(.*?)/, '+7$1'], html_entity_decode);
	getParam(html, result, 'discount', /name="DISCOUNT"[^>]+value="([\s\S]*?)"/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance', /name="BONUS"[^>]+value="([\s\S]*?)"/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cardNumber', /Номер карты:[\s\S]*?(\d+)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

	AnyBalance.setResult(result);
}