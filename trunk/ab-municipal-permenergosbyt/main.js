/**
Показания счетчика Пермэнергосбыт (http://any-balance-providers.googlecode.com)

Получает баланс на счету оплаты электроэнергии 

Operator site: http://permenergosbyt.ru/
Личный кабинет: http://test.permenergosbyt.ru/Auth/IndividualEnergy
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
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.surname, 'Введите фамилию!');

    var baseurl = "https://test.permenergosbyt.ru/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl + 'Auth/IndividualEnergy', {
        "Number":prefs.login,
        "SecondName":prefs.surname
    }, addHeaders({Referer: baseurl + 'Auth/IndividualEnergy'})); 

    if(!/\/Auth\/Logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="field-validation-error"[^>]*>[\s\S]*?([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'balance', /((?:Долг|Переплата)(?:\s|&nbsp;)*:\s*<span[^>]*>[\s\S]*?)<\/span>/i, [/Долг(?:\s|&nbsp;)*:/i, '-', replaceTagsAndSpaces], parseBalance);
    getParam(html, result, 'statement', /Расход электроэнергии(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'consumption', /Расход электроэнергии(?:[\s\S]*?<td[^>]*>){10}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'account', /Лицевой счет(?:\s|&nbsp;)*:\s*<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /ФИО(?:\s|&nbsp;)*:\s*([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'number', /Номер счетчика(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Тариф(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'tariffNumber', /Ставка тарифа(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
