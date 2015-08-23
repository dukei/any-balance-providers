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

var g_phrases = {
	ru: {},
	me: {}
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.one-card.me';
	AnyBalance.setDefaultCharset('utf-8');
	
	if(!prefs.lang || !g_phrases[prefs.lang])
		prefs.lang = 'ru';

	checkEmpty(prefs.login, 'Enter login!');
	checkEmpty(prefs.password, 'Enter password!');

	var html = AnyBalance.requestGet(baseurl + '/' + prefs.lang, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Error connecting provider site! Try to refresh later.');
	}
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + '/' + prefs.lang + '/extern/personal-register', {
		login: prefs.login,
		password: prefs.password,
		cabinetLogin:	'1'
	}, addHeaders({Referer: baseurl + '/' + prefs.lang + '/'}));

	var json = getJson(html);
	if(!json.success){
		var error = json.message || 'Invalid login or password';
		if (error)
			throw new AnyBalance.Error(error, null, /Invalid login or password|Неверный номер телефона|Неверный пароль|Pogrešna lozinka/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Could not enter provider site. Is the site changed?');
	}

	html = AnyBalance.requestGet(baseurl + '/' + prefs.lang + '/personal?action=recommendations', g_headers);
	if (!/\/logout/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Could not redirect to provider site. Is the site changed?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /<div[^>]+ball-card-ag[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /<a[^>]+name-card-ag[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
	
	html = AnyBalance.requestGet(baseurl + '/' + prefs.lang + '/personal?action=cards', g_headers);
	getParam(html, result, 'num', /<td[^>]+class="numbercard[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	sumParam(html, result, '__tariff', /<td[^>]+class="numbercard[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
	getParam(html, result, 'status', /<td[^>]+class="status[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'type', /<td[^>]+class="type[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	sumParam(html, result, '__tariff', /<td[^>]+class="type"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
	getParam(html, result, 'till', /<td[^>]+class="validity[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'status', /Статус:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}