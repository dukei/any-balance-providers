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
	var baseurl = 'http://ukvoshod.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	checkEmpty(prefs.company, 'Выберите ваше управляющую компанию!');
	
	var html = AnyBalance.requestGet(baseurl + 'index.php', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'index.php', {
		inn: prefs.company,
		login: prefs.login,
		pass: prefs.password
	}, addHeaders({Referer: baseurl + 'index.php'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Возможно не верный логин/пароль или управляющая компания.');
	}

	html = AnyBalance.requestGet(baseurl + 'lk/ls.php', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'debt', /Основной учет(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'accruals', /Основной учет(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'recalculation', /Основной учет(?:[^>]*>){6}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'payment', /Основной учет(?:[^>]*>){8}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'summary', /Основной учет(?:[^>]*>){10}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'peni', /Учет пени(?:[^>]*>){10}([^<]*)/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}