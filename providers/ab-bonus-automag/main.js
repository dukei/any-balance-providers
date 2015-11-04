/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
    AnyBalance.setDefaultCharset('utf-8');
    var prefs = AnyBalance.getPreferences();
	
    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = "https://club-automag.ru/";

    var html = AnyBalance.requestGet(baseurl+'login');
    //AnyBalance.trace('got  ' + html);
    
    var dummy = {success: true};
    getParam(html, dummy, 'token', /csrf_token"[ ]*value="(.*?)">/i,  replaceTagsAndSpaces, html_entity_decode);
    //AnyBalance.trace('got  ' + dummy.token);

    html = AnyBalance.requestPost(baseurl+'login', {
		field_email: prefs.login,
                field_passwordHash: prefs.password,
                csrf_token: dummy.token
    });
    
    html = AnyBalance.requestGet(baseurl+'profile');
    //AnyBalance.trace('got  ' + html);

    var p1 = html.lastIndexOf('Баланс:');
    if (p1 < 0)
        throw new AnyBalance.Error('Не удаётся найти данные. Сайт изменен?');

    html = html.substr(p1);
 
    var result = {success: true};

    getParam(html, result, 'balance', /Баланс:[ ]*(.*?),/i,  replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'avail',   /доступно:[ ]*(.*?)"/i,  replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'cardid',  /Карта:[ ]*(.*?)<br>/i,  replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}


