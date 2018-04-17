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
	var baseurl = 'https://stat.ktnet.kg';
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + '', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + '/pls/sip_w/www.GetHomePage', {
		p_logname: prefs.login,
		p_pwd: prefs.password,
	}, addHeaders({Referer: baseurl + ''}));
	
	var href = getParam(html, null, null, /<A[^>]*href="([^"]+)/i, replaceTagsAndSpaces);
	
	if (!href) {
		var error = getParam(html, null, null, /<TD[^>]*>\s*Сообщение об ошибке([\s\S]*?)<\/table>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + href, g_headers);
	
	// ищем нужный фрейм
	var frame = getParam(html, null, null, /<frame[^>]*src\s*=\s*"([^"]+ADM_PPPOE_INFO[^"]+)/i, replaceTagsAndSpaces);
	if(!frame) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти нужный фрейм, сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + '/pls/sip_w/' + frame, g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /<tr[^>]*>(?:(?!<\/?tr>)[\s\S])*?Текущее состояние лицевого счета((?:(?!<\/?tr>)[\s\S])*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balanceOfMonth', /<tr[^>]*>(?:(?!<\/?tr>)[\s\S])*?Состояние лицевого счета на начало текущего месяца((?:(?!<\/?tr>)[\s\S])*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'paymentsCurrentMonth', /<tr[^>]*>(?:(?!<\/?tr>)[\s\S])*?Платежи в текущем месяце((?:(?!<\/?tr>)[\s\S])*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'promisedPayment', /<tr[^>]*>(?:(?!<\/?tr>)[\s\S])*?Обещанные платежи((?:(?!<\/?tr>)[\s\S])*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'costsCurrentMonth', /<tr[^>]*>(?:(?!<\/?tr>)[\s\S])*?Расходы в текущем месяце((?:(?!<\/?tr>)[\s\S])*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'adjustments', /<tr[^>]*>(?:(?!<\/?tr>)[\s\S])*?Корректировки лицевого счета((?:(?!<\/?tr>)[\s\S])*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'credit', /<tr[^>]*>(?:(?!<\/?tr>)[\s\S])*?Кредит((?:(?!<\/?tr>)[\s\S])*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}