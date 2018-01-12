/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для московского интернет-провайдера ЭНЛАИН

Сайт оператора: http://www.nline.ru
Личный кабинет: https://www.nline.ru/cabineti
*/


var g_headers = {
    'Accept':           'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
    'Accept-Language':  'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://billing.nline.ru/";

    var html = AnyBalance.requestPost(baseurl + 'index.cgi', {
        user:   '005' + prefs.login,
        passwd: prefs.password
    });

    if(!/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*?role='alert'[^>]*>(?:[\s\S]*?)<\/h4>([^<]*)</, replaceTagsAndSpaces);
        if(error) {
            throw new AnyBalance.Error(error, null, /парол/i.test(error));
        }

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance',   /депозит(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet',  prefs.login);
    getParam(html, result, 'agreement', /Договор(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'fio',       /ФИО(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff',  /<div[^>]*>Тарифный план(?:[\s\S]*?)<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);

    /*getParam(html, result, 'traffic', /Общий трафик:[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);*/
    
    AnyBalance.setResult(result);
}