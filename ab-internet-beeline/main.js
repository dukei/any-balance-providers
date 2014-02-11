/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
function parseTrafficGb(str) {
	var val = getParam(str.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
	return parseFloat((val / 1000).toFixed(2));
}

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	var baseurl = "https://lk.beeline.ru/";
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	if (!prefs.__dbg) {
		var html = AnyBalance.requestGet(baseurl); //Чтобы кука установилась
		html = AnyBalance.requestPost(baseurl, {
			login: prefs.login,
			password: prefs.password
		});
	} else {
		//Из-за ошибки в Хроме логин не может быть выполнен, потому что там используется переадресация с безопасного на обычное соединение.
		//Чтобы отлаживать в отладчике, зайдите в свой аккаунт вручную, и раскоментарьте эти строчки. Не забудьте закоментарить обратно потом!
		var html = AnyBalance.requestGet(baseurl + 'news/');
	}
	
	if (!/\/logout\//.test(html)) {
		var error = getParam(html, null, null, /<ul class="errorlist">([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error) throw new AnyBalance.Error(error, null, /Логин или пароль неправильные/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс:[\s\S]*?<span[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus', /Бонусы:[\s\S]*?<span[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
	if (AnyBalance.isAvailable('status', 'status_internet', 'status_tv', 'userName', 'till', 'topay', 'abon')) {
		html = AnyBalance.requestGet(baseurl + 'personal/');
		
		getParam(html, result, 'status', /usluga_name">Текущий статус[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'status_internet', /usluga_name">Интернет[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'status_tv', /usluga_name">Телевидение[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'userName', /usluga_name">Владелец договора[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'till', /Дата окончания расчетного периода[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'topay', /Сумма к оплате[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, html_entity_decode);
		getParam(html, result, 'abon', /Сумма ежемесячного платежа[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	}
	
	html = AnyBalance.requestGet(baseurl + 'internet/');
	
	getParam(html, result, '__tariff', /Тарифный план[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'traffic', /Предоплаченный трафик[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
	
	AnyBalance.setResult(result);
}
