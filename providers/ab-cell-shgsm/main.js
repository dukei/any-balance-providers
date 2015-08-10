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
	var baseurl = 'http://web.shgsm.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'account/login?ReturnUrl=%2f', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'Number') 
			return prefs.login;
		else if (name == 'Password')
			return prefs.password;

		return value;
	});
    
	html = AnyBalance.requestPost(baseurl + 'Account/Login?ReturnUrl=%2F', params, addHeaders({Referer: baseurl + 'account/login?ReturnUrl=%2f'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="validation-summary-errors[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Ошибка в номере телефона или неверный пароль./i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
    html = AnyBalance.requestGet(baseurl + 'API/HomeValues/', addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /<Balance>([^]+)<\/Balance>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /<ClientName>([^]+)<\/ClientName>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'contract_id', /<ContractId>([^]+)<\/ContractId>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'phone', /<ContractNumberList>([\d]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /<PlanName>([^]+)<\/PlanName>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /<SubsStatus>([^]+)<\/SubsStatus>/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}