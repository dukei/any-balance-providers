/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	
	var baseurl = 'http://www.tnt.com/';
    
	var html = AnyBalance.requestPost(baseurl + 'webtracker/tracking.do', {
		'cons':prefs.code,
		'genericSiteIdent':'',
		'navigation':'1',
		'page':'1',
		'plazakey':'',
		'refs':prefs.code,
		'requestType':'GEN',
		'respCountry':'au',
		'respLang':'en',
		'searchType':prefs.type,
		'sourceCountry':'ww',
		'sourceID':'1',
		'trackType':prefs.type,
	});
	var result = {success: true};

	getParam(html, result, 'reference', /Reference[\s\S]{1,60}<B>([\s\S]*?)<\/B>/, null, null);
	getParam(html, result, 'pick_up_date', /Pick up date[\s\S]{1,70}<B>([\s\S]*?)<\/B>/, null, null);
	getParam(html, result, 'destination', /Destination[\s\S]{1,70}<B>([\s\S]*?)<\/B>/, null, null);
	getParam(html, result, 'estimated', /Estimated[\s\S]{1,70}<B>([\s\S]*?)<\/B>/, null, null);

	AnyBalance.setResult(result);
}