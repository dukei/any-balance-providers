/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток в PayPal

Сайт оператора: https://www.paypal.com/ru
Личный кабинет: https://www.paypal.com/ru
*/
var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.95 Safari/537.36',
	'Origin':'https://mobile.paypal.com'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    if(!prefs.login)
        throw new AnyBalance.Error("Enter e-mail!");
    if(!prefs.password)
        throw new AnyBalance.Error("Enter password!");

    var baseurl = 'https://mobile.paypal.com/cgi-bin/wapapp';

    var html = AnyBalance.requestGet(baseurl, g_headers);

	var href = getParam(html, null, null, /href="([^>]*login=)[^>]*>/i, null, html_entity_decode);
    if(!href)
        throw new AnyBalance.Error("Can not find login form! Site is changed?");
	
	html = AnyBalance.requestGet(href, g_headers);

	var submit = getParam(html, null, null, /<form[^>]*name="Login"[^>]*action="([^"]+)"[^>]*>/i, null, html_entity_decode);
    if(!submit)
        throw new AnyBalance.Error("Can not find login form! Site is changed?");
	
	var auth = getParam(html, null, null, /"auth"[^>]*value="([\s\S]*?)"/i);
	var CONTEXT = getParam(html, null, null, /"CONTEXT"[^>]*value="([\s\S]*?)"/i);

	html = AnyBalance.requestPost(submit, {
		'CONTEXT':CONTEXT,
		login_email: prefs.login,
		login_password:prefs.password,
		'login.x':'Войти',
		'auth':auth,
		'form_charset':'UTF-8'			
	}, addHeaders({Referer:href}));
	
	/*if(!prefs.__dbg){
        var href = getParam(html, null, null, /<form[^>]*action="([^"]+)"[^>]*name="login_form"/i, null, html_entity_decode);
		//var csrfModel = getParam(html, null, null, /<input[^>]*name="csrfModel.returnedCsrf"[^>]*value="([^"]+)"/i);
        if(!href /*|| !csrfModel*)
            throw new AnyBalance.Error("Can not find login form! Site is changed?");
	
        html = AnyBalance.requestPost(baseurl+href, {
			//"csrfModel.returnedCsrf": csrfModel,
			login_email: prefs.login,
			login_password:prefs.password,
			"submit.x":"Log in"
        });

        var error = getParam(html, null, null, /<div[^"]*class="[^"]*error[^"]*">\s*<h2[^>]*>[^<]*<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        
        href = getParam(html, null, null, /"([^"]*(?:%5f|_)login(?:%2d|-)done[^"]*)/i, null, html_entity_decode);
        if(!href)
            throw new AnyBalance.Error("Can not log in. Wrong login, password or site is changed.");
        
        html = AnyBalance.requestGet(href);
    }else{
        html = AnyBalance.requestGet('https://www.paypal.com/webapps/hub/');
    }*/


    var result={success: true};

	getParam(html, result, ['currency','balance'], /<span[^>]*class="balance[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(html, result, 'balance', /<span[^>]*class="balance[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

	
	
	
    AnyBalance.setResult(result);
}
