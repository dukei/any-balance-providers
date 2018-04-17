/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	Connection: 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.72 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин в личный кабинет Pride');
	checkEmpty(prefs.password, 'Введите пароль.');
	
	AnyBalance.setDefaultCharset('UTF-8');
	
	var baseurl = 'http://home.nv-net.ru/tvn/acc/services/?page=accs';
	var ineturl = 'http://home.nv-net.ru/tvn/acc/services/?page=internet_info';
	var phoneurl = 'http://home.nv-net.ru/tvn/acc/services/?page=phone_info';
	var tvurl = 'http://home.nv-net.ru/tvn/acc/services/?page=tax_change';
	
	
	var html = AnyBalance.requestPost(baseurl, {
		'auth_action':'login',
		'name':prefs.login,
		'pass':prefs.password,
	}, g_headers);


	if(!/\?auth_action=logout/.test(html)){
		var error = getParam(html, null, null, /<span class="auth_error">([\s\S]*?)<\/span>/, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось войти в кабинет');
	}

	var result = {success: true};
	getParam(html, result, 'TV', /Телевидение<\/td>*?\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'Phone', /Телефония<\/td>*?\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'ChekinAccount', /Расчетный<\/td>*?\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'Internet', /Интернет<\/td>*?\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'Hotspot', /Хотспот<\/td>*?\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'PhonePC', /Телефония на ПК<\/td>*?\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'Bonus', /Бонусный счет<\/td>*?\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /Абонент:\s*<b><strong><i>([^<]+)*/i, replaceTagsAndSpaces, html_entity_decode);


	html = AnyBalance.requestPost(ineturl, {
		'auth_action':'login',
		'name':prefs.login,
		'pass':prefs.password,
	}, g_headers);

	getParam(html, result, 'TarifInternet', /Текущий тариф:<\/b><\/span><\/td>*?\s*<td[^>]*>([^<]+)*/i, replaceTagsAndSpaces, html_entity_decode); 

	html = AnyBalance.requestPost(phoneurl, {
		'auth_action':'login',
		'name':prefs.login,
		'pass':prefs.password,
	}, g_headers);

	getParam(html, result, 'TarifPhone', /Текущий тариф:<\/b><\/span><\/td>*?\s*<td[^>]*>([^<]+)*/i, replaceTagsAndSpaces, html_entity_decode); 

	html = AnyBalance.requestPost(tvurl, {
		'auth_action':'login',
		'name':prefs.login,
		'pass':prefs.password,
	}, g_headers);

	getParam(html, result, 'TarifTV', /Текущий тарифный план: <\/span>\s*?<\/td>\s*?<td[^>]*>([^<]+)*/i, replaceTagsAndSpaces, html_entity_decode); 


	
	AnyBalance.setResult(result);
}


