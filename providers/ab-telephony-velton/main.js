/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры у украинского провайдера телефонии Velton

Сайт оператора: http://velton.ua/
Личный кабинет: https://my.velton.ua
*/

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://my.velton.ua/selfcare/";
    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(baseurl + 'fmLogin.aspx');
    var eventvalidation = getEventValidation(html);
    var viewstate = getViewState(html);

    html = AnyBalance.requestPost(baseurl + 'fmLogin.aspx', {
      ctl00_sm_HiddenField:'',
      __EVENTTARGET:'',
      __EVENTARGUMENT:'',
      __VIEWSTATE:viewstate,
      __EVENTVALIDATION:eventvalidation,
      ctl00$ContentPlaceHolderMain$LoginMain$UserName:prefs.login,
      ctl00$ContentPlaceHolderMain$LoginMain$Password:prefs.password,
      ctl00$ContentPlaceHolderMain$LoginMain$LoginButton:''
    });

    if(!/ctl00\$ctl00\$ContentPlaceHolderMaster0\$lbExit/i.test(html)){
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неправильный логин-пароль?');
    }

    var result = {success: true};
    getParam(html, result, 'license', /<span[^>]+id="[^>]+_lblPa"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /<span[^>]+id="[^>]+_CLIENT_NAMELabel"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<span[^>]+id="[^>]+_CLIENT_NAMELabel"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<span[^>]+id="[^>]+_SALDO_DESC_WITH_VALLabel"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
