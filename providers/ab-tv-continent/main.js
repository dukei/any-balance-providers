/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для провайдера спутникового телевидения КОНТИНЕНТ ТВ 

Operator site: http://www.continent-tv.ru/
Личный кабинет: http://my.orion-express.ru/
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
    var baseurl = "http://my.orion-express.ru/";

    if(prefs.num && !/^\d{4,}$/.test(prefs.num))
        throw new AnyBalance.Error('Укажите номер карты или оставьте поле пустым, чтобы получить информацию по первой карте.');

    AnyBalance.setDefaultCharset('windows-1251'); 

    var html = AnyBalance.requestPost(baseurl, {
	login:prefs.login,
	password:prefs.password,
	authorize:'Войти'
    }, addHeaders({Referer: baseurl})); 

    if(!/name="?logout"?/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /<b[^>]+style=["']?color:\s*#FF0000[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + '?cards', g_headers);
    var num = prefs.num || '\\d+';
    var table = getParam(html, null, null, /<table[^>]+class="?data_detail[^>]*>([\s\S]*?)<\/table>/i);
    if(!table)
        throw new AnyBalance.Error('Не удалось найти таблицу карт. Сайт изменен?');
    var re = new RegExp('<tr[^>]*>\s*<td[^>]*>\\s*\\d*' + num + '\\s*</td>[\\s\\S]*?</tr>', 'i');
    var row = getParam(table, null, null, re);
    if(!row)
        throw new AnyBalance.Error(prefs.num ? 'Не удалось найти карту с номером, оканчивающимся на ' + num : 'Не удалось найти ни одной карты');

    var result = {success: true};
    getParam(row, result, 'fio', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(row, result, 'num', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(row, result, 'sat', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(row, result, 'mtotal', /<a[^>]+href=['"]?\?messages&card[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);
    getParam(row, result, 'mnew', /<a[^>]+href=['"]?\?messages&read=2&card[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);
    
    var details = getParam(html, null, null, /<a[^>]+href=['"]?(\?detailedcard&details=[^"']*)/i, null, html_entity_decode);
    if(details){
        html = AnyBalance.requestGet(baseurl + details, g_headers);
        getParam(html, result, 'mlast', /Последнее сообщение по карте(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'balance', /Баланс карты(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, '__tariff', /Действующие услуги(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'till', /Действующие услуги(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    }

    //Возвращаем результат
    AnyBalance.setResult(result);
}
