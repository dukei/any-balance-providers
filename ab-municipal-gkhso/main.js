/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	// 'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.94 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://www.kvartplata.ru/",
	baseurl2 = 'https://xn--f1aijeow.xn--p1ai/';

    AnyBalance.setDefaultCharset('utf-8'); 
	
    //AnyBalance.requestGet(baseurl2, g_headers);
    var html = AnyBalance.requestGet(baseurl2 + 'office/auth/', g_headers);
    html = AnyBalance.requestGet(baseurl + 'room/lk/login.action?extURL=https://xn--f1aijeow.xn--p1ai&loginLink=/office/login/&exitLink=/office/logout/', g_headers);
    //AnyBalance.requestGet(baseurl + 'room/lk/extAppLogin.action', g_headers);

    AnyBalance.setCookie("www.kvartplata.ru", "extAppExitUrl", '"https://xn--f1aijeow.xn--p1ai/office/logout/"');
    AnyBalance.setCookie("www.kvartplata.ru", "userLogin", prefs.login);
	
	//AnyBalance.requestGet(baseurl2, g_headers);
	
	if(AnyBalance.getLastStatusCode() > 400) {
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	}	
	
	var token = getParam(html, null, null, /"loginToken"[^>]*value="([^"]+)"/i);
	
    html = AnyBalance.requestPost(baseurl + 'room/lk/doLogin.action', {
		'struts.token.name':'loginToken',
		loginToken:token,
		loginModule:'lk',
		captchaCode:'x',
        userName:prefs.login,
        userPass:prefs.password,
        timezone: '-240'
    }, addHeaders({Referer: baseurl + 'room/lk/login.action?extURL=https://xn--f1aijeow.xn--p1ai&loginLink=/office/login/&exitLink=/office/logout/', Origin: baseurl})); 

    var jsessionid = getParam(html, null, null, /<input[^>]+name="sessionId"[^>]+value=\"([\s\S]*?)\"/i, replaceTagsAndSpaces, html_entity_decode);
 
    if(!jsessionid){
        var error = getParam(html, null, null, /<ul[^>]+class="errorMessage"[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    AnyBalance.requestGet(baseurl2 + 'office/', g_headers);

    html = AnyBalance.requestGet(baseurl + 'room/lk/main.action;jsessionid=' + jsessionid, g_headers);

    var result = {success: true};
    getParam(html, result, 'fio', /<div[^>]+class="name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'adress', /<div[^>]+class="address"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Предварительно начислено:([\s\S]*?)руб/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance-pay', /Рекомендовано к оплате:([\s\S]*?)руб/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'last', /<h2[^>]*>Последний платёж:<\/h2>(?:[\s\S]*?<span[^>]*>){1}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'date', /Суммы к оплате на ([\s\S]*?):/i, replaceTagsAndSpaces, parseDate);

	// Теперь таблица услуг
	html = AnyBalance.requestGet(baseurl + 'room/lk/details.action', g_headers);
	
	var table = getParam(html, null, null, /(<table class="grid">[\s\S]*?<\/table>)/i);
    if(!table)
        throw new AnyBalance.Error('Не найдена таблица услуг. Обратитесь к автору провайдера по имейл.');

    var re = /(<tr class="">[\s\S]*?<\/tr>)/ig;
    html.replace(re, function(tr)
	{
        if(AnyBalance.isSetResultCalled())
			return; //Если уже вернули результат, то дальше крутимся вхолостую

		var accnum = (prefs.accnum || '').toUpperCase();
        var name = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){1}\s*([\s\S]*?)\s*<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        var acc = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){2}\s*([\s\S]*?)\s*<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        if(!prefs.accnum || (name && name.toUpperCase().indexOf(accnum) >= 0) || (acc && acc.toUpperCase().indexOf(accnum) >= 0))
		{
			getParam(tr, result, 'usluga', /(?:[\s\S]*?<td[^>]*>){1}\s*([\s\S]*?)\s*<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(tr, result, 'postavshik', /(?:[\s\S]*?<td[^>]*>){2}\s*([\s\S]*?)\s*<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(tr, result, 'ostatok', /(?:[\s\S]*?<td[^>]*>){3}\s*([\s\S]*?)\s*<\/td>/i, replaceTagsAndSpaces, parseBalance);
			getParam(tr, result, 'nachislenia', /(?:[\s\S]*?<td[^>]*>){4}\s*([\s\S]*?)\s*<\/td>/i, replaceTagsAndSpaces, parseBalance);
			getParam(tr, result, 'oplacheno', /(?:[\s\S]*?<td[^>]*>){5}\s*([\s\S]*?)\s*<\/td>/i, replaceTagsAndSpaces, parseBalance);
			getParam(tr, result, 'ostatok_konec', /(?:[\s\S]*?<td[^>]*>){6}\s*([\s\S]*?)\s*<\/td>/i, replaceTagsAndSpaces, parseBalance);
			getParam(tr, result, 'k_oplate', /(?:[\s\S]*?<td[^>]*>){7}\s*([\s\S]*?)\s*<\/td>/i, replaceTagsAndSpaces, parseBalance);
            AnyBalance.setResult(result);
            return;
        }
    });
	
    AnyBalance.setResult(result);
}