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
    var baseurl = 'http://999.md/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
    var html = AnyBalance.requestGet('http://simpalsid.com/login?login='+encodeURIComponent(prefs.login)+'&password='+encodeURIComponent(prefs.password)+'&remember=1&_='+ new Date().getTime(), g_headers);

	html = AnyBalance.requestGet('http://simpalsid.com/config?callback=_jqjsp&_'+ new Date().getTime(), g_headers);
	var token = getParam(html, null, null, /token":\s*"([^"]*)/i);
	if(!token)
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	
	html = AnyBalance.requestGet('http://simpalsid.com/wallet/cash?token='+token, g_headers);
	
	var json = getJson(html);
	
    var result = {success: true};
	result.balance = json.response.cash;
    //getParam(json.response.cash+'', result, 'balance', /([\s\S]*)/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}