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
    var baseurl = "https://www.shellsmart.com/smart/";
    AnyBalance.setDefaultCharset('windows-1251'); 
	
	var html = AnyBalance.requestGet(baseurl + 'index.html?site=ru-ru', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'cardnumber') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'login?site=ru-ru', params, addHeaders({Referer: baseurl + 'index.html'})); 

    if(!/user\/LogOut.html/i.test(html)){
        var error = AB.getElement(html, /<span[^>]+?class="[^"]*?errorMsgText/i, replaceTagsAndSpaces);
        error = error || AB.getElement(html, /<div[^>]+?id="system_message"/i, replaceTagsAndSpaces);
        if(error) {
            throw new AnyBalance.Error(error, false, /не\s+смогли\s+распознать|логин|парол/i.test(error));
        }
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    
    var result = {success: true, __tariff: prefs.login};
    getParam(html, result, 'balance', /mobile_point_amount[^>]*>(\d+)/i, replaceTagsAndSpaces, parseBalance);
    
    AnyBalance.setResult(result);
}
