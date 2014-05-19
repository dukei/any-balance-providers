/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.72 Safari/537.36',
	'Origin':'https://1.elecsnet.ru'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://1.elecsnet.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'NotebookFront/Default.aspx', g_headers);

	var params = createFormParams(html, function(params, str, name, value){
		if(name == 'ctl00$MainLogin2$UserName')
			return prefs.login;
		else if(name == 'ctl00$MainLogin2$Password')
			return prefs.password;
        return value;
    });
	html = AnyBalance.requestPost(baseurl + 'NotebookFront/Default.aspx', params, addHeaders({Referer: baseurl+'NotebookFront/Default.aspx'})); 

	if (!/ExitButton/i.test(html)) {
		var error = getParam(html, null, null, /"ctl00_MainLogin2_Password"(?:[^>]*>){3}([\s\S]*?)<div/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неправильно введены учетные данные/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};
	
    getParam(html, result, 'balance', /Остаток на кошельке:[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(prefs.login, result, 'phone');
	
    AnyBalance.setResult(result);
}