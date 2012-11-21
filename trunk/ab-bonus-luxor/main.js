/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по бонусной карте Luxor

Сайт оператора: http://luxorfilm.ru
Личный кабинет: http://luxorfilm.ru/login.aspx
*/

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://luxorfilm.ru/";

    var html = AnyBalance.requestGet(baseurl + 'login.aspx');

    html = AnyBalance.requestPost(baseurl + 'login.aspx', {
        __LASTFOCUS:'',
        __EVENTTARGET:'',
        __EVENTARGUMENT:'',
        __VIEWSTATE:getViewState(html),
        ctl00$contentPlaceHolder$txtLogin:prefs.login,
        ctl00$contentPlaceHolder$txtPassword:prefs.password,
        ctl00$contentPlaceHolder$btnLogin:''
    });

    //AnyBalance.trace(html);
    if(!/\/signout.aspx/.test(html)){
        var error = getParam(html, null, null, /<span[^>]*lblMessageLogin[^>]*>([\s\S]*?)<\/span>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    html = AnyBalance.requestGet(baseurl + 'users/MyBonuses.aspx');

    var result = {success: true};

    getParam(html, result, 'balance', /<p[^>]+class="bonuses"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'cardnum', /<p[^>]+class="cardNumb"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<p[^>]+class="cardNumb"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
