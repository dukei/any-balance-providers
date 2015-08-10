/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://stat.unetkom.ru/';
	AnyBalance.setDefaultCharset('windows-1251');
	
	if(!prefs.login)
		throw new AnyBalance.Error('Введите логин!');
	if(!prefs.password)
		throw new AnyBalance.Error('Введите пароль!');
		
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	html = AnyBalance.requestPost(baseurl, {
        login:prefs.login,
        password:prefs.password,
        submit:'Войти'
    }, addHeaders({Referer: baseurl}));
	
	if(!/logout/i.test(html)) {
		var error = getParam(html, null, null, /class=Error[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    var result = {success: true};
	getParam(html, result, 'fio', /Абонент:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, ['balance', 'deadline'], /Баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'acc_num', /Номер лицевого счета[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, ['abon', 'deadline'], /Абонентская плата:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /Статус:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'ip_adr', /Услуги и тарифы(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	// Попытаемся высчитать дату отключения
	if(isAvailable('deadline')){
		var date = new Date();
		var dayCount = 32 - new Date(date.getYear(), date.getMonth(), 32).getDate();
		// Теперь мы знаем сумму абонентской платы и количество дней в месяце, так что можем посчитать дату отключения
		var daysToDeadline = Math.round(result.balance/(result.abon/dayCount));
		date = date.getTime() + 86400000 * daysToDeadline;
		result.deadline = date;
	}
	
	html = AnyBalance.requestGet(baseurl + '?act=services', g_headers);
	getParam(html, result, '__tariff', /текущий тариф(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	getParam(html, result, 'incoming_internet', /Интернет траффик(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?входящего[\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'outgoing_internet', /Интернет траффик(?:[\s\S]*?<td[^>]*>){2}[\s\S]*?исходящего([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'incoming_local', /Внутрисетевой траффик(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?входящего[\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'outgoing_local', /Внутрисетевой траффик(?:[\s\S]*?<td[^>]*>){2}[\s\S]*?исходящего([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}