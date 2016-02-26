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
    AnyBalance.setDefaultCharset('utf-8');
    var baseurl = 'https://btc-e.nz/';

    var html = AnyBalance.requestGet(baseurl + 'api/2/' + prefs.curs + '/ticker', g_headers); 

    if(!/"ticker"/i.test(html)){
        var error = AB.getParam(html, null, null, /"error":\"([\s\S]*?)\"/i, AB.replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Can`t login personal account. Maybe site is changed?');
    }

    var json = getJson(html);

    var result = {success: true};
    prefs.curs = prefs.curs.toUpperCase().split("_");
    AB.getParam(prefs.curs[0], result, ['currency_1', 'vol_cur'], null, null, AB.html_entity_decode);
    AB.getParam(prefs.curs[1], result, ['currency_2', 'high', 'low', 'last', 'buy', 'sell'], null, null, AB.html_entity_decode);

    AB.getParam(json.ticker.avg, result, 'avg', null, null, AB.parseBalance);
    AB.getParam(json.ticker.high, result, 'high', null, null, AB.parseBalance);
    AB.getParam(json.ticker.low, result, 'low', null, null, AB.parseBalance);
    AB.getParam(json.ticker.last, result, 'last', null, null, AB.parseBalance);
    AB.getParam(json.ticker.buy, result, 'buy', null, null, AB.parseBalance);
    AB.getParam(json.ticker.sell, result, 'sell', null, null, AB.parseBalance);
    AB.getParam(json.ticker['server_time'] * 1000, result, 'servertime');

    AB.getParam(json.ticker.vol, result, 'vol', null, null, AB.parseBalance);
    AB.getParam(json.ticker.vol_cur, result, 'vol_cur', null, null, AB.parseBalance);

    AnyBalance.setResult(result);
}
