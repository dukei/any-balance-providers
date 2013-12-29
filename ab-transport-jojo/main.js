/**
AnyBalance Provider (http://any-balance-providers.googlecode.com)

Retrieves the balance of the Jojo Skanetrafiken transport card.

Skanetrafiken website: http://www.skanetrafiken.se
My pages: http://www.shop.skanetrafiken.se/
*/

var headers = {
	"User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64)"};
var headersJSON = {
	"Accept": "application/json, text/javascript, */*; q=0.01",
	"Content-Type": "application/json",
	"User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64)"};

if (typeof String.prototype.trim != 'function') { // detect native implementation
  String.prototype.trim = function () {
	return this.replace(/^\s+/, '').replace(/\s+$/, '');
  };
}

function main(){
	var prefs = AnyBalance.getPreferences();
	var result = {success: true};
	if(prefs.cardnum)
		if(!/^\d{10}$/.test(prefs.cardnum))
			throw new AnyBalance.Error("Enter only first 10 digits of the card.");

	var baseurl = "http://www.shop.skanetrafiken.se/";
	AnyBalance.setDefaultCharset("ISO-8859-1");
	
	var url = baseurl + "kollasaldo.html";
	AnyBalance.trace("POST: " + url);
	html = AnyBalance.requestPost(url, {
		'cardno':prefs.cardnum,
		'backno':prefs.cardcvc,
		'ST_CHECK_SALDO':'Se saldo',
	}, headers);
	AnyBalance.trace("POST: " + url + "... OK");

	if(/class="error"/i.test(html)){
		var error = getParam(html, null, null, /<div[^>]+class="error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Card balance get error. Website design is changed?');
	}
	
	result.__tariff = prefs.cardnum;
	cardnum = prefs.cardnum;
	getParam(html, result, 'balance', /Nytt saldo:<\/h3>[\s\S]*?<h3>([\s\S]*?)<\/h3>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balancenow', /Tillg.ngligt nu:<\/h4>[\s\S]*?<p>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balancedownload', /Att h.mta:[\s\S]*?<p>.([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency','balance','balancenow','balancedownload'], /Nytt saldo:<\/h3>[\s\S]*?<h3>([\s\S]*?)<\/h3>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'validfrom', /Periodkort fr:<\/h4>[\s\S]*?<p>([\s\S]*?) till/i, replaceTagsAndSpaces, parseDateISO);
	getParam(html, result, 'validtill', /Periodkort fr:<\/h4>[\s\S]*? till ([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseDateISO);
	getParam(html, result, 'zonesnum', /Antal zoner:<\/h4>[\s\S]*?<p>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
	if (isAvailable('cardnum'))
	{
		result['cardnum'] = cardnum;
	}
	
	if (cardnum != null && isAvailable(['expiresat', 'expiresin', 'expirestate']))
	{
		url = "http://195.66.94.115/card?identifier=" + cardnum;
		AnyBalance.trace("GET: " + url);
		html = AnyBalance.requestGet(url, headersJSON);
		AnyBalance.trace("GET: " + url + "... OK: " + html);

		json = getJson(html);
		if (json['Identifier'] != null && json['Identifier'] == cardnum)
		{
			if (isAvailable('expiresat'))
			{
				var dt = new Date(+(/\/Date\((\d*)[-\d]*\)\//.exec(json['ExpireDate']))[1]);
				result['expiresat'] = parseDateISO(dt);
			}
			if (isAvailable('expiresin'))
			{
				result['expiresin'] = json['DaysToExpiration'];
			}
			if (isAvailable('expirestate'))
			{
				result['expirestate'] = json['Expired'] == false ? "valid" : "expired";
			}
		}
	}
	
	AnyBalance.setResult(result);
}
