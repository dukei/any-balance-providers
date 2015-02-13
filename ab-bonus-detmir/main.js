/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'*/*',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.66 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите номер карты!');
	
    var baseurl = 'https://dmbonus.korona.net/';
	
    AnyBalance.setDefaultCharset('utf-8'); 
	
	var html = AnyBalance.requestGet(baseurl + 'dm');
        
	var captcha;
	if (AnyBalance.getLevel() >= 7) {
    	AnyBalance.trace('Пытаемся ввести капчу');
    	var captcha = AnyBalance.requestGet(baseurl + 'dm/captcha');
    	captcha = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', captcha);
    	AnyBalance.trace('Капча получена: ' + captcha);
    } else {
    	throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
    }
	
	html = AnyBalance.requestPost(baseurl + 'dm/detmir/info', {
		'card':prefs.login,
		'captcha':captcha
	}, addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
	
	if(!/Номер карты:/i.test(html)){
        var error = getParam(html, null, null, /id="ErrorLabel"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        error = getParam(html, null, null, /<h4>([\s\S]*?)<\/h4>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /введите верный номер карты/i.test(error));
		
        throw new AnyBalance.Error('Не удалось получить данные по карте. Сайт изменен?');
    }
	
    var result = {success: true};
	
    getParam(html, result, 'balance', /Общее количество бонусов([^<]+)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'active', /Количество активных бонусов([^<]+)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'inactive', /Количество неактивных бонусов([^<]+)</i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}