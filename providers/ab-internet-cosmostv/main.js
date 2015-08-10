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

function getAction(html) {
	var action = getParam(html, null, null, /<form[^>]*action="([^"]+)/i, [replaceTagsAndSpaces, /%2F/ig, '/'], html_entity_decode);
	if(!action) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму для запроса. Сайт изменен?');
	}
	return action;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://private.cosmostv.by:8443/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'lk_auth', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	
	var action = getAction(html);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == '_58_login') 
			return prefs.login;
		else if (name == '_58_password')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(action, params, addHeaders({Referer: baseurl + 'lk_auth'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	// Если есть номер контракта, надо выбрать его из списка
	if(prefs.account) {
		var contractsForm = getParam(html, null, null, /<form id="frm_contracts"[\s\S]*?<\/form>/i);
		action = getAction(contractsForm);
		
		var id = getParam(contractsForm, null, null, new RegExp('option value="(\\d+)[^>]*>\\s*' + prefs.account,'i'))
		
		var params = createFormParams(html, function(params, str, name, value) {
			if (name == 'id_contract') 
				return id;

			return value;
		});
		
		html = AnyBalance.requestPost(action, params, addHeaders({Referer: baseurl + 'group/cosmostv/main'}));
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /баланс:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Тип:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /Статус:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}