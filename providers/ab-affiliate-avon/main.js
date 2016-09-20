/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию из личного кабинета AVON

Operator site: http://www.avon.ru
Личный кабинет: https://www.avon.ru/REPSuite/login.page
*/

var g_headers = {
    'Accept':           'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Charset':   'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':  'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection':       'keep-alive',
    'User-Agent':       'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36'
};

function main(){
    var prefs   = AnyBalance.getPreferences(),
        baseurl = "https://www.avon.ru/";
    AnyBalance.setDefaultCharset('utf-8');

    AB.checkEmpty(prefs.login, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');

    var html = AnyBalance.requestGet(baseurl + 'REPSuite/loginMain.page', g_headers);
    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
    }

    var params = AB.createFormParams(html, function(params, str, name, value) {
        if (name == 'userIdDisplay') {
            return prefs.login;
        } else if (name == 'password') {
            return prefs.password;
        }

        return value;
    });

    html = AnyBalance.requestPost(baseurl + 'REPSuite/login.page', params, addHeaders({
        Referer: baseurl + 'manager/representative',
    }));

    if(!/logoutMain/i.test(html)){
        var error = AB.getParam(html, null, null, /<div[^>]+logindivnojs[^>]*>(?:[\s\S]*?errortd){2}[^\(]*\(([^\)]*)/i);
        if(error)
            throw new AnyBalance.Error(error, null, /неверный компьютерный номер/i.test(error));

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    html = AnyBalance.requestGet(baseurl + 'REPSuite/home.page', g_headers);
    AB.getParam(html, result, 'balance', /<td[^>]*>Баланс(?:[^>]*>){2}([^<]*)/i,                                          AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'bonus',   /Доступные баллы[\s\S]*?<span[^>]*>([^<]*)/i,                                    AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'p_bonus', /Потенциальные баллы[\s\S]*?<span[^>]*>([^<]*)/i,                                AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'h_bonus', /Горящие баллы[\s\S]*?<span[^>]*>([^<]*)/i,                                      AB.replaceTagsAndSpaces, AB.parseBalance);

    AB.getParam(html, result, 'fio',      /Здравствуйте,([^<]*)/i,                             AB.replaceTagsAndSpaces);
    AB.getParam(html, result, '__tariff', /Здравствуйте,([^<]*)/i,                             AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'daysleft', /<span[^>]+daysLeft_text[^>]*>([\s\S]*?)<\/span>/i,  AB.replaceTagsAndSpaces,  AB.parseBalance);

    html = AnyBalance.requestGet(baseurl + 'REPSuite/accountBalance.page', g_headers);
    AB.getParam(html, result, 'lastpay', /Последний платеж\s*:([\s\S]*?)<\/td>/i,  AB.replaceTagsAndSpaces,  AB.parseBalance);
    AB.getParam(html, result, 'credit',  /Кредит\s*:([\s\S]*?)<\/td>/i,            AB.replaceTagsAndSpaces,  AB.parseBalance);
    AB.getParam(html, result, 'limit',   /доступный лимит кредита([^<]*<){2}/i,    AB.replaceTagsAndSpaces,  AB.parseBalance);

    if(!result.balance)
        AB.getParam(html, result, 'balance', /Баланс \+ Пени\s*:([\s\S]*?)<\/td>/i,  AB.replaceTagsAndSpaces,  AB.parseBalance);

    var table =  AB.getParam(html, null, null, /<table[^>]+class="body"[^>]*>(?:[\s\S](?!<\/table>))*?Кампания[\s\S]*?<\/table>/i);
    var tr;
    if(table) {
        tr =  AB.getParam(table, null, null, /<tr[^>]*>\s*<td[^>]*>[1-9]\d*(?:[\s\S](?!<\/tr>))*?Заказ[\s\S]*?<\/tr>/i);
    }
    if(tr) {
        AB.getParam(tr, result, 'orderdate', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseDate);
        AB.getParam(tr, result, 'paytill',   /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseDate);
    }

    //Возвращаем результат
    AnyBalance.setResult(result);
}