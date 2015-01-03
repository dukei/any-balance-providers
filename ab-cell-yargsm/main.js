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
    var baseurl = 'https://www.yargsm.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
	var html = AnyBalance.requestPost(baseurl + 'issa/login.php', {
        phone:prefs.login,
        password:prefs.password,
        action:'l'
    }, g_headers); 

    if(!/Logout/i.test(html)){
    	var url = AnyBalance.getLastUrl();
     	if(AnyBalance.getLastStatusCode() == 404 && /message.php/i.test(url)){
     	    AnyBalance.trace('Неправильная переадресация. Поправим-ка ошибку и переадресуем правильно.');
     		html = AnyBalance.requestGet(url.replace(/\.ru\/message\.php/i, '.ru/issa/message.php'), g_headers);
            var error = getParam(html, null, null, /<h1[^>]*>[\s\S]*?<\/h1>\s*(?:<p[^>]*>[\s\S]*?<\/p>)/i, replaceTagsAndSpaces, html_entity_decode);
            if(error)
               throw new AnyBalance.Error(error, null, /неправильный логин или пароль/i.test(error));
     	}

        var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
	html = AnyBalance.requestGet(baseurl + 'issa/balance.php', g_headers);

    var result = {success: true};
    getParam(html, result, 'fio', /Клиент:[\s\S]*?<td[^>]*>([\s\S]*?)<\//i, null, html_entity_decode);
	getParam(html, result, 'acc', /Номер счета:[\s\S]*?<td[^>]*>([\s\S]*?)<\//i, null, html_entity_decode);
	getParam(html, result, 'balance', /Баланс[\s\S]*?<td[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<td[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'phone', /Телефонный номер:[\s\S]*?<td[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'status', /Статус:[\s\S]*?<td[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);

    getParam(html, result, 'time', /Время:[\s\S]*?<td[^>]*>[^<]*?\((\d+)\s*[cс]/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'sms', /Количество SMS:[\s\S]*?<td[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'spent', /Потрачено в текушем месяце:[\s\S]*?<td[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'thres', /Порог:[\s\S]*?<td[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}