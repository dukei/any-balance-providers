/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'en-US;q=0.8,en;q=0.6',
	'Cache-Control': 'max-age=0',
	'Connection':'keep-alive',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.111 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
    var baseurl = "http://m.transaero.ru/";

    var incapsule = Incapsule(baseurl);
    var html = AnyBalance.requestGet(baseurl, g_headers);
    if(incapsule.isIncapsulated(html))
        html = incapsule.executeScript(html);
	
    var action = getParam(html, null, null, /<a href="\/([^"]+)(?:[^>]*>){3}\s*Привилегия/i, null, html_entity_decode);
    if(!action){
    	AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удаётся найти ссылку на вход. Сайт изменен или проблемы на сайте.');
    }
	
	html = AnyBalance.requestGet(baseurl + action, g_headers);

    var action = getParam(html, null, null, /<form[^>]*action="\/([^"]+)/i, null, html_entity_decode);
    if(!action){
    	AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удаётся найти форму входа. Сайт изменен или проблемы на сайте.');
    }
	
    html = AnyBalance.requestPost(baseurl + action, {
        lastName:prefs.surname,
        cardno:prefs.login,
        pin:prefs.password
    }, g_headers);

	if (!/"Выход"/i.test(html)) {
		var error = sumParam(html, null, null, /<span style=[^>]*color:#990000[^>]*>([\s\S]*?)<\//ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};

    getParam(html, result, 'balance', />\s*Всего баллов(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', />\s*Номер карты(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'cardnum', />\s*Номер карты(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
