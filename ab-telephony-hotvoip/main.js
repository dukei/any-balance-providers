/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'Origin':'https://www.hotvoip.com',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');    

    var baseurl = 'https://www.hotvoip.com/';
    
    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
    var matches = /data:\s*[^<]*update_id=&([0-9a-f]{32})=([0-9a-f]{32})/i.exec(html);
    if(!matches)
        throw new AnyBalance.Error("Не удаётся найти идентификатор сессии! Свяжитесь с автором провайдера.");

    var params = {
		'login[username]':prefs.login,
		'login[password]':prefs.password,
        page_referrer: 'login'
    };
    params[matches[1]] = matches[2];

    //var info = AnyBalance.requestPost(baseurl + "login", params);
	var info = AnyBalance.requestPost(baseurl + 'login', params, addHeaders({Referer: baseurl + 'login'})); 
	
    var error = getParam(info, null, null, /<div class="row_error_message error">([\s\S]*?)<\/div>/i, [/<.*?>/g, '', /^\s*|\s*$/g, '']);
    if(error)
        throw new AnyBalance.Error(error);

    error = getParam(info, null, null, /(service is temporarily unavailable)/i);
    if(error){
        //Какой-то глюк с 503 ошибкой, а баланс вроде бы выдаётся по другому адресу.
        info = AnyBalance.requestGet(baseurl + "buy_credit2/");
    }

    error = getParam(info, null, null, /(service is temporarily unavailable)/i);
    if(error) //Попытка не помогла, возвращаем ошибку
        throw new AnyBalance.Error("К сожалению, сайт временно недоступен. Попробуйте позднее."); 
     
    var result = {
        success: true
    };

    var matches;

    getParam(info, result, 'balance', /Your credit:[\s\S]*?<span[^>]*>[^<]*?(-?\d[\d\s\.,]*)/i, replaceFloat, parseFloat);
    getParam(info, result, 'freedays', /Freedays:[\s\S]*?<span[^>]*>(\d+)/i, replaceFloat, parseFloat);
    getParam(info, result, 'autorecharge', /Automatic recharge:([\s\S]*?)</i, replaceTagsAndSpaces);
    getParam(info, result, 'notifications', /(\d+)\s*Notifications/i, replaceFloat, parseFloat);

    result.__tariff = prefs.login;
		
    AnyBalance.setResult(result);
}