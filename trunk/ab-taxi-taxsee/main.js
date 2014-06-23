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
    var baseurl = "http://cabinet.taximaxim.ru/";

    AnyBalance.setDefaultCharset('utf-8'); 
    var html = AnyBalance.requestPost(baseurl + 'webapp/index.php?r=clientCabinet/login', {
        'NewLoginForm[phone]':prefs.login,
        'NewLoginForm[password]':prefs.password,
        'NewLoginForm[rememberMe]':0,
        yt0:''
    }, addHeaders({Referer: baseurl})); 

    if(!/clientCabinet\/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+alert-error[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    var result = {success: true};

    var json = getParam(html, null, null, /user_profile\s*=\s*(\{[\s\S]*?\});/, null, getJson);
	getParam(json.FIO, result, 'fio');
	getParam(json.FIO, result, '__tariff');
    getParam(json.Discont, result, 'discont', null, null, parseBalance);

    html = AnyBalance.requestGet(baseurl + 'Services/Taxi.svc/Accounts', g_headers);
    json = getJson(html);
    for(var i=0; i<json.Accounts.length; ++i){
        var acc = json.Accounts[i];
        if(AnyBalance.isAvailable('balance'))
            result.balance = acc.Balance;
        if(AnyBalance.isAvailable('licschet'))
            result.licschet = acc.PayCode;
        break;
    }

    AnyBalance.setResult(result);
}
