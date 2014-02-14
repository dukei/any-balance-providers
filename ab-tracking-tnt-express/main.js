/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.code, 'Enter valid tracking number without white spaces!');
	
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
		'searchType':prefs.type || 'CON',
		'sourceCountry':'ww',
		'sourceID':'1',
		'trackType':prefs.type,
	});
	var result = {success: true};

	getParam(html, result, 'pick_up_date', /Pick up date(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'destination', /Destination(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'laststate', /<table[^>]*"appTable"[^>]*>(?:[\s\S]*?sectionheading[\s\S]*?<tr[^>]*>)([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, html_entity_decode);

	// не проверял после изменений сайта
	getParam(html, result, 'reference', /Reference[\s\S]{1,60}<B>([\s\S]*?)<\/B>/i, null, null);
	getParam(html, result, 'estimated', /Estimated[\s\S]{1,70}<B>([\s\S]*?)<\/B>/i, null, null);
	
	AnyBalance.setResult(result);
}