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
    var baseurl = 'http://lksaupg.mosoblgaz.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'LoginPersonalSUPG.aspx?ReturnUrl=%2fPersonalCabinetSUPG.aspx', g_headers);
	
    var params = createFormParams(html);
	var captcha_href = getParam(html, null, null, /(CaptchaImage.axd[^"]*)/i);
	
	
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		AnyBalance.setOptions({forceCharset:'base64'});
		var captcha = AnyBalance.requestGet(baseurl+ captcha_href);
		params['ctl00$ChildContent$Captcha'] = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
        AnyBalance.trace('Капча получена: ' + params['ctl00$ChildContent$Captcha']);
		AnyBalance.setOptions({forceCharset:'utf-8'});
	}
	else
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	
	params.ctl00$ChildContent$UserAccount = prefs.login;
	params.ctl00$ChildContent$Password = prefs.password;
	
	html = AnyBalance.requestPost(baseurl + 'LoginPersonalSUPG.aspx?ReturnUrl=%2fPersonalCabinetSUPG.aspx', params, addHeaders({Referer: baseurl + 'LoginPersonalSUPG.aspx?ReturnUrl=%2fPersonalCabinetSUPG.aspx'})); 
	
    if(!/LoginPersonalSUPG.aspx\?out=1/i.test(html)){
        var error = getParam(html, null, null, /ctl00_ChildContent_CustomCaptchaValidator[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
    var result = {success: true};
    getParam(html, result, 'balance', /Баланс на(?:[\s\S]*?<span[^>]*>){1}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'acc', /ЛС\s*(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /Абонент:\s*([^,]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'income', /Поступления на счёт в текущем месяце(?:[\s\S]*?<span[^>]*>){1}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'nachisl', /Начисления текущего месяца(?:[\s\S]*?<span[^>]*>){1}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'recomended', /Рекомендуемая сумма к оплате(?:[\s\S]*?<span[^>]*>){1}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

	getParam(html, result, '__tariff', />Счетчик([^,]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'next_check', /очередной срок поверки([^<]*)/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'last_counter_val', /Последние показания(?:[\s\S]*?<p[^>]*>)([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'last_counter_date', /Последние показания(?:[\s\S]*?<p[^>]*>){2}([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseDate);

	if(!result.balance){
		html = AnyBalance.requestGet(baseurl + 'PersonalCalculationsSUPG.aspx', g_headers);
		getParam(html, result, 'balance', /Задолженность(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	}
    AnyBalance.setResult(result);
}