/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36',
	'Referer': 'https://www.xe.com/?cn=global', 
	'Accept-Language': 'ru,en-US;q=0.9,en;q=0.8,ru-RU;q=0.7',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.xe.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl + 'api/rates_table.php', g_headers);
	var json = getJson(html);

	var rates = JSON.parse(decodeRatesData(json.payload.rates));

    var result = {success: true};
	// USD
	getParam(smartRound(rates.EUR), result, 'EURUSD');
	getParam(smartRound(rates.GBP), result, 'GBPUSD');
	getParam(smartRound(rates.INR), result, 'INRUSD');
	getParam(smartRound(rates.AUD), result, 'AUDUSD');
	getParam(smartRound(rates.CAD), result, 'CADUSD');
	getParam(smartRound(rates.ZAR), result, 'ZARUSD');
	getParam(smartRound(rates.NZD), result, 'NZDUSD');
	getParam(smartRound(rates.JPY), result, 'JPYUSD');
	// EUR
	getParam(smartRound(rates.EUR/rates.USD), result, 'USDEUR');
	getParam(smartRound(rates.EUR/rates.GBP), result, 'GBPEUR');
	getParam(smartRound(rates.EUR/rates.INR), result, 'INREUR');
	getParam(smartRound(rates.EUR/rates.AUD), result, 'AUDEUR');
	getParam(smartRound(rates.EUR/rates.CAD), result, 'CADEUR');
	getParam(smartRound(rates.EUR/rates.ZAR), result, 'ZAREUR');
	getParam(smartRound(rates.EUR/rates.NZD), result, 'NZDEUR');
	getParam(smartRound(rates.EUR/rates.JPY), result, 'JPYEUR');	
	// GBP
	getParam(smartRound(rates.GBP/rates.USD), result, 'USDGBP');
	getParam(smartRound(rates.GBP/rates.EUR), result, 'EURGBP');
	getParam(smartRound(rates.GBP/rates.INR), result, 'INRGBP');
	getParam(smartRound(rates.GBP/rates.AUD), result, 'AUDGBP');
	getParam(smartRound(rates.GBP/rates.CAD), result, 'CADGBP');
	getParam(smartRound(rates.GBP/rates.ZAR), result, 'ZARGBP');
	getParam(smartRound(rates.GBP/rates.NZD), result, 'NZDGBP');
	getParam(smartRound(rates.GBP/rates.JPY), result, 'JPYGBP');		
	// RUB
	getParam(smartRound(rates.RUB/rates.USD), result, 'RUBUSD');
	getParam(smartRound(rates.RUB/rates.EUR), result, 'RUBEUR');
	getParam(smartRound(rates.RUB/rates.INR), result, 'RUBINR');
	getParam(smartRound(rates.RUB/rates.AUD), result, 'RUBAUD');
	getParam(smartRound(rates.RUB/rates.CAD), result, 'RUBCAD');
	getParam(smartRound(rates.RUB/rates.ZAR), result, 'RUBZAR');
	getParam(smartRound(rates.RUB/rates.NZD), result, 'RUBNZD');
	getParam(smartRound(rates.RUB/rates.JPY), result, 'RUBJPY');	
    AnyBalance.setResult(result);
}

function decodeRatesData(e) {
    try {
        var t = e.substr(e.length - 4)
          , n = t.charCodeAt(0) + t.charCodeAt(1) + t.charCodeAt(2) + t.charCodeAt(3);
        n = (n = (e.length - 10) % n) > e.length - 10 - 4 ? e.length - 10 - 4 : n;
        var r = e.substr(n, 10);
        e = e.substr(0, n) + e.substr(n + 10);
        var a = decode64(decodeURIComponent(e));
        if (!1 === a)
            return !1;
        var i = ""
          , o = 0
          , l = 0;
        for (o = 0; o < a.length; o += 10) {
            var u = a.charAt(o)
              , s = r.charAt(l % r.length - 1 < 0 ? r.length + l % r.length - 1 : l % r.length - 1);
            i += (u = String.fromCharCode(u.charCodeAt(0) - s.charCodeAt(0))) + a.substring(o + 1, o + 10),
            l++
        }
        return i
    } catch (e) {
        return !1
    }
}

function decode64(e) {
    try {
        var t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
          , n = ""
          , r = void 0
          , a = void 0
          , i = ""
          , o = void 0
          , l = void 0
          , u = ""
          , s = 0;
        if (/[^A-Za-z0-9\+\/\=]/g.exec(e))
            return !1;
        e = e.replace(/[^A-Za-z0-9\+\/\=]/g, "");
        do {
            r = t.indexOf(e.charAt(s++)) << 2 | (o = t.indexOf(e.charAt(s++))) >> 4,
            a = (15 & o) << 4 | (l = t.indexOf(e.charAt(s++))) >> 2,
            i = (3 & l) << 6 | (u = t.indexOf(e.charAt(s++))),
            n += String.fromCharCode(r),
            64 !== l && (n += String.fromCharCode(a)),
            64 !== u && (n += String.fromCharCode(i)),
            r = a = i = "",
            o = l = u = ""
        } while (s < e.length);return unescape(n)
    } catch (e) {
        return !1
    }
}

function smartRound(val){
	if(val < 0.01)
		return +val.toFixed(4);
	return +val.toFixed(2);
}

