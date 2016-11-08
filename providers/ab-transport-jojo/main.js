/**
AnyBalance Provider (http://any-balance-providers.googlecode.com)
*/


var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
var headersJSON = {
	"Accept": "application/json, text/javascript, */*; q=0.01",
	"Content-Type": "application/json",
	"User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64)"
};

if (typeof String.prototype.trim != 'function') { // detect native implementation
	String.prototype.trim = function () {
		return this.replace(/^\s+/, '').replace(/\s+$/, '');
	};
}

function main(){
	var prefs = AnyBalance.getPreferences();
	var result = {success: true};
	if(!prefs.cardnum || !/^\d{10}$/.test(prefs.cardnum))
		throw new AnyBalance.Error("Enter only first 10 digits of the card.");
	
	var baseurl = "https://www.skanetrafiken.se/";
	AnyBalance.setDefaultCharset("ISO-8859-1");
	
	checkEmpty(prefs.cardnum, 'Enter card number!');
	checkEmpty(prefs.cardcvc, 'Enter card CVC!');
	
	var html = AnyBalance.requestGet(baseurl + 'e-tjanster/se-saldo-och-ladda-kort1', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error("Can't open skanetrafiken.se! Try to refresh later.");
	}	
	
	var token = getParam(html, null, null, /"__RequestVerificationToken"[^>]*value="([^"]+)/i);
	checkEmpty(token, 'Can`t find session token!');
	
	html = AnyBalance.requestPost(baseurl + "CardBalance/GetCardDirectly", {
		'__RequestVerificationToken': token,
		'request.CardNumber': prefs.cardnum,
		'request.Cvc': prefs.cardcvc,
		'X-Requested-With': 'XMLHttpRequest',
	}, addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		'Referer': baseurl + 'e-tjanster/se-saldo-och-ladda-kort'
	}));	
	
	if(/class="error"/i.test(html)){
		var error = getParam(html, null, null, /<div[^>]+class="error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
		
		throw new AnyBalance.Error('Card balance get error. Website design is changed?');
	}
	
	getParam(html, result, '__tariff', /"type"[^>]*>\s*([\s\S]*?)\s*</i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'cardnum', /"card-number"[^>]*>\s*([\d.,-]+)\s*</i, replaceTagsAndSpaces, html_entity_decode);
	
	balnow = getParam(html, null, null, /"balance"[^>]*>\s*([\d.,-]+)\skr/i, replaceTagsAndSpaces, parseBalance);
	baldown = getParam(html, null, null, /"fetch-balance"[^>]*>\s*([\d.,-]+)\skr/i, replaceTagsAndSpaces, parseBalance);
	if (isset(balnow) || isset(baldown)) {
		getParam((isset(balnow) ? balnow : 0) + (isset(baldown) ? baldown : 0), result, 'balance');
	}
	if (isset(balnow)) {
		getParam(balnow, result, 'balancenow');
	}
	if (isset(baldown)) {
		getParam(baldown, result, 'balancedownload');
	}

	getParam(html, result, ['currency','balance','balancenow','balancedownload'], /"balance"[^>]*>\s*([\d.,-]+\skr)/i, replaceTagsAndSpaces, parseCurrency);

	getParam(html, result, 'validfrom', /"validity"[^>]*>\s*([\d.,-]+)\s-\s[\d.,-]+\s*</i, replaceTagsAndSpaces, parseDateISO);
	getParam(html, result, 'validtill', /"validity"[^>]*>\s*[\d.,-]+\s-\s([\d.,-]+)\s*</i, replaceTagsAndSpaces, parseDateISO);
	getParam(html, result, 'zonesnum', /"zone-box-\d+-title"[^>]*>\s*([\d.,-]+)\szoner/i, replaceTagsAndSpaces, parseBalance);
	
	
	if (prefs.cardnum && isAvailable(['expiresat', 'expiresin', 'expirestate'])) {
		url = "http://195.66.94.115/card?identifier=" + prefs.cardnum;
		AnyBalance.trace("GET: " + url);
		html = AnyBalance.requestGet(url, headersJSON);
		AnyBalance.trace("GET: " + url + "... OK: " + html);

		json = getJson(html);
		if (json['Identifier'] != null && json['Identifier'] == prefs.cardnum) {
			if (isAvailable('expiresat')) {
				var dt = new Date(+(/\/Date\((\d*)[-\d]*\)\//.exec(json['ExpireDate']))[1]);
				result['expiresat'] = parseDateISO(dt);
			} if (isAvailable('expiresin')) {
				result['expiresin'] = json['DaysToExpiration'];
			} if (isAvailable('expirestate')) {
				result['expirestate'] = json['Expired'] == false ? "valid" : "expired";
			}
		}
	}
	
	AnyBalance.setResult(result);
}
