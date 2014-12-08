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

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.servis24.cz/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Enter client number!');
	checkEmpty(prefs.password, 'Enter password!');
	
	AnyBalance.setCookie('www.servis24.cz', 'cz.csas.ib.framework.i18n.IbLocaleResolver.LOCALE', 'en');
	AnyBalance.setCookie('servis24.cz', 'cz.csas.ib.framework.i18n.IbLocaleResolver.LOCALE', 'en');
	
	var html = AnyBalance.requestGet(baseurl + 'ebanking-s24/ib/base/usr/aut/login?execution=e1s1', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('!.');
	
	var id_digest_nonce = getParam(html, null, null, /"id_digest_nonce"[^>]*value="([^"]+)/i);
	checkEmpty(id_digest_nonce, 'Can`t find id_digest_nonce!', true);
	
	var execKey = getParam(html, null, null, /execution=(.{4})/i) || 'e1s1';
	
	html = AnyBalance.requestGet(baseurl + 'ebanking-s24/ib/base/usr/aut/login?transitionEventRequest=true', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'ebanking-s24/ib/base/usr/aut/login?execution=' + execKey, {
		'id_digest_pwd': doDigestResponse(prefs.login, prefs.password, id_digest_nonce, "SHA1", "HEX"),
		'id_digest_nonce': id_digest_nonce,
		'id_clientid': prefs.login,
		'id_password': 	prefs.password.replace(/./ig, "*"),
		'org.apache.myfaces.trinidad.faces.FORM': 'loginForm',
		'_noJavaScript':'false',
		'javax.faces.ViewState':execKey,
		'javax.faces.RenderKitId':'org.apache.myfaces.trinidad.core',
		'source':'doLogin'
	}, addHeaders({Referer: baseurl + 'ebanking-s24/ib/base/usr/aut/login?execution=' + execKey}));
	
	if (!/logout/i.test(html)) {
		var error = sumParam(html, null, null, /class="msgError"[^>]*>([\s\S]*?)<\/[ou]l/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		if (error)
			throw new AnyBalance.Error(error, null, /Log in again/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Login attempt has been failed.');
	}
    
	var result = {success: true};
	
	getParam(html, result, 'balance', /Available balance(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'acc_balance', /Account balance(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'mon_balance', /Money aside balance(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /accountName"*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'user_name', /userName(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_number', /accountName"*>(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}

var SHA1C = "SHA1";
var HEXC = "HEX";
var DESC = "DES";
var AESC = "AES";
var DEFAESKEYLENGTH = 32;
var ECBC = "ECB";
var CBCC = "CBC";
var DEFAESKEYSIZE = 128;
var DEFAESBLOCKSIZE = 128;

function doDigestResponse(c, l, h, k, d) {
    var e = "";
    var a = "";
    var b = "";
    var j = "";
    var f = "";
    if ((c == "") || (l == "") || (h == "")) {
        return e
    }
    b = String(c) + String(l);
    a = calcSHA1(b);
    j = String(a) + String(h);
    if (k == SHA1C) {
        f = calcSHA1(j)
    } else {
        return e
    }
    if (d == HEXC) {
        return f
    } else {
        return e
    }
}

function calcSHA1(v) {
    var A = str2blks_SHA1(v);
    var B = new Array(80);
    var z = 1732584193;
    var y = -271733879;
    var u = -1732584194;
    var s = 271733878;
    var r = -1009589776;
    for (var o = 0, f = A.length; o < f; o += 16) {
        var q = z;
        var p = y;
        var n = u;
        var m = s;
        var h = r;
        for (var k = 0; k < 80; k++) {
            if (k < 16) {
                B[k] = A[o + k]
            } else {
                B[k] = rol(B[k - 3] ^ B[k - 8] ^ B[k - 14] ^ B[k - 16], 1)
            }
            var C = safe_add(safe_add(rol(z, 5), ft(k, y, u, s)), safe_add(safe_add(r, B[k]), kt(k)));
            r = s;
            s = u;
            u = rol(y, 30);
            y = z;
            z = C
        }
        z = safe_add(z, q);
        y = safe_add(y, p);
        u = safe_add(u, n);
        s = safe_add(s, m);
        r = safe_add(r, h)
    }
    return hex(z) + hex(y) + hex(u) + hex(s) + hex(r)
}

function safe_add(a, d) {
    var c = (a & 65535) + (d & 65535);
    var b = (a >> 16) + (d >> 16) + (c >> 16);
    return (b << 16) | (c & 65535)
}

function rol(a, b) {
    return (a << b) | (a >>> (32 - b))
}

function ft(e, a, h, f) {
    if (e < 20) {
        return (a & h) | ((~a) & f)
    }
    if (e < 40) {
        return a ^ h ^ f
    }
    if (e < 60) {
        return (a & h) | (a & f) | (h & f)
    }
    return a ^ h ^ f
}
function kt(a) {
    return (a < 20) ? 1518500249 : (a < 40) ? 1859775393 : (a < 60) ? -1894007588 : -899497514
}

var hex_chr = "0123456789abcdef";
function hex(b) {
    var c = "";
    for (var a = 7; a >= 0; a--) {
        c += hex_chr.charAt((b >> (a * 4)) & 15)
    }
    return c
}

function str2blks_SHA1(d) {
    var b = ((d.length + 8) >> 6) + 1;
    var e = new Array(b * 16);
    for (var c = 0; c < b * 16; c++) {
        e[c] = 0
    }
    for (var c = 0, a = d.length; c < a; c++) {
        e[c >> 2] |= d.charCodeAt(c) << (24 - (c % 4) * 8)
    }
    e[c >> 2] |= 128 << (24 - (c % 4) * 8);
    e[b * 16 - 1] = d.length * 8;
    return e
}