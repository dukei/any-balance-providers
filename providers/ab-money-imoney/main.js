/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию по картам iMoneyBank

Operator site: https://imoneybank.handybank.ru
Личный кабинет: http://www.imoneybank.ru/
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
    var baseurl = "https://imoneybank.handybank.ru/";
    AnyBalance.setDefaultCharset('windows-1251'); 

    if(prefs.num && !/^\d{4,}$/.test(prefs.num))
        throw new AnyBalance.Error('Введите 4 последние цифры карты или номера счета или не вводите ничего, чтобы получить информацию по первому счету');

    //Теперь, когда секретный параметр есть, можно попытаться войти
    var html = AnyBalance.requestPost(baseurl, {
        action:'auth',
        np:'',
        login:prefs.login,
        pass:prefs.password
    }, addHeaders({Referer: baseurl})); 

    if(!/\?action=exit/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /<div[^>]+class="error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    if(!/<li[^>]+class="accounts\s+selected/i.test(html)){
        AnyBalance.trace('Сейчас активна не страница карт. Переходим на неё...');
        html = AnyBalance.requestGet(baseurl + '?page=accounts', g_headers);
    }

    var pattern;
    if(!prefs.num || prefs.num.length <= 4){
        var num = prefs.num || '\\d{4}';
        pattern = '(?:\\d{4} [\\dX]{4} X{4} ' + num + '|\\d{16}' + num + ')';
    }else{
        //Сколько цифр осталось, чтобы дополнить до 20
        var accnum = prefs.num || '';
        var accprefix = accnum.length;
        accprefix = 20 - accprefix;
        pattern = (accprefix > 0 ? '\\d{' + accprefix + '}' : '') + accnum;
    }

    var trs = getParam(html, null, null, new RegExp('(<tr[^>]+class="account"(?:[\\s\\S](?!</table>))*?' + pattern + '[\\s\\S]*?)(?:<tr[^>]+class="account"|</table>)', 'i'));
    if(!trs)
        throw new AnyBalance.Error(prefs.num ? 'Не найдено счета или карты с последними цифрами ' + prefs.num + '!' : 'Не найдено ни одного счета!');

    getParam(trs, result, 'accnum', /Счет\s*(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(trs, result, 'balance',  /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(trs, result, ['currency', 'balance'], /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(trs, result, 'rate', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(trs, result, 'balrub', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    pattern = '\\d{4} [\\dX]{4} X{4} ' + (!prefs.num || prefs.num.length > 4 ? '\\d{4}' : prefs.num);

    AnyBalance.trace('Looking for a card (pattern: ' + pattern + ')');
    var cardRow = getParam(trs, null, null, new RegExp('<tr[^>]*>(?:[\\s\\S](?!</tr>))*?' + pattern + '[\\s\\S]*?</tr>', 'i'));
    if(cardRow){
        getParam(cardRow, result, 'cardnum', /карта([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(cardRow, result, 'till', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    }else{
        AnyBalance.trace('Could not find card (pattern: ' + pattern + ')');
    }

    //Возвращаем результат
    AnyBalance.setResult(result);
}
