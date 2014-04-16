/**
AnyBalance Provider (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru,en;q=0.8',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36'
};

function main(){

    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://www.powervoip.com/";

    AnyBalance.setDefaultCharset('utf-8'); 
	
    var html = AnyBalance.requestGet(baseurl + 'en/login', g_headers);
	
    var form = getParam(html, null, null, /<form[^>]*action="https:\/\/www.powervoip.com([\s\S]*?)<\/form>/i);    
    if(!form)
        throw new AnyBalance.Error('Can`t find login form, is the site changed?');
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'login[username]') 
			return prefs.login;
		else if (name == 'login[password]')
			return prefs.password;

		return value;
	});
	// т.к. генерируется 20 форм чтобы запутать нас, мы возьмем нужные данные из скрипта
	// т.к. генерируется 20 форм чтобы запутать нас, мы возьмем нужные данные из скрипта
    var matches = /<input type="hidden"[^>]+name="([^"]+)" value="([^"]+)"\s*\/>\s*<\/div>\s*<\/div>/i.exec(html);
    if(!matches)
        throw new AnyBalance.Error("Can`t find session id!");

	params[matches[1]] = matches[2];
	
   	if(/Security code/i.test(html)) {
		var captchaa;
		if(AnyBalance.getLevel() >= 7) {
			AnyBalance.trace('Trying to enter the captcha code.');
			
			var mcid = AnyBalance.requestGet(baseurl + 'captcha/reload_captcha', addHeaders({
				'X-Requested-With':'XMLHttpRequest',
				'Referer':baseurl + 'login'
			}));
			
			var captcha = AnyBalance.requestGet(baseurl + 'captcha?numchars=6&mcid='+mcid, addHeaders({
				'X-Requested-With':'XMLHttpRequest',
				'Referer':baseurl + 'login'
			}));
			captchaa = AnyBalance.retrieveCode("Please, enter the code.", captcha);
			AnyBalance.trace('Got code: ' + captchaa);
		} else {
			throw new AnyBalance.Error('You need AnyBalance API v7+ installed, update the application please.');
		}
		params["login[usercode]"] = captchaa;
		params["login[mcid]"] = mcid;
	}
	
    html = AnyBalance.requestPost(baseurl + 'en/login', params, addHeaders({Referer: baseurl+'en/login'})); 
	
    if(!/\/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="notification error png_bg"[^>]*>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Can`t login, unknown error. Contact the developers, please.');
    }
	
    var result = {success: true};
	
    getParam(html, result, 'balance', /Your credit[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['currency', 'balance'], /Your credit[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, [replaceTagsAndSpaces, /&euro;/i, '€'], parseMyCurrency);
    getParam(html, result, 'freedays', /Freedays:(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'notifications', /(\d+)\s*Notifications/i, replaceFloat, parseFloat);

    AnyBalance.setResult(result);	
}

function parseMyCurrency(text){
    var val = getParam(html_entity_decode(text), null, null, null, [/\s+/g, '', /[\d\.,\-]/g, '']);
    AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
    return val;
}