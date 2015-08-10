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

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://my.network.lviv.ua/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl + 'ajax/index/authfl', {
        login:prefs.login,
        password:prefs.password,
    }, g_headers); 

	var found = /<us_uid>([\s\S]*?)<\/us_uid>/i.exec(html);
    if(!found)
        throw new AnyBalance.Error('Не удалось получить ID сесии. Сайт изменен?');

	// Запускает на сервере обновление балансов
	html = AnyBalance.requestPost(baseurl + 'ajax/users/stattrafflex', {
		uid:found[1],
    }, g_headers); 
	
	if(!/<time_on>/.test(html))
		throw new AnyBalance.Error('Не удалось получить ID сесии. Сайт изменен?');

	html = AnyBalance.requestGet(baseurl + 'ajax/users/getuserdatafl', addHeaders({Referer: baseurl+'ajax/users/getuserdatafl'})); 
	var result = {success: true};
	getParam(html, result, 'date_itog', /date_itog\s*=\s*"([^"]+)/i, null, parseDate);
	getParam(html, result, 'days_left', /days_left\s*=\s*"([^"]+)/i, null, parseBalance);
	getParam(html, result, 'fio', /fio\s*=\s*"([^"]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /deposit\s*=\s*"([^"]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'credit', /credit\s*=\s*"([^"]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /tarif\s*=\s*"([^"]+)/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
