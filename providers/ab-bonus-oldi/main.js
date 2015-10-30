/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://www.oldi.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
    var html = AnyBalance.requestGet(baseurl + 'auth/index.php?login=yes', g_headers);

	html = AnyBalance.requestPost(baseurl + 'auth/index.php?login=yes', {
		AUTH_FORM:'Y',
		TYPE:'AUTH',
		backurl:'/auth/index.php',
		USER_LOGIN:prefs.login,
		USER_PASSWORD:prefs.password,
		Login:'Авторизоваться',
    }, addHeaders({Referer: baseurl + 'auth/index.php?login=yes'})); 

    if(!/logout=yes/i.test(html)){
        var error = getParam(html, null, null, /<[^>]*class="error"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(html));
		
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + 'personal/move_card/', g_headers);
	
	var result = {success: true};

	getParam(html, result, 'suumazakazov', /Сумма покупок:[\s\S]*?<span[^>]+price[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'zakazy', /Количество покупок:[\s\S]*?<span[^>]+price[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /<div[^>]+class='cartnum'[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'bonus', /Бонусный счёт:[\s\S]*?<span[^>]+price[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);		
	getParam(html, result, 'price', /Ценовая колонка:[\s\S]*?<span[^>]+price[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);		
	getParam(html, result, 'till', /Ближайщий срок сгорания:[\s\S]*?<span[^>]+price[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);		
	getParam(html, result, 'burn', /Сгораемые бонусы:[\s\S]*?<span[^>]+price[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);		
	
    AnyBalance.setResult(result);
}