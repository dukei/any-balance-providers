/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'*/*',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){

    var categories = ['01', '34', '02', '03', '06', '07', '05', '17', '85', '87', '08', '12'],
        iter,
        preg,
        prefs = AnyBalance.getPreferences(),
        baseurl = "http://xn--b1apfm1b.xn--p1ai/";

    AnyBalance.setDefaultCharset('utf-8'); 

	checkEmpty(prefs.login, 'Введите логин без пробелов и разделителей!');
	var number = prefs.login.replace(/([\d]{3})([\d]{3})([\d]{2})([\d]{3})([\d]{1})([\d]{2})/i, "$1-$2-$3-$4-$5-$6"); 
	
	var html = AnyBalance.requestGet(baseurl + 'component/private', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
    var html = AnyBalance.requestPost(baseurl + 'component/private/?task=login', {
        accountNumber: number
    }, addHeaders({Referer: baseurl + 'index.php?option=com_private', 'X-Requested-With':'XMLHttpRequest'})); 

    if(!/СПРАВКА/i.test(html)){
        var error = getParam(html, null, null, /<dd[^>]+class="message message"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
	html = AnyBalance.requestGet(baseurl + 'component/private/?task=help', g_headers);
	
    var result = {success: true};

    for (var i = 0; i < categories.length; i++) {
        preg = new RegExp('<table[^>]+class="bottom_border"[^>]*>[\\s\\S]*?<td[^>]*>' + categories[i] + '<\/td>', "i");

        if (preg.test(html)) {
            preg = new RegExp('<table[^>]+class="bottom_border"[^>]*>[\\s\\S]*?<td[^>]*>' + categories[i] + '<\/td>(?:[\\s\\S]*?<td[^>]*>){8}([\\s\\S]*?)<\/td>', "i");
            getParam(html, result, 'balance' + categories[i], preg, replaceTagsAndSpaces, parseBalance);
        }
    }

    getParam(html, result, 'balance', /<td[^>]*>Итого:<\/td>(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(number, result, '__tariff', null, null, null);

    AnyBalance.setResult(result);
}
