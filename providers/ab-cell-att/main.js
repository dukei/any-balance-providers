/**
Provider AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'application/json, text/plain, */*',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.93 Safari/537.36',
	'Origin': 'https://m.att.com',
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
	AnyBalance.setDefaultCharset('utf-8');
    var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://m.att.com/';
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'myatt/#/accountOverview', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var params = {
		useridVisible: prefs.login,
		userid: prefs.login,
		password: prefs.password,
		persist: 'y',
		logoutcookiename:''
	};
	
	html = AnyBalance.requestPost(baseurl + 'myatt/TGProxy', JSON.stringify(params), addHeaders({Referer: baseurl + 'myatt/'}));
	
    if(!/isAuthenticated=true/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Unable to access personal account. Site has been changed?');
	}
	
	params = {"CommonData":{"AppName":"MYATT"},"PrefetchAccountInfo":"true","UserId":prefs.login};
	
	html = AnyBalance.requestPost(baseurl + 'best/resources/auth/login/accountdetails/invoke', JSON.stringify(params), addHeaders({
		Referer: baseurl + 'myatt',
		'X-Requested-By': 'MYATT',
		'UserId': prefs.login,
		'Cache-Control': 'no-cache=set-cookie',
		'Pragma': 'no-cache',
		'Expires': '-1',
	}));

    var result = {success: true};
	
    // getParam(findTagWithClass(html,'div','plan-name'), result, 'planName', /^.*$/, replaceTagsAndSpaces, html_entity_decode);
    // getParam(findTagWithClass(html,'p','sup'), result, 'balance', /^.*$/, replaceTagsAndSpaces, parseBalance);
    // getParam(html, result, 'expires', /Expires on (\S+\s+\d+)/, replaceTagsAndSpaces, parseDate);
    // getParam(html, result, 'minPerMonth', /<strong>\d+ of (\d+) minutes<\/strong>/i, replaceTagsAndSpaces, parseBalance);
    // getParam(html, result, 'minAvailable', /<strong>(\d+) of \d+ minutes<\/strong>/i, replaceTagsAndSpaces, parseBalance);
    // getParam(html, result, 'till', /Plan\s+Renews\s+On\s+<p[^>]*>\s*(\S+\s\d+)\D.{30}/, replaceTagsAndSpaces, parseDate);

    // getParam(html, result, 'smsPerMonth', /<strong>\d+ of (\d+) messages<\/strong>/i, replaceTagsAndSpaces, parseBalance);
    // getParam(html, result, 'smsAvailable', /<strong>(\d+) of \d+ messages<\/strong>/i, replaceTagsAndSpaces, parseBalance);
    // getParam(html, result, 'trafficPerMonth', /<strong>[.\d]+ MB\s+of\s+([.\d]+ MB)\s*<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
    // getParam(html, result, 'trafficAvaliable', /<strong>([.\d]+ MB)\s+of\s+[.\d]+ MB\s*<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);

    // getParam(html, result, 'status', /Plan Status\s*:[\s\S]*?<var[^>]*>([\s\S]*?)<\/var>/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}
