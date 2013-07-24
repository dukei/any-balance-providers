/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://www.vodafone.gr/';
    AnyBalance.setDefaultCharset('ISO-8859-7'); 

	var html;
    if(!prefs.__dbg){
        html = AnyBalance.requestPost(baseurl + 'portal/client/idm/login!login.action', {
		pass:'Type in your password',
	    username:prefs.login,
	    password:prefs.password
        }, addHeaders({Referer: baseurl + 'portal/client/idm/login!login.action'})); 
    }else{
        html = AnyBalance.requestGet(baseurl + 'portal/client/idm/loadPrepayUserProfile.action');
    }
	html = AnyBalance.requestGet(baseurl + 'portal/client/idm/loadPrepayUserProfile.action?request_locale=en&lang=en_EN');
	
    if(!/logout\.action/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /<div[^>]+class="msgError"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Could not enter personal account. Is the site changed?');
    }
    var result = {success: true};
    getParam(html, result, 'phone', /(?:Αριθμός|Vodafone number)[\s\S]{1,100}right">([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /(?:Υπολειπόμενος χρόνος|Value)[\s\S]{1,100}right">([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /(?:Πακέτο σύνδεσης|Type)[\s\S]{1,100}right">\s*([\s\S]*?)\s*<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
