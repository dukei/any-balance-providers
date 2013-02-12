/**
AnyBalance Provider (http://any-balance-providers.googlecode.com)

Gets information from www.powervoip.com such as your credit, notifications count, automatic recharge status. 

Operator site:  https://www.powervoip.com/
Login form: https://www.powervoip.com/login
*/

function main(){

    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://www.powervoip.com/";

    AnyBalance.setDefaultCharset('utf-8'); 
    var html = AnyBalance.requestGet(baseurl + "login");
    var matches = /<input[^>]+name="([0-9a-f]{32})"[^>]*value="([0-9a-f]{32})"[^>]*>/i.exec(html);
    if(!matches)
        throw new AnyBalance.Error("Can`t find session id. Please, contact the provider author.");
    var params = {
	'login[username]':prefs.login,
	'login[password]':prefs.password
    };
    params[matches[1]] = matches[2];
    var info = AnyBalance.requestPost(baseurl + "login", params);
    
	if(!/\/Logout/i.test(info)){
        var error = getParam(info, null, null, /<div class="row_error_message error">([\s\S]*?)<\/div>/i, [/<.*?>/g, '', /^\s*|\s*$/g, '']);
        if(error)
            throw new AnyBalance.Error(error);

        throw new AnyBalance.Error('Cant login. Is the site changed?');
    }

	var result = {success: true};

    getParam(info, result, 'credit', /<span[^>]*class="balance"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'recharge',  /Automatic recharge:([\s\S]*?)</i, replaceTagsAndSpaces);
	getParam(info, result, 'notifications', /(\d+)\s*Notifications/i, replaceFloat, parseFloat);
    AnyBalance.setResult(result);
}
