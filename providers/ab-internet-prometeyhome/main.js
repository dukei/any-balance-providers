/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function parseTariff(value) {
    value = html_entity_decode(value);
    return replaceAll(value, [ /(\"|\\)/gi, '' ]);
}

function main() {
    var baseurl = 'http://bill.prometeyhome.ru/';
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('cp1251'); 
    
    var html = AnyBalance.requestGet(baseurl, g_headers);
	html = AnyBalance.requestPost(baseurl + 'login.phtml', {
                'data[login]': prefs.login,
                'data[password]': prefs.password,
                'action': 'entry'
           }, addHeaders({'Referer': baseurl + 'login.phtml'})); 

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div class=["']errors["']>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error) {
			throw new AnyBalance.Error(error, null, /неправильно/i.test(error));
        }
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'personal.phtml', g_headers);

    var result = {success: true};
	
    getParam(html, result, 'balance', /<u>Баланс:([\s\S]*?)<\/u>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Подключен на : [^*]([\s\S]*?)<\//i, replaceTagsAndSpaces, parseTariff);
    getParam(html, result, 'access', /Интернет-доступ[^>]*>\s*[^>]*>[^>]*>[^>]*>\s*([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fee', /Итого[^>]*>\s*[^>]*>[^>]*>\s*([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'ip', /IP-адрес[^>]*>\s*[^>]*>[^>]*>[^>]*>\s*([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}