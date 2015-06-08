/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Cache-Control': 'max-age=0',
    'Connection':'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.22 (KHTML, like Gecko) Chrome/25.0.1364.172 Safari/537.22'
};

function parseDateMoment(str){
    var mom = moment(str.replace(/i/ig, 'і'), ['DD MMM YYYY', 'HH:mm-D MMM YY']);
    if(!mom.isValid()){
        AnyBalance.trace('Failed to parse date from ' + str);
    }else{
        var val = mom.toDate();
        AnyBalance.trace('Parsed date ' + val + ' from ' + str);
        return val.getTime();
    }
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://www.emirates.com/";
    AnyBalance.setDefaultCharset('utf-8'); 

    checkEmpty(prefs.login, "Please enter your Emirates ID");
    checkEmpty(prefs.password, "Please enter your password");

    moment.lang('en');

    var html = AnyBalance.requestGet(baseurl + 'account/english/login/login.aspx?mode=ssl', g_headers);

    var form = getParam(html, null, null, /<form[^>]+id="aspnetForm"[^>]*>([\s\S]*?)<\/form>/i);

    if(!form)
        throw new AnyBalance.Error('Could not find login form. Is the site changed?');

    var params = createFormParams(form);
    params.txtMembershipNo = prefs.login;
    params.txtPassword = prefs.password;
    params.btnHeaderSearch = params.siteSelectorSubmit = params.chkRememberMe = params.btnForgotPasswordSubmit = params.btnMembershipNoSubmit = undefined;

    var captchaKey, captchaSrc, captcha;
    if(AnyBalance.getLevel() >= 7){
        AnyBalance.trace('Пытаемся ввести капчу');
        captchaSrc = getParam(html, null, null, /(account\/english\/login\/login.aspx\?cptLogin_captcha=[^"]+)"/i);
        captcha = AnyBalance.requestGet(baseurl + captchaSrc, addHeaders({ Referer: baseurl }));
        if(!captchaSrc || !captcha)
            throw new AnyBalance.Error('Captcha error! Try update later.');
        captchaKey = AnyBalance.retrieveCode("Please, enter the code as you see in image", captcha);
        AnyBalance.trace('Капча получена: ' + captchaKey);
    } else {
        throw new AnyBalance.Error('Provider requires AnyBalance API v7, please, update AnyBalance!');
    }

    params.txtCaptcha = captchaKey;

    try {
    	html = AnyBalance.requestPost(baseurl + 'account/english/login/login.aspx?mode=ssl', params, addHeaders({Referer: baseurl + 'account/english/login/login.aspx?mode=ssl'})); 
    } catch(e) {
    	if(prefs.__debug)
            html = AnyBalance.requestGet("http://www.emirates.com/english/index.aspx", g_headers);
        else
	       throw e;
    }

    if(!/Welcome to/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="errorPanel"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Could not login to the personal account. Is site changed?');
    }

    var result = {success: true};
    getParam(html, result, 'fio', /<div[^>]*class="membershipName"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'num', /<span[^>]*class="armembershipNumber"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<span[^>]*class="armembershipNumber"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<div[^>]*class="membershipSkywardsMiles"[^>]*>\s*<div[^>]*class="milesCount"[^>]*>([\s\S]*?)<div>/i, [replaceTagsAndSpaces, /[,.]/, ''], parseBalance);
    getParam(html, result, 'tier', /<div[^>]*class="membershipTierMiles"[^>]*>\s*<div[^>]*class="milesCount"[^>]*>([\s\S]*?)<div>/i, replaceTagsAndSpaces, parseBalance);

    getParam(html, result, 'till', /<\/strong> Miles are due to expire on <strong>([^<]+)/i, replaceTagsAndSpaces, parseDateMoment);
    getParam(html, result, 'burn', /<strong>([^<]+)<\/strong> Miles are due to expire on/i, [replaceTagsAndSpaces, /[,.]/, ''], parseBalance);

    AnyBalance.setResult(result);
}
