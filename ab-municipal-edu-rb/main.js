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
	var prefs = AnyBalance.getPreferences(),
		baseurl = 'https://edu-rb.ru/',
		formats = {
			series: /^([IVX]{1,3})-([а-яё]+)$/i,
			number: /^\d{6}$/i,
			date: /^\d{2}\.\d{2}\.\d{4}$/i
		};

	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(formats.series.test(prefs.series), 'Введите серию документа. В серии свидетельства о рождении РФ должны присутствовать римские цифры и буквы русского алфавита: например, III-АР!');
	checkEmpty(formats.number.test(prefs.number), 'Введите номер документа (6 цифр)!');
	checkEmpty(formats.date.test(prefs.date), 'Введите дату выдачи в формате ДД.ММ.ГГГГ: например 25.02.2014!');

	var series = formats.series.exec(prefs.series);
	
	var html = AnyBalance.requestGet(baseurl + '?page=status', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'series') 
			return series[1];
		else if (name == 'series2')
			return series[2];
		else if (name == 'number')
			return prefs.number;
		else if (name == 'date')
			return prefs.date;

		return value;
	});

	html = AnyBalance.requestPost(baseurl + '?page=status', params, addHeaders({Referer: baseurl + '?page=status'}));

	if (!/Номер в очереди/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?', null, /Заявление не найдено/i.test(html));
	}

	var result = {success: true};

	getParam(html, result, 'fio', /<h3>[\s\S]+?<\/h3>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'birthday', /Дата рождения[^>]+>([^<]+)/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'date', /Дата подачи заявления[^>]+>([^<]+)/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'DOU', /Желаемый ДОУ[^>]+>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'areaQueueNum', /Номер в очереди[^>]+>([^\/]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'preferQueueNum', /Номер в очереди[^>]+>[^\/]+\/([^<]+)/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}