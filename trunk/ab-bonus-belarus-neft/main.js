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
    var baseurl = "http://www.beloil.by/";
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
        var error = getParam(html, null, null, /id="login_error"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error && /Данной комбинации логина и пароля не существует/i.test(error))
			throw new AnyBalance.Error(error, null, true);		
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
    var result = {success: true};
    getParam(html, result, 'fio', /Здравствуйте,[^>]*>([^\(<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /НА ВАШЕМ СЧЕТУ(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'discount', /РАЗМЕР ВАШЕЙ СКИДКИ(?:[^>]*>){6}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'card_num', /№ карты([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /№ карты([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'discount_next', /СЛЕДУЮЩЕЙ СКИДКИ(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'discount_bal_next', /СЛЕДУЮЩЕЙ СКИДКИ(?:[^>]*>){15}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}