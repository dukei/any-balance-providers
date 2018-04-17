/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получается баланс для интернет провайдера Tiera 

Operator site: https://my.tiera.ru/
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    moment.lang('ru');
    var prefs = AnyBalance.getPreferences();

    var baseurl = 'https://my.tiera.ru/';

    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(baseurl, AB.addHeaders({ Referer: baseurl }));

    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    html = AnyBalance.requestPost(baseurl, {
        action: 'logon',      
        login:prefs.login,
        password:prefs.password
    }, AB.addHeaders({ Referer: baseurl }));

    html = AnyBalance.requestGet(baseurl, AB.addHeaders({ Referer: baseurl }));

    if(!/\/logout/i.test(html)){
        var error = AB.getParam(html, null, null, /lostpassword[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces);
        if (error) {
            throw new AnyBalance.Error(error, null, /пароль/i.test(error));
        }

        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    AB.getParam(html, result, 'fio', /<td[^>]*>ФИО<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'prognoz', /<td[^>]*>Прогноз отключения<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, parseDateMoment);
    AB.getParam(html, result, 'number', /<td[^>]*>Лицевой счет<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'balance', /<td[^>]*>Баланс<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, parseBalanceRK);
    AB.getParam(html, result, 'status', /<td[^>]*>Статус<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}

function parseBalanceRK(_text){
    var text = _text.replace(/\s+/g, '');
    var rub = AB.getParam(text, null, null, /(-?\d[\d\.,]*)\s*руб/i, null, AB.parseBalance) || 0;
    var kop = AB.getParam(text, null, null, /(-?\d[\d\.,]*)\s*коп/i, null, AB.parseBalance) || 0;
    var val = rub + kop/100;
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + _text);
    return val;
}

function parseDateMoment(str){
    var mom = moment(str.replace(/i/ig, 'і'), ['DD MMM YYYY', 'HH:mm-D MMM YYYY']);
    if(!mom.isValid()){
        AnyBalance.trace('Failed to parse date from ' + str);
    }else{
        var val = mom.toDate();
        AnyBalance.trace('Parsed date ' + val + ' from ' + str);
        return val.getTime();
    }
}
