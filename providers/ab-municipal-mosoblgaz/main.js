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
    var baseurl = 'https://lkk.mosoblgaz.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'auth/login', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		AnyBalance.trace('Processing form field ' + name + ': ' + value);
		if (/username/i.test(name)) 
			return prefs.login;
		else if (/password/i.test(name))
			return prefs.password;
/*		else if (/\$Captcha/i.test(name)){
			AnyBalance.trace('Пытаемся ввести капчу');
			AnyBalance.setOptions({forceCharset:'base64'});
			var captcha_href = getParam(html, null, null, /(CaptchaImage.axd[^"]*)/i);
			var captcha = AnyBalance.requestGet(baseurl+ captcha_href);
			var captchaVal = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
			    AnyBalance.trace('Капча получена: ' + captchaVal);
			AnyBalance.setOptions({forceCharset:'utf-8'});
			return captchaVal;                            
		}*/

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'login_check', params, addHeaders({Referer: baseurl + 'auth/login'})); 
	var json = getJson(html);
	
    if(!json.success){
    	var errors = [];
    	for(var i in json.errors){
    		errors.push(json.errors[i]);
    	}
        var error = errors.join(';\n');
        if(error)
            throw new AnyBalance.Error(error, null, /парол/i.test(error));
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl, g_headers);
	
    var result = {success: true};
    getParam(html, result, 'acc', /<span[^>]+account-chosen[^>]*>([\s\S]*?)<\/span>/i, [replaceTagsAndSpaces, /№/, '']);
	getParam(html, result, 'fio', /<ul[^>]+fioDrop[\s\S]*?<li[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces);
/*
	getParam(html, result, 'next_check', /очередной срок поверки([^<]*)/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'last_counter_val', /по лицевому счету при показаниях\s*<strong[^>]*>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'last_counter_date', /Показания от([^<\-]*)/i, replaceTagsAndSpaces, parseDate);

	if(isAvailable('__tariff')){
		html = AnyBalance.requestGet(baseurl + 'DevicesSUPG.aspx', g_headers);
		getParam(html, result, '__tariff', /<span[^>]+current-counter[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

	}
*/

	if(isAvailable(['income', 'nachisl', 'recomended', 'balance'])) {
		html = AnyBalance.requestGet(baseurl + 'balance', g_headers);

		AB.getParam(html, result, 'balance', 	/Баланс на[\s\S]*?<div[^>]+balance-value[^>]*>([\s\S]*?)<\/div>/i, 						   		AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(html, result, 'income',  	/ПОСТУПЛЕНИЯ НА СЧЕТ В ТЕКУЩЕМ МЕСЯЦЕ[\s\S]*?<div[^>]+balance-value[^>]*>([\s\S]*?)<\/div>/i, 	AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(html, result, 'nachisl', 	/НАЧИСЛЕНИЯ ТЕКУЩЕГО МЕСЯЦА[\s\S]*?<div[^>]+balance-value[^>]*>([\s\S]*?)<\/div>/i, 		 	AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(html, result, 'recomended', /РЕКОМЕНДУЕМАЯ СУММА К ОПЛАТЕ[\s\S]*?<div[^>]+balance-value[^>]*>([\s\S]*?)<\/div>/i, 			AB.replaceTagsAndSpaces, AB.parseBalance);
	}

    AnyBalance.setResult(result);
}