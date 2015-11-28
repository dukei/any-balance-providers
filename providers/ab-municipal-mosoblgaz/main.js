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
    var baseurl = 'http://lkk.mosoblgaz.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'PersonalCabinetSUPG.aspx', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		AnyBalance.trace('Processing form field ' + name + ': ' + value);
		if (/\$UserAccount/i.test(name)) 
			return prefs.login;
		else if (/\$Password/i.test(name))
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
		}  */

		return value;
	}, true); //Важен порядок параметров
	
	html = AnyBalance.requestPost(baseurl + 'LoginPersonalSUPG.aspx?ReturnUrl=%2fLoginPersonalSUPG.aspx%3fout%3d1', params, addHeaders({Referer: baseurl + 'LoginPersonalSUPG.aspx'})); 
	
    if(!/LoginPersonalSUPG.aspx\?out=1/i.test(html)){
        var error = getParam(html, null, null, /ctl00_ChildContent_CustomCaptchaValidator[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        error = getParam(html, null, null, /ctl00_ChildContent_AccountCustomValidator[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /пароль неверный/i.test(error));
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
    var result = {success: true};
    getParam(html, result, 'licschet', /<span[^>]+lblCurrentAccount[^>]*>([\s\S]*?)<\/span>/i, [replaceTagsAndSpaces, /№/, ''], html_entity_decode);

    getParam(html, result, 'balance', /по лицевому счету при показаниях.*?составляет\s*<strong[^>]*>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'acc', /<span[^>]+lblCurrentAccount[^>]*>([\s\S]*?)<\/span>/i, [replaceTagsAndSpaces, /№/, ''], html_entity_decode);
	getParam(html, result, 'fio', /<input[^>]+id="fioInputs"[^>]*value="([^"]*)/i, null, html_entity_decode);

	getParam(html, result, 'next_check', /очередной срок поверки([^<]*)/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'last_counter_val', /по лицевому счету при показаниях\s*<strong[^>]*>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'last_counter_date', /Показания от([^<\-]*)/i, replaceTagsAndSpaces, parseDate);

	if(isAvailable('__tariff')){
		html = AnyBalance.requestGet(baseurl + 'DevicesSUPG.aspx', g_headers);
		getParam(html, result, '__tariff', /<span[^>]+current-counter[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

	}

	if(isAvailable('income', 'nachisl', 'recomended', 'balance')){
		html = AnyBalance.requestGet(baseurl + 'PersonalCalculationsSUPG.aspx', g_headers);
		var tbl = getElement(html, /<table[^>]+history-table[^>]*>/i);
		if(tbl){
			getParam(html, result, 'income',  /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'nachisl',  /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'recomended', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'balance', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		}else{
			AnyBalance.trace('Не удаётся найти таблицу расчетов: ' + html);
		}
	}

    AnyBalance.setResult(result);
}