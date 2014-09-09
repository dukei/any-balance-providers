/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = 
{
	'Content-Type': 'application/json; charset=utf-8',
	'Origin': 'http://m.012mobile.co.il',
	'Referer': 'http://m.012mobile.co.il'
};


// ask for the GUID, this will only work on mobile connection, on the 012 network
function getGuid()
{
	var guidUrl = 'http://192.118.8.173/GeneralSrv/General.svc/Authentication/GetGuid';
	var guidRequest = '{"brand":"012Mobile","platform":"WEB"}';
	var json = getJson(AnyBalance.requestPost(guidUrl,guidRequest,addHeaders(g_headers)));
	if (typeof json.GetGuidResult=="undefined")
	{
		AnyBalance.trace(JSON.stringify(json));
		throw new AnyBalance.Error("Unexpected server response.");
	}
	if (!json.GetGuidResult.guid)
		throw new AnyBalance.Error("Unexpected server response. Are you on mobile data connection?");
	return(json.GetGuidResult.guid);	
}


// get the key, required to get the bill data, needs the GUID above
function getKey(guid)
{
	var keyUrl = 'https://192.118.8.173:8443/GeneralSrv/General.svc/AuthenticationSSL/GetKey';
	var keyRequest = '{"guid":"' + guid + '","brand":"012Mobile","platform":"WEB"}';
	var json = getJson(AnyBalance.requestPost(keyUrl,keyRequest,addHeaders(g_headers)));
	if ((typeof json.GetKeyResult=="undefined") || (json.GetKeyResult==null))
	{
		AnyBalance.trace(JSON.stringify(json));
		throw new AnyBalance.Error("Unexpected server response. Invalid GUID?");
	}
	return(json.GetKeyResult);
}


// get bill data JSON
function getBillData(key)
{
	var billUrl = 'https://m.012mobile.co.il/wsselfservice/Mobile012API.svc/GetBillData';
	var billRequest = '{"key" : "' + key + '"}';
	var json = getJson(AnyBalance.requestPost(billUrl,billRequest,addHeaders(g_headers)));
	if (typeof json.GetBillDataResult=="undefined")
	{
		AnyBalance.trace(JSON.stringify(json));
		throw new AnyBalance.Error("Unexpected server response");
	}
	return(getJson(json.GetBillDataResult)); 
}


function main() 
{
	var result = {success: true};
    var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');

	// The GUID can be acquired by asking for it on a mobile connection
	// or by requesting an SMS authentication (not implemented here)
	// The GUID is permenent, one can reuse it on any connection later on, though.
	var manualGuid = (typeof prefs.guid!="undefined") && (prefs.guid.length>0);
    var guid = manualGuid ? prefs.guid : getGuid();
    AnyBalance.trace((manualGuid ? 'Manual ' : '') + 'GUID: ' + guid);
        
	// get the key, it is required for the rest of the requests
	var key = getKey(guid);
	AnyBalance.trace('Key: ' + key);
	
	// get bill data
	var bill = getBillData(key);
	AnyBalance.trace('Bill: ' + JSON.stringify(bill));
	
	// set the results
	if (typeof bill.total!="undefined")
		getParam(bill.total, result, 'price', null, null, parseBalance); 
	if (typeof bill.FullName!="undefined")
		getParam(bill.FullName, result, 'fullname', null, null, html_entity_decode); 
	if (typeof bill.msisdn!="undefined")
		getParam(bill.msisdn, result, 'number', null, null, html_entity_decode); 
	if (typeof bill.nextBillcycle!="undefined")
		getParam(bill.nextBillcycle, result, 'nextbill', null, null, parseDate); 
	if (typeof bill.discountExpiration!="undefined")
		getParam(bill.discountExpiration, result, 'discountend', /\d\d\.\d\d\.\d\d\d\d/, null, parseDate); 
	
	// done, set the result
	AnyBalance.setResult(result);
}