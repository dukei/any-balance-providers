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
	
    var baseurl = "http://transaero.ru/";

    var incapsule = Incapsule(baseurl);
    var html = AnyBalance.requestGet(baseurl + 'ru/privilege/argo-login', g_headers);
    if(incapsule.isIncapsulated(html))
        html = incapsule.executeScript(html);
	
	var form = getParam(html, null, null, /<form(?:[\s\S](?!<\/form>))*<input[^>]+name="FORM_CARDNO"[\s\S]*?<\/form>/i);
	if(!form){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}

    var action = getParam(form, null, null, /<form[^>]+action="\/([^"]*)/i, null, html_entity_decode);
    if(!action){
    	AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удаётся найти ссылку на вход. Сайт изменен или проблемы на сайте.');
    }
	
	html = AnyBalance.requestPost(baseurl + action, {
		FORM_LASTNAME: prefs.surname,
		FORM_CARDNO: prefs.login,
		FORM_PINCODE: prefs.password,
		ArgoPortletFormSubmit: 'Войти',
	}, addHeaders({Referer: baseurl + 'ru/privilege/argo-login'}));

	if (!/Уважаемый[^<]*!/i.test(html)) {
		var error = getParam(html, null, null, /<h1[^>]*>\s*Просмотр состояния счёта\s*<\/h1>\s*<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Регистрация не верна/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};

    getParam(html, result, 'balance', />\s*Вы набрали\s*<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /на ваш персональный счет\s*([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'cardnum', /на ваш персональный счет\s*([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /Уважаемый([^<]*)!/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function mainMobile(){
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
