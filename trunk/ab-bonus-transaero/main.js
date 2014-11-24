/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
    var baseurl = "http://m.transaero.ru/";

    var html = AnyBalance.requestGet(baseurl);
	
    var action = getParam(html, null, null, /<a href="\/([^"]+)(?:[^>]*>){3}\s*Привилегия/i, null, html_entity_decode);
    if(!action)
        throw new AnyBalance.Error('Не удаётся найти форму входа. Сайт изменен или проблемы на сайте.');
	
	html = AnyBalance.requestGet(baseurl + action);

    var action = getParam(html, null, null, /<form[^>]*action="\/([^"]+)/i, null, html_entity_decode);
    if(!action)
        throw new AnyBalance.Error('Не удаётся найти форму входа. Сайт изменен или проблемы на сайте.');
	
    html = AnyBalance.requestPost(baseurl + action, {
        lastName:prefs.surname,
        cardno:prefs.login,
        pin:prefs.password,
    });

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
