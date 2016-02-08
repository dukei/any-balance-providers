/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.103 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
	
    var baseurl = 'https://my.orange.md/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
    checkEmpty(prefs.login, 'Enter Orange number!');
    checkEmpty(prefs.password, 'Enter Orange password!');
	
    var html = AnyBalance.requestGet(baseurl + 'web/guest/main', g_headers);
    var form = getParam(html, null, null, /<form[^>]+id="lf_f"[\s\S]*?<\/form>/i);
    if(!form) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Can not find login form. Is the site changed?');
    }

    var actionHTML = getParam(form, null, null, /action="([\s\S]*?)"/i);
    if(!actionHTML)
        throw new AnyBalace.Error("Can't find action URL. Site changed?");

    html = AnyBalance.requestPost(actionHTML, {
        useOnetimePwdChanged: 1
    });

    AnyBalance.setOptions({FORCE_CHARSET: 'base64'});
    var captchaimg = AnyBalance.requestGet(baseurl + 'c/___Captcha?rand=' + Math.random());
    var captcha = AnyBalance.retrieveCode("Please enter security code", captchaimg);
    AnyBalance.setOptions({FORCE_CHARSET: null});
	
    var params = createFormParams(form, function(params, str, name, value) {
		if (name == '_cbosslogin_testlogin')
			return prefs.login;
        else if(name == '_cbosslogin_login')
            return prefs.login;
		else if (name == '_cbosslogin_captchaText')
			return captcha;
		return value;
    });
	params._cbosslogin_password = prefs.password;

    html = AnyBalance.requestPost(actionHTML, params, g_headers);
	
    if(!/location.replace\("\/web\/guest\/account"\)/.test(html)){
        var href = getParam(html, null, null, /location\.href='([\s\S]*?)'/i);
        if(!href)
            throw new AnyBalance.Error("Can't find error href.");
        html = AnyBalance.requestGet(href, g_headers);
        var error = getParam(html, null, null, /<span[^>]+class="vhoop"[^>]*>[\s\S]*?<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /Вы указали неправильный пароль|Вы указали неправильные данные|ati introdus datele incorect|ati introdus gresit parola|The entered data is not correct|Incorrect password|Parola introdusă este incorectă/i.test(error));
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Can not enter personal account. Is the site changed?');
    }
	
	html = AnyBalance.requestGet(baseurl + 'web/guest/account', g_headers);
	
	var result = {success: true};
	
    getParam(html, result, 'balance', /(?:баланс|balance|Balanţa)(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /<div[^>]+class="inner colorbox_orange\s*"[^>]*>(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'abondate', /(?:Расчетный день|Ziua de facturare|Billing day)(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'license', /(?:номер orange|Orange number|Numărul Orange)(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);

	/*if(isAvailable('abondate')) {
		var dtObj = new Date();
		var dt = dtObj.getTime();
		
		var days = getParam(html, null, null, /<h3>\s*расчетный день(?:[^>]*>){8}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
		if(isset(days)) {
			dtObj.setMilliseconds(dt + (8640 * days))
			AnyBalance.trace(dtObj);
			
			getParam(dtObj.getTime(), result, 'abondate');
		}
	}
    
    getParam(html, result, 'username', /<div[^>]+class="detalii_cont_interior_left"[^>]*>(?:имя пользователя|numele utilizatorului|user name)[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'license', /<div[^>]+class="detalii_cont_interior_left"[^>]*>(?:номер счета|numarul contului|account number)[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    */
    AnyBalance.setResult(result);
}