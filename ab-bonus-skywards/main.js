/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс баллов и другую информацию по бонусной программе Skywards

Operator site: https://www.skywards.com/
Личный кабинет: https://www.skywards.com/
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Cache-Control': 'max-age=0',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.22 (KHTML, like Gecko) Chrome/25.0.1364.172 Safari/537.22'
};

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function parseDateMoment(str){
    var mom = moment(str.replace(/i/ig, 'і'), ['DD MMM YYYY', 'HH:mm-D MMM YYYY']);
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
    var baseurl = "https://www.emirates.com/account/english/login/login.aspx?mode=ssl";
    AnyBalance.setDefaultCharset('utf-8'); 

    checkEmpty(prefs.login, "Please enter your Emirates ID");
    checkEmpty(prefs.password, "Please enter your password");

    moment.lang('en');

    var html = AnyBalance.requestGet(baseurl, g_headers);

    var form = getParam(html, null, null, /<form[^>]+id="aspnetForm"[^>]*>([\s\S]*?)<\/form>/i);

    if(!form) //Если параметр не найден, то это, скорее всего, свидетельствует об изменении сайта или о проблемах с ним
        throw new AnyBalance.Error('Could not find login form. Is the site changed?');

    var params = createFormParams(form);
    params.txtMembershipNo = prefs.login;
    params.txtPassword = prefs.password;
    params.btnHeaderSearch = params.siteSelectorSubmit = params.chkRememberMe = params.btnForgotPasswordSubmit = params.btnMembershipNoSubmit = undefined;

    //Теперь, когда секретный параметр есть, можно попытаться войти
    try{
    	html = AnyBalance.requestPost(baseurl, params, addHeaders({Referer: baseurl})); 
    }catch(e){
	if(prefs.__debug)
            html = AnyBalance.requestGet("http://www.emirates.com/english/index.aspx", g_headers);
        else
	    throw e;
    }

    if(!/Log out/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="errorPanel"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Could not login to the personal account. Is site changed?');
    }

    var myReplaceTagsAndSpaces = [/,/g, '', replaceTagsAndSpaces]; 

    var result = {success: true};
    getParam(html, result, 'fio', /<span[^>]+spnMemberName[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'num', /<div[^>]+divSkywardsNo"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<div[^>]+divSkywardsNo"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<span[^>]+spnMemberMiles[^>]*>([\s\S]*?)<\/span>/i, myReplaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'tier', /<span[^>]+lblSkywardsTierMiles[^>]*>([\s\S]*?)<\/span>/i, myReplaceTagsAndSpaces, parseBalance);

    getParam(html, result, 'till', /<span[^>]+lblSkyWardsMilesExpiryDate"[^>]*>([\s\S]*?)<\/span>/ig, replaceTagsAndSpaces, parseDateMoment);
    getParam(html, result, 'burn', /<span[^>]+lblSkyWardsMilesExpiry"[^>]*>([\s\S]*?)<\/span>/ig, myReplaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
