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
    var baseurl = "http://stat.m2c.ru/";
    AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestPost(baseurl + 'auth.php', {
        login:prefs.login,
        pass:prefs.password,
    }, g_headers); 

    if(!/action=logout/i.test(html)){
        var error = getParam(html, null, null, /alt="error"[\s\S]*?>\s*([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'fio', /<div id="topbal"><h3>([\s\S]*?)<\/h3>/i, null, html_entity_decode);
	getParam(html, result, 'acc_num', /Лицевой счет:[\s\S]*?(\d+)/i, null, html_entity_decode);
	getParam(html, result, 'balance', /Баланс:([\s\S]*?)р/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'messages', /Сообщения[\s\S]*?(\d+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Текущий тарифный план[\s\S]*?<div align='center'>\s*([\s\S]*?)\s*<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'abon', /Абонентская плата[\s\S]*?<div class='money'>\s*([\s\S]*?)\s*<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'traf', /Объем входящего трафика[\s\S]*?<div([\s\S]*?)\s*<\/div>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}