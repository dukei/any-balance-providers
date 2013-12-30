/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.116 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = 'https://my.orange.md/';
    AnyBalance.setDefaultCharset('utf-8'); 

    checkEmpty(prefs.login, 'Enter Orange number!');
    checkEmpty(prefs.password, 'Enter Orange password!');

    var html = AnyBalance.requestGet(baseurl + 'web/guest/main', g_headers);
    var form = getParam(html, null, null, /<form[^>]+name="_cbosslogin_fm"[\s\S]*?<\/form>/i);
    if(!form){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Can not find login form. Is the site changed?');
    }

    AnyBalance.setOptions({FORCE_CHARSET: 'base64'});
    var captchaimg = AnyBalance.requestGet(baseurl + 'c/___Captcha?rand=' + Math.random());
    var captcha = AnyBalance.retrieveCode("Please enter security code", captchaimg);
    AnyBalance.setOptions({FORCE_CHARSET: null});

    var params = createFormParams(form, function(params, str, name, value) {
	if (name == '_cbosslogin_login') 
		return prefs.login;
	else if (name == '_cbosslogin_password')
		return prefs.password;
	else if (name == '_cbosslogin_captchaText')
		return captcha;
	return value;
    });

    var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, null, html_entity_decode);
    html = AnyBalance.requestPost(action, params, g_headers);

    if(!/location.replace\("\/web\/guest\/info"\)/.test(html)){
        var error = getParam(html, null, null, /<span[^>]+class="errortext"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /Вы указали неправильный пароль|Вы указали неправильные данные|ati introdus datele incorect|ati introdus gresit parola|The entered data is not correct|Incorrect password/i.test(error));
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Can not enter personal account. Is the site changed?');
    }

    html = AnyBalance.requestGet(baseurl + 'web/guest/info', g_headers);

    var result = {success: true};
    getParam(html, result, 'balance', /<div[^>]+class="detalii_cont_interior_left"[^>]*>(?:текущий баланс|balanta contului|account balance)[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'abondate', /<div[^>]+class="detalii_cont_interior_left"[^>]*>(?:следующий расчетный день|data de facturare urmatoare|next billing date)[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'username', /<div[^>]+class="detalii_cont_interior_left"[^>]*>(?:имя пользователя|numele utilizatorului|user name)[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'license', /<div[^>]+class="detalii_cont_interior_left"[^>]*>(?:номер счета|numarul contului|account number)[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<div[^>]+class="detalii_cont_interior_left"[^>]*>(?:абонемент|abonament|monthly plan)[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
