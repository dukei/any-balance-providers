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
	var baseurl = 'https://www.reggi.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
    checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
    try {
        html = AnyBalance.requestPost(baseurl + 'signin/', {
            login: prefs.login,
            password: prefs.password
        }, addHeaders({Referer: baseurl + 'signin/'}));
    } catch(e) {
        var html = AnyBalance.requestGet(baseurl + 'user/domains/search/', g_headers);
    }
    
	if (!/signout/i.test(html)) {
		var error = getParam(html, null, null, /class="error"([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
    // <tr>[^"]*(?:[^>]*>){11}\s*festival-moscow[^<]*(?:[^>]*>){72}\s*<\/tr>
    var regExp = new RegExp('<tr>[^"]*(?:[^>]*>){11}\\s*'+ (prefs.domain || '') +'[^<]*(?:[^>]*>){72}\\s*</tr>', 'i');
    var tr = getParam(html, null, null, regExp);
    checkEmpty(tr, 'Не удалось найти ' + (prefs.domain ? 'домен с именем' + prefs.domain : 'ни одного домена.'), true);
    
	var result = {success: true};
	
	getParam(html, result, 'balance', /Текущий баланс(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'account', /Лицевой счет(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    
    getParam(tr, result, '__tariff', /(?:[^>]*>){12}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'expires', /(?:[^>]*>){41}([^<]+)/i, replaceTagsAndSpaces, parseDate);
    getParam(tr, result, 'status', /(?:[^>]*>){18}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    
	AnyBalance.setResult(result);
}