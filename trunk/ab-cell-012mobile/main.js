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


// restore the GUID from saved data if available, otherwise try to get from the network 
function getSavedOrNetworkGuid()
{
	// make sure the data save/resore API is supported
	var canSave = AnyBalance.getLevel()>=9;
	if (!canSave)
	{
		AnyBalance.trace('Unable to save network GUID, AnyBalance version is too old. The provider will still work while on 012mobile netwrok or with manual GUID.');
		return(getGuid());
	}
		
	// try restoring the GUID from saved data
	var guid = AnyBalance.getData('guid',null);
	if (guid!=null)
	{
		AnyBalance.trace('Using saved GUID...');
		return(guid);
	}
		
	// ask the network and save it
	guid = getGuid();
	AnyBalance.trace('Saving network GUID (' + guid + ') for future use...');
	AnyBalance.setData('guid',guid);
	AnyBalance.saveData();
	return(guid);
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
	var billUrl = 'http://my.orange.co.il/Mobile012Srv/Mobile012.svc/myAccount/GetContractBillingData';
	var billRequest = '{"brand":"012Mobile","platform":"WEB","key" : "' + key + '"}';
    var json = getJson(AnyBalance.requestPost(billUrl,billRequest,addHeaders(g_headers)));
	if (typeof json.GetContractBillingDataResult=="undefined")
	{
		AnyBalance.trace(JSON.stringify(json));
		throw new AnyBalance.Error("Unexpected server response");
	}
	return(json.GetContractBillingDataResult); 
}


// get data plan JSON
function getDataPlan(key)
{
	var url = 'http://my.orange.co.il/ProductsSrv/SurfingPackages.svc/ContractData/GetContractCustomerDetails';
	var request = '{"brand":"012Mobile","key" : "' + key + '"}';
	return(getJson(AnyBalance.requestPost(url,request,addHeaders(g_headers)))); 
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
	var guid = manualGuid ? prefs.guid : getSavedOrNetworkGuid();
    AnyBalance.trace((manualGuid ? 'Manual ' : '') + 'GUID: ' + guid);
        
	// get the key, it is required for the rest of the requests
	var key = getKey(guid);
	AnyBalance.trace('Key: ' + key);
	
	// get bill data and contract info (contract info contains the roaming plans)
	var bill = getBillData(key);
	AnyBalance.trace('Bill: ' + JSON.stringify(bill));
	
    // get data plan details
    var dataPlan = getDataPlan(key);
    AnyBalance.trace('Data Plan: ' + JSON.stringify(dataPlan));
    if (dataPlan.balance!=null)
    {
        result['dataprcnt'] = dataPlan.balance.UsedPercent;
        result['datausage'] = dataPlan.balance.CreditAmmountMB*dataPlan.balance.UsedPercent/100.0/1024.0;
        result['dataplans'] = dataPlan.surfing.VasProductName;
    } else AnyBalance.trace('Warning, no data plan reported, not updating data balance...');

    // get roaming plans
	for (var i=0,n=0;i<bill.International.Entity.length;i++) 
	{
		var plan = bill.International.Entity[i];
        var key = 'roamingcredit'+(++n);
        if (plan.REMAIN_AMOUNT!=null)
            getParam(plan.REMAIN_AMOUNT.toString(), result, key, null, null, parseBalance); 
        else
            result[key] = 0;
        result[key] *= 100;
	} 
	
	// set the rest of the results
	getParam(bill.ContractTotalFinalBalance, result, 'price', null, null, parseBalance); 
	getParam(bill.FullName, result, 'fullname', null, null, html_entity_decode); 
	getParam(bill.msisdn, result, 'number', null, null, html_entity_decode); 
	getParam(bill.NextMonthCharge, result, 'nextbill', null, null, parseDate); 
	getParam(bill.DiscountExpiration, result, 'discountend', /\d\d\.\d\d\.\d\d\d\d/, null, parseDate); 
	getParam(bill.PlanName, result, 'plan', null, null, html_entity_decode); 
	
    // done, set the result
	AnyBalance.setResult(result);
}