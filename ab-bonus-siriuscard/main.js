/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'application/json, text/javascript, */*; q=0.01',
	'Content-Type':'application/json; charset=utf-8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36',
	'X-Requested-With':'XMLHttpRequest',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://www.jumeirah.com/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'en/sirius-login/', g_headers);
	var loginParams = {
        siriusId:prefs.login,
        password:prefs.password,
    };
	html = AnyBalance.requestPost(baseurl + 'Services/SiriusService.svc/SiriusLogin', JSON.stringify(loginParams), addHeaders({Referer: baseurl + 'en/sirius-login/'})); 
	try{
		var json = getJson(html);
	}
	catch(e){}
	
	if(!json || !json.Success || !json.SiriusUser){
        /*var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);*/
        throw new AnyBalance.Error('Cant login to sirius personal account. Site changed?');
    }
	
    var result = {success: true};
    getParam(json.SiriusUser.TierLevel, result, 'level', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(json.SiriusUser.FullName, result, 'fio', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(json.SiriusUser.PointsBalance+'', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.SiriusUser.TierPoints+'', result, 'tier_balance', null, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}