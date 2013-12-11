/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1',
    Connection: 'keep-alive',
    Origin: 'https://lk.tricolor.tv',
    Referer: 'https://lk.tricolor.tv/trcustomer/Login.aspx'
};

function getViewState(html) {
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html) {
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}

function getPrevPage(html) {
    return getParam(html, null, null, /name="__PREVIOUSPAGE".*?value="([^"]*)"/);
}

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите DREID приёмника!');
	checkEmpty(prefs.password, 'Введите пароль!');	
	
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://lk.tricolor.tv/trCustomer/";

    var html = AnyBalance.requestGet(baseurl + 'Login.aspx', g_headers);

    html = AnyBalance.requestPost(baseurl + 'Login.aspx', {
        'ctl00$ToolkitScriptManager1':'ctl00$ContentPlaceHolder1$UpdatePanel1|ctl00$ContentPlaceHolder1$BLogin',
        ctl00_ToolkitScriptManager1_HiddenField:'',
        __EVENTTARGET:'',
        __EVENTARGUMENT:'',
        ctl00_ContentPlaceHolder2_NavigationTree1_TreeView1_ExpandState:'ennnennnnnn',
        ctl00_ContentPlaceHolder2_NavigationTree1_TreeView1_SelectedNode:'',
        ctl00_ContentPlaceHolder2_NavigationTree1_TreeView1_PopulateLog:'',
        __VIEWSTATE:getViewState(html),
        __PREVIOUSPAGE:getPrevPage(html),
        __EVENTVALIDATION:getEventValidation(html),
        ctl00$ContentPlaceHolder1$hfPPVRedirect:'',
        ctl00$ContentPlaceHolder1$hfPPVdate:'',
        ctl00$ContentPlaceHolder1$TDreid:prefs.login,
        ctl00$ContentPlaceHolder1$TPassword:prefs.password,
        __ASYNCPOST:true,
        'ctl00$ContentPlaceHolder1$BLogin.x':49,
        'ctl00$ContentPlaceHolder1$BLogin.y':17
    }, addHeaders({'X-MicrosoftAjax':'Delta=true'}));

    var redirect = getParam(html, null, null, /pageRedirect\|\|\/trCustomer\/([^|]*)/i);

    //AnyBalance.trace(html);
    if (!redirect) { //ctl00.logOff/i.test(html)
        var error = getParam(html, null, null, /<span[^>]*ctl00_ContentPlaceHolder1_ErrDescr[^>]*>([\s\S]*?)<\/span>/, replaceTagsAndSpaces, html_entity_decode);
        if (error) throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
	
    html = AnyBalance.requestGet(baseurl + redirect, g_headers);
    
	var result = {success: true};
	
    getParam(html, result, 'balance', /<td[^>]*id="[^"]*pBalanceCurr"[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'agreement', /<td[^>]+id="[^"]*pContractNumber"[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'device', /<td[^>]+id="[^"]*pReceicerNumber"[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', />\s*(?:пакет)\s*(<[\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    
	var services = [];
    var n = 1;
    html.replace(/<tr[^>]*>(?:[\s\S](?!<\/tr))*Активная услуга[\s\S]*?<\/tr>/ig, function(tr) {
        var name = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        var days = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        services[services.length] = name + ' (' + days + 'дн)';
        getParam(tr, result, 'service' + n, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, 'daysleft' + n, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        ++n;
    });
	
    result.__tariff = services.join(', ');
	
    AnyBalance.setResult(result);
}