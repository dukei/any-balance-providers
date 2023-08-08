/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Language': 'ru,en-US;q=0.9,en;q=0.8,ru-RU;q=0.7',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
	
};

var baseurl = 'https://www.xe.com/';

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	AnyBalance.setCookie('.www.xe.com', 'optimizelyOptOut', true);
	
	var html = AnyBalance.requestGet(baseurl + 'api/protected/midmarket-converter/', addHeaders({
		'Accept': '*/*',
		'Authorization': 'Basic bG9kZXN0YXI6Z1NlYkxFd0ZnOTlWVWNQT1p1WW0zOHVydkxzNFhrV1U=',
		'Referer': baseurl,
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
//	var rates = JSON.parse(decodeRatesData(json.rates));
	var rates = json.rates;

    var result = {success: true};
	// USD
	getParam(smartRound(rates.USD/rates.EUR), result, 'EURUSD');
	getParam(smartRound(rates.USD/rates.GBP), result, 'GBPUSD');
	getParam(smartRound(rates.USD/rates.INR), result, 'INRUSD');
	getParam(smartRound(rates.USD/rates.AUD), result, 'AUDUSD');
	getParam(smartRound(rates.USD/rates.CAD), result, 'CADUSD');
	getParam(smartRound(rates.USD/rates.RUB), result, 'RUBUSD');
	getParam(smartRound(rates.USD/rates.ILS), result, 'ILSUSD');
	getParam(smartRound(rates.USD/rates.KZT), result, 'KZTUSD');
	getParam(smartRound(rates.USD/rates.ZAR), result, 'ZARUSD');
	getParam(smartRound(rates.USD/rates.NZD), result, 'NZDUSD');
	getParam(smartRound(rates.USD/rates.JPY), result, 'JPYUSD');
	getParam(smartRound(rates.USD/rates.CNY), result, 'CNYUSD');
	// EUR
	getParam(smartRound(rates.EUR/rates.USD), result, 'USDEUR');
	getParam(smartRound(rates.EUR/rates.GBP), result, 'GBPEUR');
	getParam(smartRound(rates.EUR/rates.INR), result, 'INREUR');
	getParam(smartRound(rates.EUR/rates.AUD), result, 'AUDEUR');
	getParam(smartRound(rates.EUR/rates.CAD), result, 'CADEUR');
	getParam(smartRound(rates.EUR/rates.RUB), result, 'RUBEUR');
	getParam(smartRound(rates.USD/rates.ILS), result, 'ILSEUR');
	getParam(smartRound(rates.USD/rates.KZT), result, 'KZTEUR');
	getParam(smartRound(rates.EUR/rates.ZAR), result, 'ZAREUR');
	getParam(smartRound(rates.EUR/rates.NZD), result, 'NZDEUR');
	getParam(smartRound(rates.EUR/rates.JPY), result, 'JPYEUR');
	getParam(smartRound(rates.EUR/rates.CNY), result, 'CNYEUR');
	// GBP
	getParam(smartRound(rates.GBP/rates.USD), result, 'USDGBP');
	getParam(smartRound(rates.GBP/rates.EUR), result, 'EURGBP');
	getParam(smartRound(rates.GBP/rates.INR), result, 'INRGBP');
	getParam(smartRound(rates.GBP/rates.AUD), result, 'AUDGBP');
	getParam(smartRound(rates.GBP/rates.CAD), result, 'CADGBP');
	getParam(smartRound(rates.GBP/rates.RUB), result, 'RUBGBP');
	getParam(smartRound(rates.GBP/rates.ILS), result, 'ILSGBP');
	getParam(smartRound(rates.GBP/rates.KZT), result, 'KZTGBP');
	getParam(smartRound(rates.GBP/rates.ZAR), result, 'ZARGBP');
	getParam(smartRound(rates.GBP/rates.NZD), result, 'NZDGBP');
	getParam(smartRound(rates.GBP/rates.JPY), result, 'JPYGBP');
	getParam(smartRound(rates.GBP/rates.CNY), result, 'CNYGBP');
	// CAD
	getParam(smartRound(rates.CAD/rates.USD), result, 'USDCAD');
	getParam(smartRound(rates.CAD/rates.EUR), result, 'EURCAD');
	getParam(smartRound(rates.CAD/rates.INR), result, 'INRCAD');
	getParam(smartRound(rates.CAD/rates.AUD), result, 'AUDCAD');
	getParam(smartRound(rates.CAD/rates.RUB), result, 'RUBCAD');
	getParam(smartRound(rates.CAD/rates.ILS), result, 'ILSCAD');
	getParam(smartRound(rates.CAD/rates.KZT), result, 'KZTCAD');
	getParam(smartRound(rates.CAD/rates.ZAR), result, 'ZARCAD');
	getParam(smartRound(rates.CAD/rates.NZD), result, 'NZDCAD');
	getParam(smartRound(rates.CAD/rates.JPY), result, 'JPYCAD');
	getParam(smartRound(rates.CAD/rates.CNY), result, 'CNYCAD');
    // ILS
	getParam(smartRound(rates.ILS/rates.USD), result, 'USDILS');
	getParam(smartRound(rates.ILS/rates.EUR), result, 'EURILS');
	getParam(smartRound(rates.ILS/rates.INR), result, 'INRILS');
	getParam(smartRound(rates.ILS/rates.AUD), result, 'AUDILS');
	getParam(smartRound(rates.ILS/rates.CAD), result, 'CADILS');
	getParam(smartRound(rates.ILS/rates.RUB), result, 'RUBILS');
	getParam(smartRound(rates.ILS/rates.KZT), result, 'KZTILS');
	getParam(smartRound(rates.ILS/rates.ZAR), result, 'ZARILS');
	getParam(smartRound(rates.ILS/rates.NZD), result, 'NZDILS');
	getParam(smartRound(rates.ILS/rates.JPY), result, 'JPYILS');
	getParam(smartRound(rates.ILS/rates.CNY), result, 'CNYILS');
	// RUB
	getParam(smartRound(rates.RUB/rates.USD), result, 'USDRUB');
	getParam(smartRound(rates.RUB/rates.EUR), result, 'EURRUB');
	getParam(smartRound(rates.RUB/rates.INR), result, 'INRRUB');
	getParam(smartRound(rates.RUB/rates.AUD), result, 'AUDRUB');
	getParam(smartRound(rates.RUB/rates.CAD), result, 'CADRUB');
	getParam(smartRound(rates.RUB/rates.ILS), result, 'ILSRUB');
	getParam(smartRound(rates.RUB/rates.KZT), result, 'KZTRUB');
	getParam(smartRound(rates.RUB/rates.ZAR), result, 'ZARRUB');
	getParam(smartRound(rates.RUB/rates.NZD), result, 'NZDRUB');
	getParam(smartRound(rates.RUB/rates.JPY), result, 'JPYRUB');
	getParam(smartRound(rates.RUB/rates.CNY), result, 'CNYRUB');
	// KZT
	getParam(smartRound(rates.KZT/rates.USD), result, 'USDKZT');
	getParam(smartRound(rates.KZT/rates.EUR), result, 'EURKZT');
	getParam(smartRound(rates.KZT/rates.INR), result, 'INRKZT');
	getParam(smartRound(rates.KZT/rates.AUD), result, 'AUDKZT');
	getParam(smartRound(rates.KZT/rates.CAD), result, 'CADKZT');
	getParam(smartRound(rates.KZT/rates.RUB), result, 'RUBKZT');
	getParam(smartRound(rates.KZT/rates.ILS), result, 'ILSKZT');
	getParam(smartRound(rates.KZT/rates.ZAR), result, 'ZARKZT');
	getParam(smartRound(rates.KZT/rates.NZD), result, 'NZDKZT');
	getParam(smartRound(rates.KZT/rates.JPY), result, 'JPYKZT');
	getParam(smartRound(rates.KZT/rates.CNY), result, 'CNYKZT');
    // Date
	var dt = new Date(json.timestamp);
	result.__tariff = ('0' + (dt.getDate())).slice(-2) + '.' + ('0' + (dt.getMonth() + 1)).slice(-2) + '.' + dt.getFullYear() + ' ' + ('0' + (dt.getHours())).slice(-2) + ':' + ('0' + (dt.getMinutes())).slice(-2);
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
