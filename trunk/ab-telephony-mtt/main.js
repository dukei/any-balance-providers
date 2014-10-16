/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');    
	
    var baseurl = 'http://old.mtt.ru/';
    
    var html = AnyBalance.requestGet(baseurl + "user/login?destination=sc");
    var form_build_id = getParam(html, null, null, /<input[^>]+name="form_build_id"[^>]*value="([^"]*)"[^>]*>/i);
    if(!form_build_id)
        throw new AnyBalance.Error("Не удаётся найти идентификатор формы для входа! Свяжитесь с автором провайдера.");

    var params = {
	name:prefs.login,
	pass:prefs.password,
        form_build_id:form_build_id,
        form_id:'user_login',
        op:'Войти'
    };
        
    html = AnyBalance.requestPost(baseurl + "user/login?destination=sc", params);

    var error = getParam(html, null, null, /<div[^>]*class="messages error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);
     
    var result = {success: true};

    getParam(html, result, 'licschet', /<a [^>]*class="active"[^>]*>л\/с\s*(\d+)/i);
    getParam(html, result, 'balance', /Баланс:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'userName', /Добрый день,[\s\S]*?>(.*?)</i, replaceTagsAndSpaces);
		
    AnyBalance.setResult(result);
}