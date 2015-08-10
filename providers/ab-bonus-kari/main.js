/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/javascript, */*; q=0.01',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.101 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://oplata.kari.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'personal/pub/Entrance', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	
	var action = getParam(html, null, null, /data-validator-ajax-url="..\/([^"]+)/i);

	html = AnyBalance.requestPost(baseurl + 'personal/' + action, {
		ean: prefs.login,
		'id1_hf_0': '',
		password:'',
	}, addHeaders({
		Referer: baseurl + 'personal/pub/Entrance',
		'X-Requested-With':'XMLHttpRequest'
	}));

	// Без задержки не работает
	AnyBalance.sleep(1000);
	
	html = AnyBalance.requestPost(baseurl + 'personal/' + action, {
		ean: prefs.login,
		password: prefs.password,
		'id1_hf_0': '',
	}, addHeaders({
		Referer: baseurl + 'personal/pub/Entrance',
		'X-Requested-With':'XMLHttpRequest'
	}));
	
	if (!/"validated":true/i.test(html)) {
		var error = getParam(html, null, null, /errorMessage":"([^"]+)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /несуществующий номер/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'personal/main', addHeaders({ Referer: baseurl + 'personal/pub/Entrance' }));
	
	var result = {success: true};
	
	getParam(html, result, '__tariff', /Карта №(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /personal\/history(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus', /Начислено<\/span>(?:[^>]*>){5}([\s\d.,-]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'avail', /Доступно<\/span>(?:[^>]*>){5}([\s\d.,-]+)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}