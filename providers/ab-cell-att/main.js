/**
Provider AnyBalance (http://any-balance-providers.googlecode.com)

Obtains plan information on AT&T account

Operator site: http://www.att.com/
Personal site: https://www.paygonline.com/websc/home.html (mobile site)
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
'Content-Type':'application/x-www-form-urlencoded'
};

function findTagWithClass(sourceStr, tagName, className) {
    var re=new RegExp("(<"+tagName+"\\s+class=['\"]?[^'\"]*['\"\\s]"+className+"['\"\\s][^'\"]*['\"]?>)");
    var match = re.exec(sourceStr);
    if (match) {
        var endTagIndex=findMatchingEndTag(sourceStr, tagName, match.index);
        var info = sourceStr.substring(match.index, endTagIndex);
        return info;
    }
    return undefined;
}
function findMatchingEndTag(sourceStr, tagName, startIndex) {
    var searchTag='</'+tagName;
    var ind = sourceStr.indexOf(searchTag, startIndex);
    ind = sourceStr.indexOf(">", ind)+1;
    return ind;
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://www.paygonline.com/websc/logon.html";
    AnyBalance.setDefaultCharset('utf-8');
    
    AnyBalance.trace('Authorizing to '+baseurl+'...');
    if(prefs.__dbg){
        var html = AnyBalance.requestGet(baseurl, g_headers);
    }else{
        var html =  AnyBalance.requestPost(baseurl, "phoneNumber="+ prefs.login + "&password=" + prefs.password, g_headers);
    } 
    html = html.replace(/[\t\n\r]+/g,' ');
    if(!/Account Summary/i.test(html)){
        AnyBalance.trace('Failed ');
        var error = getParam(html, null, null, /(<section id="error".*)<section id="errorJavascript"/i, replaceTagsAndSpaces, html_entity_decode);
        if(error){
			AnyBalance.trace("Error: "+error);
            throw new AnyBalance.Error(error);
		}
        throw new AnyBalance.Error('Unable to access personal account. Site has been changed?');
    }
    var result = {success: true};
    getParam(findTagWithClass(html,'div','plan-name'), result, 'planName', /^.*$/, replaceTagsAndSpaces, html_entity_decode);
    getParam(findTagWithClass(html,'p','sup'), result, 'balance', /^.*$/, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'expires', /Expires on (\S+\s+\d+)/, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'minPerMonth', /<strong>\d+ of (\d+) minutes<\/strong>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'minAvailable', /<strong>(\d+) of \d+ minutes<\/strong>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'till', /Plan\s+Renews\s+On\s+<p[^>]*>\s*(\S+\s\d+)\D.{30}/, replaceTagsAndSpaces, parseDate);

    getParam(html, result, 'smsPerMonth', /<strong>\d+ of (\d+) messages<\/strong>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'smsAvailable', /<strong>(\d+) of \d+ messages<\/strong>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'trafficPerMonth', /<strong>[.\d]+ MB\s+of\s+([.\d]+ MB)\s*<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'trafficAvaliable', /<strong>([.\d]+ MB)\s+of\s+[.\d]+ MB\s*<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);

    getParam(html, result, 'status', /Plan Status\s*:[\s\S]*?<var[^>]*>([\s\S]*?)<\/var>/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}
