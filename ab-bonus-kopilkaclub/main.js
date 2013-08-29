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
    var baseurl = 'http://www.kopilkaclub.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestGet(baseurl + 'FullAutorize.aspx');
    var params = createFormParams(html);

	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet(baseurl+ 'CodeHandler.ashx');
        params.ctl00$ContentPlaceHolder1$FullAutorize2$TextBox1 = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
        AnyBalance.trace('Капча получена: ' + params.ctl00$ContentPlaceHolder1$FullAutorize2$TextBox1);
	}
	else
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');

	params.ctl00$ContentPlaceHolder1$FullAutorize2$Login_n = prefs.login;
	params.ctl00$ContentPlaceHolder1$FullAutorize2$Pass_n = prefs.password;

	html = AnyBalance.requestPost(baseurl + 'FullAutorize.aspx', params);	
	
    if(!/Входящие сообщения/i.test(html)){
        var error = getParam(html, null, null, /"ctl00_ContentPlaceHolder1_Label2">([\s\S]*?)<\/span/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    var result = {success: true};
    getParam(html, result, 'balance', /Сумма доступных(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}