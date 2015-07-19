/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.130 Safari/537.36'
};

function getCurrentPhone(html){
   	var elem = getElements(html, [/<a[^>]+loginOverlayerSim[^>]*>/ig, /currentSim/i])[0];
   	if(!elem){
   		AnyBalance.trace(html);
   		throw new AnyBalance.Error('Could not find current number. Is the site changed?');
   	}
   	AnyBalance.trace('Current number: ' + replaceAll(elem, replaceTagsAndSpaces));

   	var phone = getParam(elem, null, null, /<div[^>]+class="loginOverlayerNumero"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
   	return phone;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://www.vodafone.it/";
    AnyBalance.setDefaultCharset('utf-8'); 

//	var html = AnyBalance.requestGet(baseurl + '190mobile/endpoint/Mobile5_restyle/home_mio190.php', g_headers);

	var html = AnyBalance.requestPost(baseurl + 'area-utente/sso/external/login', {
		username:prefs.login,
		password:prefs.password,
		redirectURL: baseurl + 'portal/Privati',
		actionName: 'externalLogin'
	}, addHeaders({Referer: baseurl + 'portal/Privati'}));
	
    if(!/logOutBtn/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+id="mainArea"[^>]*>[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Password non corretta/i.test(error));
		
    	AnyBalance.trace(html);
        throw new AnyBalance.Error('Could not enter personal account. Is the site changed?');
    }

   	var phone = getCurrentPhone(html);

    if(prefs.phone){
    	if((phone || '').indexOf(prefs.phone) < 0){
    		AnyBalance.trace('Need to switch to another number...');
    		var elem = getElements(html, [/<a[^>]+loginOverlayerSim[^>]*>/ig, new RegExp("'selectedBOID':'[^']*" + prefs.phone)])[0];
    		if(!elem)
            	throw new AnyBalance.Error('Number ' + prefs.phone + ' has not been found in your account', null, true);

            var formname = getParam(elem, null, null, /jsfcljs\s*\(\s*document.getElementById\('([^']*)/, replaceSlashes);
            var params = getParam(elem, null, null, /jsfcljs\s*\(\s*document.getElementById[^,]*,(\{[^}]*\})/, null, getJsonEval);
            var form = getElement(html, new RegExp('<form[^>]+id="' + formname + '"[^>]*>', 'i'));

            if(!form){
            	AnyBalance.trace(html);
            	throw new AnyBalance.Error('Could not find phone switching form. Is the site changed?');
            }
            
            params = joinObjects(createFormParams(form), params);
            var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, null, html_entity_decode);

            html = AnyBalance.requestPost(action, params, g_headers);
            phone = getCurrentPhone(html);
    	}
    	if((phone || '').indexOf(prefs.phone) < 0){
    		AnyBalance.trace(html);
    		throw new AnyBalance.Error('Could not switch to phone ' + params.selectedBOID + '. Is site changed?');
    	}
    }

    var href = getParam(html, null, null, /updateContents\("[^"]*async",\s*"([^"]*Errore[^"]*)/, replaceSlashes);
    if(!href){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error("Could not find reference to balance. Is the site changed?");
    }
    var hrefPlan = getParam(html, null, null, /updateContents\("[^"]*async",\s*"([^"]*Piano[^"]*)/, replaceSlashes);
    if(!hrefPlan){
    	AnyBalance.trace("Could not find reference to tariff. Is the site changed?");
    }

    //Установим нужные куки
    html= AnyBalance.requestGet(baseurl + '190/ecbb/jsp/utility/createLegacySessionBroker.jsp?picassoJSbroker=https://www.vodafone.it/area-utente/picassoGetLegacySession.jsp', g_headers);

    html= AnyBalance.requestGet(href, g_headers);
	
    var result = {success: true};
	
    getParam(phone, result, 'phone');
	getParam(html, result, 'balance', /<div[^>]+box2atomic[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	
	if(hrefPlan){
    	html= AnyBalance.requestGet(hrefPlan, g_headers);
    	getParam(html, result, '__tariff', /<div[^>]+column2_pf02[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    }

    AnyBalance.setResult(result);
}
