/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://myaccount.payoneer.com/';
    var apiUrl = 'https://loginapi.payoneer.com/';
    AnyBalance.setDefaultCharset('utf-8'); 
    
    AB.checkEmpty(prefs.login, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль5!');
    
    var reblaze = Reblaze(baseurl);
    if(AnyBalance.getLevel() >= 9){
        AnyBalance.setCookie('myaccount.payoneer.com', 'rbzid', AnyBalance.getData('rbzid_myaccount.payoneer.com'));
        AnyBalance.setCookie('login.payoneer.com', 'rbzid', AnyBalance.getData('rbzid_login.payoneer.com'));
   	}
    AnyBalance.trace('Получаем главную страницу');
    var html = AnyBalance.requestGet(baseurl, g_headers);
    AnyBalance.trace('Главная страница получена');
    var lastUrl = AnyBalance.getLastUrl();
    if (/^https:\/\/myaccount\.payoneer\.com/i.test(lastUrl)) {
        // получаем куку реблейза для домена myaccount.payoneer.com
        if (reblaze.isReblazed(html)) {
            AnyBalance.trace('Страница myaccount.payoneer.com защищена Reblaze, пробуем получить нужную куку');
            html = reblaze.executeScript(html);
            AnyBalance.setData('rbzid_myaccount.payoneer.com', AnyBalance.getCookie('rbzid'));
            AnyBalance.trace('Страница myaccount.payoneer.com загружена через Reblaze, нужная кука ' + (AnyBalance.getCookie('rbzid') ? 'получена' : 'не получена'));
        }
    }
    lastUrl = AnyBalance.getLastUrl();
    if (/^https:\/\/login\.payoneer\.com/i.test(lastUrl)) {
        // пересоздаём Reblaze с новым доменом
        reblaze = Reblaze(lastUrl);
        // получаем куку реблейза для домена login.payoneer.com
        if (reblaze.isReblazed(html)) {
            AnyBalance.trace('Страница login.payoneer.com защищена Reblaze, пробуем получить нужную куку');
            html = reblaze.executeScript(html);
            AnyBalance.setData('rbzid_login.payoneer.com', AnyBalance.getCookie('rbzid'));
            AnyBalance.trace('Страница rbzid_login.payoneer.com загружена через Reblaze, нужная кука ' + (AnyBalance.getCookie('rbzid') ? 'получена' : 'не получена'));
        }
    }
    AnyBalance.saveData();
    
    lastUrl = AnyBalance.getLastUrl();
    var lastUrlParams = URLToArray(lastUrl);
    
    var loginData = {
        'AnalyzeRequest': {
            'UserInformation': {
                'DevicePrint': "version=3.4.1.0_1&pm_fpua=mozilla/5.0 (windows nt 10.0; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/59.0.3071.115 safari/537.36|5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36|Win32&pm_fpsc=24|1920|1080|1040&pm_fpsw=&pm_fptz=6&pm_fpln=lang=ru|syslang=|userlang=&pm_fpjv=0&pm_fpco=1&pm_fpasw=widevinecdmadapter|internal-nacl-plugin|00000000000000000000000000000000|internal-pdf-viewer&pm_fpan=Netscape&pm_fpacn=Mozilla&pm_fpol=true&pm_fposp=&pm_fpup=&pm_fpsaw=1920&pm_fpspd=24&pm_fpsbd=&pm_fpsdx=&pm_fpsdy=&pm_fpslx=&pm_fpsly=&pm_fpsfse=&pm_fpsui=&pm_os=Windows&pm_brmjv=59&pm_br=Chrome&pm_inpt=&pm_expt=",
                'DeviceTokenFso': ''
            }
        },
        'ClientId': lastUrlParams.client_id,
        'LanguageIso2Code': 'en',
        'Password': prefs.password,
        'PayoneerUserPrefs': {
            'Value': "TF1;014;;;;;;;;;;;;;;;;;;;;;;Mozilla;Netscape;5.0%20%28Windows%20NT%2010.0%3B%20Win64%3B%20x64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/59.0.3071.115%20Safari/537.36;20030107;undefined;true;;true;Win32;undefined;Mozilla/5.0%20%28Windows%20NT%2010.0%3B%20Win64%3B%20x64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/59.0.3071.115%20Safari/537.36;ru;undefined;login.payoneer.com;undefined;undefined;undefined;undefined;false;false;1501688538043;6;07.06.2005%2C%2021%3A33%3A44;1920;1080;;;;;;;5;-360;-360;02.08.2017%2C%2021%3A42%3A18;24;"
        },
        'RedirectUri': lastUrlParams.redirect_uri,
        'SessionDataKey': lastUrlParams.sessionDataKey,
        'State': lastUrlParams.state,
        'SupportOrnCode': null,
        'Username': prefs.login
    };
    
    AnyBalance.trace('Пытаемся пройти авторизацию');
    res = AnyBalance.requestPost(apiUrl + 'api/v1/loginRedirect', JSON.stringify(loginData), AB.addHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }));
    
    try {
        var json = JSON.parse(res);
    } catch(e) {
        AnyBalance.trace('JSON parse error (' + e.message + '): ' + res);
        throw new AnyBalance.Error('Проблемы на стороне сайта: неверный формат ответа авторизации');
    }
    
    if (json.NeedToChangePassword) {
        AnyBalance.trace('Payoneer просит сменить пароль');
        throw new AnyBalance.Error('Payoneer просит сменить пароль. Пожалуйста, зайдите в личный кабинет через браузер и смените пароль.', null, true);
    }
    
    html = AnyBalance.requestGet(json.RedirectUri, g_headers);
	
    if(!/SetAccount.aspx\?ac=0/i.test(html)){
        AnyBalance.trace(html);
        AnyBalance.trace('Не удалось зайти в личный кабинет');
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    
    AnyBalance.trace('Авторизация пройдена');
	
    var result = {success: true};
    getParam(html, result, '__tariff', /id="ctl00_ddlAccounts"[\s\S]*?>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /BalanceTableCell[\s\S]*?<strong>([\s\S]*?)<\//i, null, parseBalance);
	
    AnyBalance.setResult(result);
}

function URLToArray(url) {
    var request = {};
    var pairs = url.substring(url.indexOf('?') + 1).split('&');
    for (var i = 0; i < pairs.length; i++) {
        if(!pairs[i])
            continue;
        var pair = pairs[i].split('=');
        request[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
     }
     return request;
}