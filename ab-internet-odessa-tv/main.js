/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для интернет провайдера Одесская мультимедийная сеть

Operator site: http://odessa.tv
Личный кабинет: https://billing.odessa.tv
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
    var baseurl = "https://billing.odessa.tv/";
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl, {
	login:prefs.login,
	password:prefs.password,
	submit_:'Войти'
    }, addHeaders({Referer: baseurl})); 

    if(!/Выход/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /<tr[^>]+class='cell'[^>]*>([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    //Раз мы здесь, то мы успешно вошли в кабинет
    //Получаем все счетчики
    var result = {success: true};
    getParam(html, result, 'balance', /Баланс:\s*<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'till', /Оплата по:\s*<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseDateISO);
    getParam(html, result, 'daysleft', /Дней:\s*<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credit', /Кредит:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'fio', /([^<>]*)<br[^>]*>\s*Кредит:/i, replaceTagsAndSpaces, html_entity_decode);

    html = AnyBalance.requestGet(baseurl + 'main.php?page=services', g_headers);
    getParam(html, result, '__tariff', /<h3[^>]*>Услуги[\s\S]*?<tr[^>]+class='cell'(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
