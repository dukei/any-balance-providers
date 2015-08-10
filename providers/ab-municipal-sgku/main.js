/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для оператора  https://sgku.ru

Operator site: https://sgku.ru
Личный кабинет: https://sgku.ru
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
    var baseurl = "https://sgku.ru/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html;
    if(prefs.locality == 'Сургут'){
        html = AnyBalance.requestGet(baseurl + 'accounts?locality=' + encodeURIComponent(prefs.locality) + '&street=' + encodeURIComponent(prefs.street) + '&house=' + prefs.house + '&flat=' + prefs.flat, addHeaders({Referer: baseurl})); 
    }else{
        html = AnyBalance.requestGet(baseurl + 'accounts?locality=' + encodeURIComponent(prefs.locality) + '&account=' + encodeURIComponent(prefs.account), addHeaders({Referer: baseurl})); 
    }

    //После входа обязательно проверяем маркер успешного входа
    //Обычно это ссылка на выход, хотя иногда приходится искать что-то ещё
    if(!/Лицевой счёт:/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /<div class="wrap">\s*<p[^>]+class="error"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось получить информацию. Сайт изменен?');
    }

    //Раз мы здесь, то мы успешно вошли в кабинет
    //Получаем все счетчики
    var result = {success: true};
    getParam(html, result, 'address', /<div[^>]+class="row content"[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<div[^>]+class="row content"[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /Лицевой счёт:\s*<strong[^>]*>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);

    var kaprem = getParam(html, null, null, /Капитальный ремонт([\s\S]*?На дату:[^<]*)<\/div>/i);
    if(kaprem){
        getParam(kaprem, result, 'balance_kaprem', /(?:Переплата|Долг|Задолженность):\s*<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(kaprem, result, 'peni_kaprem', /Пени:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
        getParam(kaprem, result, 'date_kaprem', /На дату:([^<]*)/i, replaceTagsAndSpaces, parseDate);
    }
    
    var kvpl = getParam(html, null, null, /Квартплата([\s\S]*?На дату:[^<]*)<\/div>/i);
    if(kvpl){
        getParam(kvpl, result, 'balance', /(?:Переплата|Долг|Задолженность):\s*<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(kvpl, result, 'peni', /Пени:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
        getParam(kvpl, result, 'date', /На дату:([^<]*)/i, replaceTagsAndSpaces, parseDate);
    }

    //Возвращаем результат
    AnyBalance.setResult(result);
}
