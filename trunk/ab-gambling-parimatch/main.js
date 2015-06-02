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

    var baseurl = "https://www.parimatch.com/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl + '?login=1', {
        username:prefs.login,
        passwd:prefs.password
    }, addHeaders({Referer: baseurl + '?login=1'})); 

    if(!/\/?logoff=1/i.test(html)){
        var error = getParam(html, null, null, /<form[^>]+name="f1"[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + "account_balance.html", g_headers);

    var json = getJson(html);

    var result = {success: true};
    getParam(json.ros, result, 'balance', null, null, parseBalance);
    getParam(json.ros, result, ['currency', 'balance'], null, null, parseCurrency);
    getParam(json.ronc, result, 'summ', null, null, parseBalance);
    getParam(json.ronc, result, ['currencysumm', 'summ'], null, null, parseCurrency);
    getParam(json.cc, result, 'rates', null, null, parseBalance);
    getParam(json.as, result, 'bonus', null, null, parseBalance);
    getParam(json.as, result, ['currencybonus', 'bonus'], null, null, parseCurrency);

    AnyBalance.setResult(result);
}
