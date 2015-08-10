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
    var baseurl = 'https://stat.forceline.net/';
    AnyBalance.setDefaultCharset('windows-1251'); 

    var html = AnyBalance.requestPost(baseurl + 'index.php', {
        l:prefs.login,
	p:prefs.password
    }, addHeaders({Referer: baseurl + 'index.php'})); 

    if(!/logout.php/i.test(html)){
        var error = getParam(html, null, null, /alert\('([\s\S]*?)'\);/i, replaceSlashes, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    //Раз мы здесь, то мы успешно вошли в кабинет
    //Получаем все счетчики
    var result = {success: true};
    getParam(html, result, 'fio', /(?:Добро пожаловать,|Уважаемый\(ая\))([^<,!]*)/i, replaceTagsAndSpaces, html_entity_decode);

    html = AnyBalance.requestGet(baseurl + 'wrapper.php?cclass_id=12', g_headers);

    getParam(html, result, '__tariff', /Текущий тариф([\s\S]*?)(?:<\/a>|,)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'traffic', /Объем использованного трафика:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseTrafficGb);
    getParam(html, result, 'promise', /Сумма обещанных платежей:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance', /Баланс счета услуги "Интернет":([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /Состояние услуги:[\s\S]*?<font[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'id', /Ваш персональный ID[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);


    AnyBalance.setResult(result);
}
