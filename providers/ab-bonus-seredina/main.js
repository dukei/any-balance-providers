/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.lk2.seredina.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'index.php/public/login', {
		login: prefs.login,
		password: prefs.password
	}, addHeaders({
		Referer: baseurl ,
		'X-Requested-With': 'XMLHttpRequest'
	}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="ui-body ui-body-a ui-corner-all"[^>]*>([\s\S]*?)<\/h4>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /contact not found/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};

	var lastName = getParam(html, null, null, /Фамилия[\s\S]*?<input[^>]+value="([\s\S]*?)"/i, replaceTagsAndSpaces) || '';
	var firstName = getParam(html, null, null, /Имя[\s\S]*?<input[^>]+value="([\s\S]*?)"/i, replaceTagsAndSpaces) || '';
	var midName = getParam(html, null, null, /Отчество[\s\S]*?<input[^>]+value="([\s\S]*?)"/i, replaceTagsAndSpaces) || '';

	getParam(html, result, 'balance', /Общий Баланс[\s\S]*?<input[^>]+value="([\s\S]*?)"/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'activeBalance', /Активный баланс[\s\S]*?<input[^>]+value="([\s\S]*?)"/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'spentBonuses', /Потрачено баллов[\s\S]*?<input[^>]+value="([\s\S]*?)"/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'receivedBonuses', /Получено баллов[\s\S]*?<input[^>]+value="([\s\S]*?)"/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'purchases', /Количество покупок[\s\S]*?<input[^>]+value="([\s\S]*?)"/i, replaceTagsAndSpaces, parseBalance);
	getParam(lastName+' '+ firstName + ' ' + midName, result, 'fio');

	AnyBalance.setResult(result);
}