/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.64 Safari/537.31',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://stat.micron-media.ru/";
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	AnyBalance.setDefaultCharset('UTF-8');
	
    var html = AnyBalance.requestPost(baseurl + 'utm5/', {
        login:prefs.login,
        password:prefs.password,
    }, addHeaders({Referer: baseurl + 'utm5/'})); 
	
    if(!/module=zz_logout/i.test(html)){
        var error = getParam(html, null, null, [/<p style='color:red'>([\s\S]*?)<\//i, /(?:[\s\S]*?<BR[^>]*>){2}([\s\S]*?)<BR>/i], replaceTagsAndSpaces, html_entity_decode);
        if (error)
			throw new AnyBalance.Error(error, null, /Неверно указаны логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
    var result = {success: true};
	
    getParam(html, result, 'id', /<td[^>]*>ID<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance', /<td[^>]*>Баланс<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /<td[^>]*>ФИО<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'account', /<td[^>]*>Основной лицевой счет<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balanceCredit', /<td[^>]*>Кредит<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'nds', /<td[^>]*>НДС<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	
    var href = getParam(html, null, null, /<a\s+href='\/([^']*)[^>]*>Тарифы и услуги/i, replaceTagsAndSpaces, html_entity_decode);
	html = AnyBalance.requestGet(baseurl + href, g_headers);
    getParam(html, result, '__tariff', /<TD[^>]*>Текущий ТП<\/TD>(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}
