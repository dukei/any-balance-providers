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
    var baseurl = 'https://bill.naverex.net/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl, g_headers);

	html = AnyBalance.requestPost(baseurl, {
        username:prefs.login,
        password:prefs.password,
        logined:'вхід'
    }, addHeaders({Referer: baseurl})); 

    if(!/logout/i.test(html)){
        var error = getParam(html, null, null, /Вхід для користувачів[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    var result = {success: true};
	getParam(html, result, 'balance', /Депозит([\s\S]*?)грн/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'credit', /Кредит[\s\S]*?<span>([^<]*)/i, null, parseBalance);
	getParam(html, result, 'bonus', /Бонус[\s\S]*?<span>([^<]*)/i, null, parseBalance);
	getParam(html, result, 'sum_pay', /Сумма оплат([^<]*)/i, null, parseBalance);
	getParam(html, result, 'fio', /ПІБ[\s\S]*?<span>([^<]*)/i, null, html_entity_decode);
    getParam(html, result, 'dogovor', /Договір[\s\S]*?<span>([^<]*)/i, null, html_entity_decode);
	
	html = AnyBalance.requestGet(baseurl+'personal/services', g_headers);
	getParam(html, result, '__tariff', /Тарифний план(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, null, html_entity_decode);

    AnyBalance.setResult(result);
}