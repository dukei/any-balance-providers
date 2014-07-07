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
	var baseurl = 'https://online.bcs.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'bank/web/guest/home', g_headers);
	
	if(AnyBalance.getLastStatusCode() > 400) {
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	}
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'bank/web/guest/home?p_p_id=LoginPortlet_WAR_bcsinternetserverportalapp&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=login&p_p_cacheability=cacheLevelPage', {
		'_LoginPortlet_WAR_bcsinternetserverportalapp_login': prefs.login,
		'_LoginPortlet_WAR_bcsinternetserverportalapp_password': prefs.password,
		'_LoginPortlet_WAR_bcsinternetserverportalapp_captchaText': ''
	}, addHeaders({Referer: baseurl + 'bank/web/guest/home', 'X-Requested-With':'XMLHttpRequest'}));
	
	var json = getJson(html);
	
	if (!json.success) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + json.redirect, g_headers);
	
	html = AnyBalance.requestGet(baseurl + 'bank/group/bcs/accountsandcards', g_headers);
	
	var result = {success: true};
	
	var card = getParam(html, null, null, new RegExp('<tr class="ui-widget-content(?:[^>]*>){3}[^>]*'+ (prefs.cardnum || '') +'(?:[^>]*>){46}\\s*</tr>','i'));
	if(!card) {
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.cardnum ? 'карту/счет с последними цифрами' + prefs.cardnum: 'ни одной карты или счета!'));
	}
	
	getParam(card, result, '__tariff', /<tr class="ui-widget-content(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(card, result, 'cardname', /<tr class="ui-widget-content(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(card, result, 'accnumber', /<tr class="ui-widget-content(?:[^>]*>){5}([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
	getParam(card, result, 'balance', /<tr class="ui-widget-content(?:[^>]*>){10}([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(card, result, ['currency', 'balance'], /<tr class="ui-widget-content(?:[^>]*>){10}([\s\S]*?)</i, replaceTagsAndSpaces, parseCurrency);
	
	AnyBalance.setResult(result);
}