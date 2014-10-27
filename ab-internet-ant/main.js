/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://cabinet.a-n-t.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'index.php', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
    var fc = getParam(html, null, null, /name="fc"[\s]value="([^"]+)/i);
    
	html = AnyBalance.requestPost(baseurl + '?object=login', {
		'user_name': prefs.login,
		'user_pass': prefs.password,
        'fc': fc,
        'login': ''
	}, addHeaders({Referer: baseurl}));
    
	if (/Неверно/i.test(html)) {
		var error = getParam(html, null, null, /<div class="blink">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль|Неверно введено/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    html = AnyBalance.requestGet(baseurl + 'cabinet.php?action=info', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Состояние счета(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'account', /Учетная запись(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Тариф<\/td>(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'payment_acc', /Код плательщика(?:[^>]*>){6}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'traffic', /Скачано за текущий месяц(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /Статус учетной записи(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'dns', /Ваш DynDNS(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}