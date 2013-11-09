/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
Reads the balance of Rikslunchen money card from Rikslunchen account (http://www.rikslunchen.se)
Author: valeravi (valeravi@vi-soft.com.ua)
*/

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.rikslunchen.se/';
	AnyBalance.setDefaultCharset('utf-8');
	var result = {success: true};
	
	checkEmpty(prefs.cardid, 'Enter the Card ID!');

    page='riks-cp/check_balance.html'
    AnyBalance.trace('GET: ' + baseurl + page);	
	html = AnyBalance.requestGet(baseurl + page);
    AnyBalance.trace('GET: ' + baseurl + page + ' ... OK');	

	var public_key = getParam(html, null, null, /name="public_key"[\s]*?value="([\s\S]*?)"[\s\S]*?\/>/i, replaceTagsAndSpaces, html_entity_decode);
    AnyBalance.trace('public_key: ' + public_key);
	getParam(html, result, ['currency','balance'], /id="cardbalance"[\s\S]*?&nbsp;<strong>([\s\S]*?)<\/strong><\/span>/i, replaceTagsAndSpaces, html_entity_decode);

	if(public_key == null)
	{
		throw new AnyBalance.Error('Cant get public key. Web site was changed?');
	}

    page='riks-cp/dwr/call/plaincall/cardUtil.getCardData.dwr'
    AnyBalance.trace('POST: ' + baseurl + page);
	html = AnyBalance.requestPost(baseurl + page, {
		callCount:'1',
		windowName:'',
		'c0-scriptName':'cardUtil',
		'c0-methodName':'getCardData',
		'c0-id':'0',
		'c0-param0':'string:' + prefs.cardid,
		'c0-param1':'string:' + public_key,
		batchId:'1',
		page:'%2Friks-cp%2Fcheck_balance.html',
		httpSessionId:public_key,
		scriptSessionId:''
    });
    AnyBalance.trace('POST: ' + baseurl + page + ' ... OK');
    
	if(/java.lang.IllegalArgumentException/i.test(html))
	{
		var error = getParam(html, null, null, /message:'([\s\S]*?)' /i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error("Can't get data (IllegalArgumentException). Web site was changed?");
	}
	message = getParam(html, null, null, /message:([\s\S]*?),/i, replaceTagsAndSpaces, html_entity_decode);
    AnyBalance.trace("message: " + message);
	valid = getParam(html, null, null, /valid:([\s\S]*?)\}/i, replaceTagsAndSpaces, html_entity_decode);
    AnyBalance.trace("valid: " + valid);
	if(message != "null" || valid != "true")
	{
		throw new AnyBalance.Error("Error (server answer valid=" + valid + "): " + message);
	}

	getParam(html, result, '__tariff', /cardNo:([\s\S]*?),/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /balance:"([\s\S]*?)",/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'topuplast', /lastTopupDateStr:"([\s\S]*?)",/i, replaceTagsAndSpaces, parseDateISO);
	getParam(html, result, 'transactions', /transfered:([\s\S]*?),/i, replaceTagsAndSpaces, html_entity_decode);
    AnyBalance.setResult(result);
}
