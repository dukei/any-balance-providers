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
    var baseurl = "http://wbi.beloil.by/";
    AnyBalance.setDefaultCharset('utf-8'); 
	
	//Пароль в SHA-1
	var pass = prefs.password;
	var key = prefs.login;
    
    pass = rstr2hex(rstr_hmac_sha1(pass, key));
		
	AnyBalance.requestGet(baseurl + 'lprogram/index.jsp', g_headers);
	
	var html = AnyBalance.requestPost(baseurl + 'lprogram/login', {
        loginName:prefs.login,
		loginPwd:'',
        passHesh:pass,
    }, addHeaders({Referer: baseurl + 'lprogram/index.jsp', Origin:baseurl})); 

    if(!/lprogram\/logout/i.test(html)){
        var error = getParam(html, null, null, /"errspan" id="login_error">\s*([\s\S]*?)\s*<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    var result = {success: true};
    getParam(html, result, 'fio', /Здравствуйте[\s\S]*?<br\/>\s*([\s\S]*?)\s*\(/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /НА ВАШЕМ СЧЕТУ([\s\S]*?)БАЛЛОВ/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'discount', /РАЗМЕР ВАШЕЙ СКИДКИ[\s\S]{1,20}В ТЕКУЩЕМ МЕСЯЦЕ[\s\S]{1,20}СОСТАВЛЯЕТ([\s\S]*?)percent/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'card_num', /№ карты\s*(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /№ карты\s*(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	var all = '';
	
    //getParam(html, result, 'all', /Статус:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}