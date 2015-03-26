/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "http://my190.vodafone.it/";
    AnyBalance.setDefaultCharset('ISO-8859-1'); 

	var html = AnyBalance.requestGet(baseurl + '190mobile/endpoint/Mobile5_restyle/home_mio190.php', g_headers);

	html = AnyBalance.requestPost(baseurl + '190mobile/endpoint/Mobile5_restyle/home_mio190.php', {
		user: prefs.login,
		pass: prefs.password,
	}, addHeaders({Referer: baseurl + '190mobile/endpoint/Mobile5_restyle/home_mio190.php'}));
	
    if(!/logout.php/i.test(html)){
        var error = getParam(html, null, null, [/<div[^>]+class="msgError"[^>]*>([\s\S]*?)<\/div>/i, /class="error[^>]*>([^<]+)/i], replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /username e password siano inseriti correttamente/i.test(error));
		
        throw new AnyBalance.Error('Could not enter personal account. Is the site changed?');
    }

    if(prefs.phone)
    	html = AnyBalance.requestGet(baseurl + '190mobile/endpoint/Mobile5_restyle/swap_sim.php?msisdn_swap=' + prefs.phone, g_headers);
	
    var result = {success: true};
	
    getParam(html, result, 'phone', /<\/header(?:[^>]*>){9}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /<\/header(?:[^>]*>){6}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Credito Residuo(?:[^>]*>){6}([-\s\d.,]+)/i, replaceTagsAndSpaces, parseBalance);
	
	/*var data = getParam(html, null, null, /([^"]*)"(?:[^"]*"){3}Credito Residuo"/i);
	
	html = AnyBalance.requestPost(baseurl + '190mobile/endpoint/Mobile5_restyle/get_ext_widget.php', {
		'data': data
	} , g_headers);
	
	var json = getJson(html);
	if(json.response == 'correct') {
		getParam(json.result.tariffplan + '', result, '__tariff');
		getParam(json.result.credit + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	}*/
	
    AnyBalance.setResult(result);
}
