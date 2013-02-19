/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс для Красногорье-ДЭЗ

Сайт оператора: http://krc.lenina45.ru
Личный кабинет: http://krc.lenina45.ru/Login.aspx?ReturnUrl=%2fAccount%2fMenu.aspx
*/

var g_headers = {
  'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
  'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
  'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1',
  Connection: 'keep-alive'
};

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE"[^<]*?value="([^"]*)"/);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION"[^<]*?value="([^"]*)"/);
}

function getPreviousPage(html){
    return getParam(html, null, null, /name="__PREVIOUSPAGE"[^<]*?value="([^"]*)"/);
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://krc.lenina45.ru/";

    var html = AnyBalance.requestGet(baseurl + 'Account/Menu.aspx');

    html = AnyBalance.requestPost(baseurl + 'Login.aspx?ReturnUrl=%2fAccount%2fInfoShet.aspx', {
        __EVENTTARGET:'',
        __EVENTARGUMENT:'',
        __VIEWSTATE:getViewState(html),
        __PREVIOUSPAGE:getPreviousPage(html),
        __EVENTVALIDATION:getEventValidation(html),
        ctl00$MainContent$LoginUser$UserName:prefs.login,
        ctl00$MainContent$LoginUser$Password:prefs.password,
        ctl00$MainContent$LoginUser$LoginButton:'Войти'
    }, g_headers);

    //Выход из кабинета
    if(!/HeadLoginView\$HeadLoginStatus\$ctl00/i.test(html)){
        var error = getParam(html, null, null, /<span[^>]+class="failureNotification"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неправильный номер счета или пароль?');
    }

    var result = {success: true};

    var myReplaceForNumber = [/,/g, '', replaceTagsAndSpaces];

    getParam(html, result, 'balance', /ctl00_MainContent_GridView1(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, myReplaceForNumber, parseBalance);
    getParam(html, result, 'charge', /ctl00_MainContent_GridView1(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, myReplaceForNumber, parseBalance);
    getParam(html, result, 'recomp', /ctl00_MainContent_GridView1(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, myReplaceForNumber, parseBalance);
    getParam(html, result, 'lastpay', /ctl00_MainContent_GridView1(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, myReplaceForNumber, parseBalance);
    getParam(html, result, 'lastpaydate', /ctl00_MainContent_GridView1(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, '__tariff', /ctl00_MainContent_GridView1(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /ctl00_MainContent_GridView1(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
