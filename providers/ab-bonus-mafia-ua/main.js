/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.94 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "http://mafia.ua/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'cabinet/login/', g_headers);

    var tform = getParam(html, null, null, /<input[^>]+name='csrfmiddlewaretoken'[^>]*value=\'([\s\S]*?)\'[^>]*\/>/i, null, html_entity_decode);
    if(!tform) 
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

    var params = {};    
    params['csrfmiddlewaretoken'] = tform;
    params['card_number'] = prefs.login;
    params['password'] = prefs.password;
    params['action'] = 'login';

    html = AnyBalance.requestPost(baseurl + 'cabinet/login/', params, addHeaders({
        Referer: baseurl + 'cabinet/login/', 
        'Origin':'http://mafia.ua',
        'X-Requested-With':'XMLHttpRequest'
    })); 
	
    var json = getJson(html);
	
    if(json.status != "ok"){
        var error = getParam(json.text, null, null, null, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
		
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + 'cabinet/', g_headers);

    var result = {success: true};
	
    getParam(html, result, 'bonus', />\s*Сумма бонусов(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance', />\s*Потраченная сумма(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'fio', />\s*Имя(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'phone', />\s*Мобильный(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
    getParam(html, result, 'discount', />\s*Привелегии карты(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
