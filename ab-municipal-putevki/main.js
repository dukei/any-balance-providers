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
	var baseurl = 'http://www.dszn.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.name, 'Введите ваше имя!');
	checkEmpty(prefs.patronymic, 'Введите ваше отчество!');
	checkEmpty(prefs.surname, 'Введите вашу фамилию!');
	checkEmpty(/\d{1,2}\.\d{1,2}\.\d{4}/.test(prefs.birthDate), 'Введите вашу дату рождения в формате ДД.ММ.ГГГГ (например 12.01.1982)!');
	
	var html = AnyBalance.requestGet(baseurl + 'activities/informatsiya_o_putevkakh/in-the-sanatorium-and-spa-institutions/informing-about-the-state-of-order-to-receive-vouchers-for-sanatorium-and-spa-treatment.php', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'activities/informatsiya_o_putevkakh/in-the-sanatorium-and-spa-institutions/informing-about-the-state-of-order-to-receive-vouchers-for-sanatorium-and-spa-treatment.php', {
		lastName: prefs.surname,
		firstName: prefs.name,
		secondName: prefs.patronymic,
		birthDate: prefs.birthDate,
		snilsNumber: '',
		submit: 'Поиск'
	}, addHeaders({Referer: baseurl + 'activities/informatsiya_o_putevkakh/in-the-sanatorium-and-spa-institutions/informing-about-the-state-of-order-to-receive-vouchers-for-sanatorium-and-spa-treatment.php'}));
	
	if (!/Уважаемый\(ая\)/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить информацию. Сайт изменен?');
	}

	var table = getParam(html, null, null, /Уважаемый\(ая\)[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/i);
	if(!table)
		throw new AnyBalance.Error('Не удалось найти таблицу с результатами. Сайт изменен?');

	var rows = sumParam(table, null, null, /<tr[^>]*>(?:\s*<td[^>]*>[\s\S]*?<\/td>){4}\s*<\/tr>/ig);

	if(!rows.length)
		throw new AnyBalance.Error('Не удалось найти результаты.');

	var result = {success: true}, cells;
	for (var i = 0, toi = rows.length; i < toi && i < 4; i++) {
		cells = sumParam(rows[i], null, null, /<td[^>]*>[^<]*/ig, replaceTagsAndSpaces, html_entity_decode);
		getParam(cells[1] + ' (' + cells[0] + ')', result, 'direction' + i);
		getParam(cells[2], result, 'number' + i, null, null, parseBalance);
	}
	
	getParam(prefs.name + ' ' + prefs.patronymic, result, '__tariff');
	
	AnyBalance.setResult(result);
}