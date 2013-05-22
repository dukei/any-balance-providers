/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о комунальных платежах из системы Единый Расчетный Центр 

Operator site: http://www.erc.ur.ru/
Личный кабинет: http://www.erc.ur.ru/client/private_office/mprivate_office.htp
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

    var baseurl = "http://www.erc.ur.ru/";

    AnyBalance.setDefaultCharset('windows-1251'); 

    var html = AnyBalance.requestPost(baseurl + 'clients/private_office/mprivate_office.htp', {
        username:prefs.login,
        password:prefs.password,
        smth:''
    }, addHeaders({Referer: baseurl + 'clients/private_office/mprivate_office.htp'})); 

    if(/<div[^>]+class="errordiv"[^>]*>/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="errordiv"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + '/client/private_office/mprivate_office.htp?ls', g_headers);

    var number = prefs.number || getParam(html, null, null, /<table[^>]+class="ns_yellow_text"[^>]*>(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);

    html = AnyBalance.requestGet(baseurl + '/client/private_office/mprivate_office.htp?receipt=' + number + "&info", g_headers);

    if (!getParam(html, null, null, /<td[^>]*>\s*ВСЕГО<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance)) {
        throw new AnyBalance.Error('Не удается найти информацию по указанному номеру счета. Возможно ни один счет не подключен.');
    }

    var result = {success: true};
    getParam(html, result, 'balance', /<td[^>]*>Содержание\s*жилья\s*\(с\s*лифтом\)\s*<\/td>(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance2', /<td[^>]*>Капитальный ремонт<\/td>(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance3', /<td[^>]*>Отопление<\/td>(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance4', /<td[^>]*>подача воды<\/td>(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance5', /<td[^>]*>нагрев воды<\/td>(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance6', /<td[^>]*>Холодное водоснабжение<\/td>(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance7', /<td[^>]*>Водоотведение<\/td>(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance8', /<td[^>]*>Электроэнергия<\/td>(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance9', /<td[^>]*>Газ<\/td>(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance10', /<td[^>]*>\s*ВСЕГО<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
