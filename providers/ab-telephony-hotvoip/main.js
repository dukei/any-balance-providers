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

function getDecValue(e,t){return GibberishAES.dec(e,t)}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');    

    var baseurl = 'https://www.hotvoip.com/';
    
    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
    var formid = getParam(html, /getDecValue\s*\([^)]*\)/, [/^/, 'return '], safeEval);
    AnyBalance.trace('Active form id: ' + formid);
    if(!formid){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error("Не удаётся найти идентификатор сессии! Свяжитесь с автором провайдера.");
    }
    	
    var form = getElementById(html, formid);
	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (/username/i.test(name)) {
			return prefs.login;
		} else if (/password/i.test(name)) {
			return prefs.password;
		} else if(/usercode/i.test(name)){
			AnyBalance.trace('Потребовалась капча');
			var imgurl = joinUrl(baseurl, getParam(form, /<img[^>]+captcha_img[^>]*src="([^"]*)/i, replaceHtmlEntities));
			var img = AnyBalance.requestGet(imgurl, addHeaders({Referer: baseurl}));
			return AnyBalance.retrieveCode('Please enter security code', img);
		}

		return value;
	});

	var info = AnyBalance.requestPost(baseurl + 'login', params, addHeaders({Referer: baseurl + 'login'})); 
    if(/(service is temporarily unavailable)/i.test(info)){
        //Какой-то глюк с 503 ошибкой, а баланс вроде бы выдаётся по другому адресу.
        info = AnyBalance.requestGet(baseurl + "buy_credit2/");
    }

	if(!/logout/i.test(info)){
        var error = getElement(info, /<div[^>]+error/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /username|password/i.test(error));
        
        error = getParam(info, /(service is temporarily unavailable)/i);
        if(error) //Попытка не помогла, возвращаем ошибку
            throw new AnyBalance.Error("К сожалению, сайт временно недоступен. Попробуйте позднее."); 

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сan not login. Is the site changed?');
    }
     
    var result = {
        success: true
    };

    var matches;

    getParam(info, result, 'balance', /Your credit:[\s\S]*?<span[^>]*>[^<]*?(-?\d[\d\s\.,]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, 'freedays', /Freedays:[\s\S]*?<span[^>]*>(\d+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, 'autorecharge', /Automatic recharge:([\s\S]*?)</i, replaceTagsAndSpaces);
    getParam(info, result, 'notifications', /(\d+)\s*Notification/i, replaceTagsAndSpaces, parseBalance);

    result.__tariff = prefs.login;
		
    AnyBalance.setResult(result);
}