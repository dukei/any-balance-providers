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
    var baseurl = 'https://vpsnow.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

    /*var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

    var tform = getParam(html, null, null, /<input[^>]+name="t:formdata"[^>]*value="([^"]*)/i, null, html_entity_decode);
    if(!tform) //Если параметр не найден, то это, скорее всего, свидетельствует об изменении сайта или о проблемах с ним
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	*/
	var html = AnyBalance.requestPost(baseurl + 'client/dologin.php', {
        username:prefs.login,
        password:prefs.password,
    }, addHeaders({Referer: baseurl + 'login'})); 

    if(!/\/Logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'total', /Всего к оплате([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cred', /Кредитный баланс([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'currency', /Кредитный баланс([\s\S]*?)<\//i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'uslugi', /Кол-во продуктов\/услуг([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'tikets', /Открытых тикетов([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'scheta', /Счетов к оплате([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
	html = AnyBalance.requestGet(baseurl + 'client/clientarea.php?action=products', g_headers);
	var tr = getParam(html, null, null, /(<tr class="clientareatableactive">[\s\S]*?<\/tr>)/i, null, null);
	if(!tr)
		AnyBalance.trace('Не нашли ни одного сервера, проверьте, есть ли они у Вас? :)');
		
	getParam(tr, result, 'serv', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'serv_pay', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'serv_till', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)</i, replaceTagsAndSpaces, parseDate);
	
    AnyBalance.setResult(result);
}