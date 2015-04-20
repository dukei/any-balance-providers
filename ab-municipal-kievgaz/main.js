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
	var baseurl = 'http://my.kyivgaz.ua/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'index.php', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'index.php', {
		login: prefs.login,
		password: prefs.password,
		submit: 'Увійти'
	}, addHeaders({Referer: baseurl + 'index.php'}));
	
	if (!/exit/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+title="Помилка!"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Особовий рахунок за таким номером ще не зареєстрований|Пароль не вірний/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + 'index.php?page=4', g_headers);

	var table = getParam(html , null, null, /Детальна інформація.\s*<\/h2>\s*<table[^>]*>([^]*?)<\/table>/i);
	if(!table){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не найдена таблица с детальной информацией. Сайт изменен?');
	}

	var lastRow = sumParam(table, null, null, /<tr[^>]*>[^]*?<\/tr>/ig).pop();
	if(!lastRow){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Таблица с детальной информацией пуста?');
	}

	var result = {success: true};
	
	getParam(lastRow, result, 'income', /(?:[^>]*>){14}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(lastRow, result, 'debt', /(?:[^>]*>){16}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}