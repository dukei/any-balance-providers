/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = 
{
	'Content-Type': 'application/json; charset=utf-8',
	'Origin': 'https://m.012mobile.co.il',
	'Referer': 'https://m.012mobile.co.il'
};


// ask for the GUID, this will only work on mobile connection, on the 012 network
function getGuid()
{
	var guidUrl = 'https://192.118.8.173/GeneralSrv/General.svc/Authentication/GetGuid';
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
	var billUrl = 'https://my.partner.co.il/Mobile012Srv/Mobile012.svc/myAccount/GetContractBillingData';
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
	var url = 'https://my.partner.co.il/ProductsSrvAddOns/SurfingPackages.svc/ContractData/GetContractSurfingDetails';
	var request = '{"brand":"012Mobile","key" : "' + key + '"}';
    var json = getJson(AnyBalance.requestPost(url,request,addHeaders(g_headers)));
    if (typeof json.GetContractSurfingDetailsResult=="undefined")
	{
		AnyBalance.trace(JSON.stringify(json));
		throw new AnyBalance.Error("Unexpected server response");
	}
	return(json.GetContractSurfingDetailsResult); 
}


function main() 
{
	var result = {success: true};
    var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	AnyBalance.setOptions({SSL_ENABLED_PROTOCOLS: ['TLSv1.1', 'TLSv1.2']}); 
    
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

    try
    {
        // get data plan details
        var dataPlan = getDataPlan(key);
        AnyBalance.trace('Data Plan: ' + JSON.stringify(dataPlan));

        // data plan addon (used first)
        if ((dataPlan.addons!=null) && (dataPlan.addons[0]!=null))
        {
            result['dataprcnt'] = dataPlan.addons[0].balance.UsedPercent;
            result['datausage'] = dataPlan.addons[0].balance.CreditAmmountMB*dataPlan.addons[0].balance.UsedPercent/100.0/1024.0;
            result['dataplans'] = dataPlan.addons[0].Name;
        } 

        // regular data plan
        if ((dataPlan.surfing!=null) && ((result['dataprcnt']==null) || (result['dataprcnt']>99.4)))
        {
            result['dataprcnt'] = dataPlan.surfing.balance.UsedPercent;
            result['datausage'] = dataPlan.surfing.balance.CreditAmmountMB*dataPlan.surfing.balance.UsedPercent/100.0/1024.0;
            result['dataplans'] = dataPlan.surfing.Name;
        }
    }
    catch (e)
    {
        // don't fail everything when unable to get data plans, those aren't always available (or are they moving the API somewhere?)
        AnyBalance.trace('Warning, unable to get data plans: ' + e.message);
    }
    
    // get roaming plans
    if (bill.International.Entity!=null)
	{
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
    }
    
    // minutes and text
    if (bill.CallsSubCategory!=null)
        result['voice'] = bill.CallsSubCategory.Entity[0].USED_PERCENT;
    if (bill.SmsSubCategory!=null)
        result['text'] = bill.SmsSubCategory.Entity[0].USED_PERCENT;
        
	// set the rest of the results
	getParam(bill.ContractTotalFinalBalance, result, 'price', null, null, parseBalance); 
	getParam(bill.FullName, result, 'fullname', null, null, html_entity_decode); 
	getParam(bill.Msisdn, result, 'number', null, null, html_entity_decode); 
	getParam(bill.NextMonthCharge, result, 'nextbill', null, null, parseDate); 
	getParam(bill.DiscountExpiration, result, 'discountend', /\d\d\.\d\d\.\d\d\d\d/, null, parseDate); 
	getParam(bill.PlanName, result, 'plan', null, null, html_entity_decode); 

    // done, set the result
	AnyBalance.setResult(result);
}