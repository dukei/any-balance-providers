/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	'X-Requested-With':'XMLHttpRequest'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = 'https://www.eic-ee.com/';
    AnyBalance.setDefaultCharset('utf-8'); 

	var jsonReq = { Email:prefs.login, Password:prefs.password};
	var html = AnyBalance.requestPost(baseurl + 'Services/User.ashx/Auth', JSON.stringify(jsonReq), addHeaders({Referer: baseurl + 'Services/User.ashx/Auth'})); 
	var jsonResp = getJson(html);
	
    if(!/true/i.test(jsonResp.success)){
        var error = getParam(jsonResp.error, null, null, null, null, null);
        if(error)
            throw new AnyBalance.Error(error);

        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	html = AnyBalance.requestGet(baseurl+'my/');

    var result = {success: true};
	getParam(html, result, 'nontrade_balance', /Лицевой[\s\S]*?<span>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'nontrade_partnership', /Партнерский[\s\S]*?<span>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'invest_stable', /Стабильный[\s\S]*?<span>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'invest_speculate', /Спекулятивный[\s\S]*?<span>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'invest_agressive', /Агрессивный[\s\S]*?<span>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'name', /Добрый день[\s\S]*?>\s*([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
