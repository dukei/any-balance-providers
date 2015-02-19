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
	var baseurl = 'https://info-msk.rusfinance.ru:7777/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'jsso/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'jsso/j_security_check', {
		username: prefs.login,
		j_password: prefs.password,
		j_username: prefs.login
	}, addHeaders({Referer: baseurl + 'jsso/'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="serverResponseLabelError"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Указан неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var container = /<div id="content">(?:[\s\S](?!<!-- #content -->))+[\s\S]/i.exec(html);
	if(isArray(container) && container.length)
		container = container[0];
	else
		throw new AnyBalance.Error('Произошла ошибка на сервере, пожалуйста, сообщите разработчикам!');

	var credits = container.match(/<div class="section">(?:[\s\S](?!<div class="section">|<!-- MAIN CONTENT (END) -->))+[\s\S]/ig);
	if(!credits.length)
		throw new AnyBalance.Error('Не найдено ни одного кредита');

	var credit;
	if(prefs.num){
		var filtered = credits.filter(function(credit){ return new RegExp(prefs.num).test(credit); });
		if(filtered.length > 1)
			throw new AnyBalance.Error('Найдено больше одного кредита с по номеру договора ' + prefs.num);
		else if(filtered.length === 0)
			throw new AnyBalance.Error('Не найдено ни одного кредита по договору ' + prefs.num);
		else
			card = filtered[0];
	} else {
		credit = credits[0];
	}
	AnyBalance.trace('Найден кредит:' + credit);
	
	var result = {success: true};
	
	getParam(html, result, 'monthly_payment', /В размере:(?:[\s\S](?!<\/span>))+[\s\S]/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /class="fio">([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, ['currency_bal', 'balance'], /В размере:(?:[\s\S](?!<\/span>))+[\s\S]/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'recommend_payment_date', /Рекомендуем внести(?:[\s\S](?!<\/span>))+[\s\S]/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'type', /Тип кредита:<\/td>((?:[\s\S](?!<\/))+[\s\S])/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'date', /Дата оформления кредита:<\/td>((?:[\s\S](?!<\/))+[\s\S])/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'summ_total', /Сумма кредита<\/td>((?:[\s\S](?!<\/))+[\s\S])/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'summ_debt', /Остаток ссудной задолженности:<\/td>((?:[\s\S](?!<\/))+[\s\S])/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency_summ', 'summ_total', 'summ_debt'], /Сумма кредита<\/td>((?:[\s\S](?!<\/))+[\s\S])/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'past_due', /Просроченная задолженность:<\/td>((?:[\s\S](?!<\/))+[\s\S])/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'time', /Срок кредита, в месяцах:<\/td>((?:[\s\S](?!<\/))+[\s\S])/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'closed', /Договор закрыт:<\/td>((?:[\s\S](?!<\/))+[\s\S])/i, replaceTagsAndSpaces, html_entity_decode);

	AnyBalance.setResult(result);
}