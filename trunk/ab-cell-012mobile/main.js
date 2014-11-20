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
	var guidUrl = 'http://mystg.orange.co.il/GeneralSrv/General.svc/Authentication/GetGuid';
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
	var keyUrl = 'https://mystg.orange.co.il/GeneralSrv/General.svc/AuthenticationSSL/GetKey';
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


// get abroad plans info
function getContractInfo(key)
{
	var billUrl = 'https://192.118.8.173:8443/IntlSrv/InternationalAPI.svc/General/GetContractInfo';
	var billRequest = '{"brand":"012Mobile","key" : "' + key + '"}';
	var json = getJson(AnyBalance.requestPost(billUrl,billRequest,addHeaders(g_headers)));
	if (typeof json.ContractId=="undefined")
	{
		AnyBalance.trace(JSON.stringify(json));
		throw new AnyBalance.Error("Unexpected server response");
	}
	return(json); 
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
	
	// get bill data and contract info (contract info contains the roaming plans)
	var bill = getBillData(key);
	AnyBalance.trace('Bill: ' + JSON.stringify(bill));
	var contract = getContractInfo(key);
	AnyBalance.trace('ContractInfo: ' + JSON.stringify(contract));
	
    // get data plans, sum it all up together in case there is more than one
	if (bill.dataPackages.length)
	{
		result['dataprcnt'] = result['datausage'] = 0.0;
		result['dataplans'] = '';
		for (var i=0;i<bill.dataPackages.length;i++) 
		{
			var dataPackage = bill.dataPackages[i];
			result['dataprcnt'] += dataPackage.dataplanUsedPrecentage/bill.dataPackages.length;
			result['datausage'] += parseFloat(dataPackage.consumptionDescription);
			result['dataplans'] += (result['dataplans'].length ? '\n' : '') + dataPackage.dataplan;
		} 
	}

    // get roaming plans
	for (var i=0,n=0;i<contract.ActivatedPackages.length;i++) 
	{
		var plan = contract.ActivatedPackages[i];
        if ((plan.Balance==null) || (plan.Balance.RemainAmount==null))
            continue;
        getParam(plan.Balance.RemainAmount.toString(), result, 'roamingcredit'+(++n), null, null, parseBalance); 
	} 
	
	// set the rest of the results
	getParam(bill.total, result, 'price', null, null, parseBalance); 
	getParam(bill.FullName, result, 'fullname', null, null, html_entity_decode); 
	getParam(bill.msisdn, result, 'number', null, null, html_entity_decode); 
	getParam(bill.nextBillcycle, result, 'nextbill', null, null, parseDate); 
	getParam(bill.discountExpiration, result, 'discountend', /\d\d\.\d\d\.\d\d\d\d/, null, parseDate); 
	getParam(bill.rateplan, result, 'plan', null, null, html_entity_decode); 
	
    // done, set the result
	AnyBalance.setResult(result);
}