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

    var baseurl = "https://btc-e.com/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'api/2/' + prefs.curs + '/ticker', g_headers); 

    if(!/"ticker"/i.test(html)){
        var error = getParam(html, null, null, /"error":\"([\s\S]*?)\"/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Can`t login personal account. Maybe site is changed?');
    }

    var json = getJson(html);

    var result = {success: true};
    prefs.curs = prefs.curs.toUpperCase().split("_");
    getParam(prefs.curs[0], result, ['currency_1', 'vol_cur'], null, null, html_entity_decode);
    getParam(prefs.curs[1], result, ['currency_2', 'high', 'low', 'last', 'buy', 'sell'], null, null, html_entity_decode);

    getParam(json.ticker.avg, result, 'avg', null, null, parseBalance);
    getParam(json.ticker.high, result, 'high', null, null, parseBalance);
    getParam(json.ticker.low, result, 'low', null, null, parseBalance);
    getParam(json.ticker.last, result, 'last', null, null, parseBalance);
    getParam(json.ticker.buy, result, 'buy', null, null, parseBalance);
    getParam(json.ticker.sell, result, 'sell', null, null, parseBalance);
    getParam(json.ticker['server_time'] * 1000, result, 'servertime', null, null, null);

    getParam(json.ticker.vol, result, 'vol', null, null, parseBalance);
    getParam(json.ticker.vol_cur, result, 'vol_cur', null, null, parseBalance);

    AnyBalance.setResult(result);
}
