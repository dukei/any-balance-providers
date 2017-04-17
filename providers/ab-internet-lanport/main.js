/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
    AnyBalance.setDefaultCharset('utf-8');
    var prefs = AnyBalance.getPreferences();
	
    var baseurl = "http://lanport.ru";
    
    var html = AnyBalance.requestGet(baseurl);
    
    //AnyBalance.trace('got  ' + html);

    var p1 = html.lastIndexOf('№ договора');
    if (p1 < 0)
        throw new AnyBalance.Error('Не удаётся найти данные. Сайт изменен? Напоминаем, что личный кабинет доступен только изнутри сети провайдера');

    html = html.substr(p1);
 
    var result = {success: true};

    getParam(html, result, 'id', /№ договора:[ ]*(.*?)<\/b/i,  replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Баланс:[ ]*(.*?)<\/b>/i,  replaceTagsAndSpaces, parseBalance);
 
    AnyBalance.setResult(result);
}


