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
    var baseurl = "https://www.vodafone.com.eg/";
    var baseurl1 = "http://www.vodafone.com.eg/";
    AnyBalance.setDefaultCharset('utf-8'); 
	
    var html = AnyBalance.requestGet('https://www.vodafone.com.eg/vodafoneportalWeb/en/myvodafone_login?pageCode=viewBill&&lang=en', g_headers);
	
    if(!prefs.__dbg){
        html = AnyBalance.requestPost(baseurl + 'My010App/servlets/LoginManager?userLang=en', {
            redirectToUrl:baseurl + 'vodafoneportalWeb/en/preMyBalance_Page',
            pageCodeName:'',
            pageCode:'',
            RBT_Code:'',
            RBT_ID:'',
            RBT_G:'',
            RBT_Page_Code:'',
            allQueryParams:'?redirectTo=http%3A%2F%2Fwww.vodafone.com.eg%2FvodafoneportalWeb%2Fen%2FpreMyBalance_Page',
            protocol_login:'https:',
            mobile:prefs.login,
            password:prefs.password,
            url:''
        }, addHeaders({Referer: baseurl})); 
		
		var scriptRedirect = getParam(html, null, null, /window\.open\('([^'"]+)/i);
		
		html = AnyBalance.requestGet(scriptRedirect, g_headers);
		
		html = AnyBalance.requestGet(baseurl1 + '/My010App/SessionDispatcher.jsp?pageCode=myVodafone_Revamp&lang=en&_nfpb=true&_pageLabel=myVodafonePreMain_Page&lang=en&userType=MyVodafonePre', g_headers);
		
		
		
		//html = AnyBalance.requestGet('http://www.vodafone.com.eg/My010App/ucm/LoginLogoutModulePortal.jsp?lang=en', g_headers);
		
		// var res = scriptRedirect.split("?");
		// var iframeId = getParam(html, null, null, /"iframeId"[^>]*src="([^"]+)/i);
		// var url = iframeId + '?' + res[1]; 
		
		// try {
			// html = AnyBalance.requestGet(url, g_headers);
		// } catch(e) {
			// html = AnyBalance.requestGet(url.replace(/http:/, 'https:'), g_headers);
		// }
		
		if(!/Logout|Welcome/i.test(html)){
            throw new AnyBalance.Error('Could not enter personal account. Have you entered correct login and password?');
        }
    }

    // html = AnyBalance.requestGet(baseurl1 + 'My010App/pre_paid/services/ResultB.jsp?lang=en&_nfpb=true&_pageLabel=preMyBalance_Page&lang=en', g_headers);

    var result = {success: true};

    getParam(html, result, 'balance', [/>\s*Current (?:Credit|Balance)(?:[^>]*>){2}([\s\S]*?)<\//i, /My Balance(?:[^>]*>){2}([\s\S]*?)<\//i], replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'phone', [/Data Line Number:(?:[^>]*>){2}\s*([\d+-]+)/i, /Mobile Number:(?:[^>]*>){2}([\s\S]*?)<\//i], replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', [/Data Plan:(?:[^>]*>){2}([\s\S]*?)<\//i, /Rate Plan:(?:[^>]*>){2}([\s\S]*?)<\//i], replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /<h\d[^>]*>[^<]+Welcome([\s\S]*?)<\/h\d[^>]*>/i, replaceTagsAndSpaces, function(str){ return html_entity_decode(str) || undefined } );
    getParam(html, result, 'accnum', /Account Number(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	var usedTraf = getParam(html, result, 'traf_used', />\s*Consumed(?:[^>]*>){3}([\s\d.,GMKB]+)/i, replaceTagsAndSpaces, parseTraffic);
	var leftTraf = getParam(html, result, 'traf_left', />\s*Remaining(?:[^>]*>){3}([\s\d.,GMKB]+)/i, replaceTagsAndSpaces, parseTraffic);
	
	if(isset(usedTraf) && isset(leftTraf)) {
		getParam(usedTraf + leftTraf, result, 'traf_total');
	}
	
	
	

    AnyBalance.setResult(result);
}