/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для киевского Наш Net

Operator site: http://nashnet.ua
Личный кабинет: https://billing.nashnet.ua
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function myParseTrafficGb(str){
    return parseTrafficGb(str, 'bytes');
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://billing.nashnet.ua/";
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl + 'index.php', {
	login:prefs.login,
	password:prefs.password,
	'imageField.x':15,
	'imageField.y':7
    }, addHeaders({Referer: baseurl})); 

    if(!/act=logout/i.test(html)){
        var error = getParam(html, null, null, /<p[^>]+color:\s*#FF0000[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    //Раз мы здесь, то мы успешно вошли в кабинет
    //Получаем все счетчики
    var result = {success: true};
    getParam(html, result, 'licschet', /Лицевой счет([\s\S]*?)(?:\)|<\/)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Текущий депозит:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

    html = AnyBalance.requestGet(baseurl + 'index.php?mod=profile', g_headers);
    getParam(html, result, 'fio', /ФИО:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Текущий тарифный пакет:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'abon', /<td[^>]+class="head"[^>]*>Тарифный пакет[\s\S]*?Абонплата:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        html = AnyBalance.requestGet(baseurl + 'index.php?mod=traffic', g_headers);
        getParam(html, result, 'trafficIn', /Итого:(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, myParseTrafficGb);
        getParam(html, result, 'trafficOut', /Итого:(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, myParseTrafficGb);
    }

    //Возвращаем результат
    AnyBalance.setResult(result);
}
