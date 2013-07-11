/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс для абонента Pildyk (pildyk.lt)
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://mano.pildyk.lt/Prisijungti.aspx";
    var result = {success: true},matches; 
    
    AnyBalance.setDefaultCharset('utf-8'); 
    
    if(!prefs.login)
        throw new AnyBalance.Error("Пожалуйста, укажите логин для входа!");
    if(!prefs.password)
        throw new AnyBalance.Error("Пожалуйста, укажите пароль для входа!");

	var html = AnyBalance.requestPost(baseurl,{});
	
    if (!/<a id="ctl00_ctl00_main_ctl00_userInfo_logoff" class="right logout" href="[\s\S]*?">Atsijungti<\/a>/i.test(html)) {
	
		html = AnyBalance.requestPost(baseurl, {
			'ctl00$ctl00$main$main$login$tbUserName':prefs.login
			,'ctl00$ctl00$main$main$login$tbPassword':prefs.password
			,'__EVENTTARGET':'ctl00$ctl00$main$main$login$btnLogin'
			,'__EVENTARGUMENT':getParam(html, null, null, /<input\s*type="hidden"\s*name="__EVENTARGUMENT"\s*id="__EVENTARGUMENT"\s*value="([^\"]*)"\s*\/>/i, null, null)
			,'__VIEWSTATE':getParam(html, null, null, /<input\s*type="hidden"\s*name="__VIEWSTATE"\s*id="__VIEWSTATE"\s*value="([^\"]*)"\s*\/>/i, null, null)
			,'__EVENTVALIDATION':getParam(html, null, null, /<input\s*type="hidden"\s*name="__EVENTVALIDATION"\s*id="__EVENTVALIDATION"\s*value="([^\"]*)"\s*\/>/i, null, null)
			,'ctl00$ctl00$main$main$login$btnLogin':'Prisijungti'
		});
	}
	
	var error = getParam(html, null, null, /<div[\s\S]*?class="msg msg-error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);
        
    getParam(html, result, 'balance', /<p\s*id="userinfo"\s*[^>]*>[\s\S]*?Sąskaitos\s*likutis:\s*<strong>([^>]*?)\s*LT<\/strong>[\s\S]*?<\/p>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'name', /<p\s*id="userinfo"\s*[^>]*>[\s\S]*?Prisijungęs:\s*<strong>([^>]*?)\s*<\/strong>[\s\S]*?<\/p>/i, replaceTagsAndSpaces, null);
    getParam(html, result, 'balanceExpire', /<th>Sąskaitos\s*likutis:[\s\S]*?<small\sclass="expiration_date">\s*galioja\s*iki\s*([^>]*?)\s*<\/small>\s*<\/th>/i, replaceTagsAndSpaces, null);
    
    getParam('+370 ' + prefs.login, result, 'telnum', /(.*)/i, replaceTagsAndSpaces, null);    
           
    AnyBalance.setResult(result);
}
