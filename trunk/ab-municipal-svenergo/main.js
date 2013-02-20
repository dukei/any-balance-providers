/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс для поставщика электроэнергии свердловэнергосбыт

Сайт оператора: http://sesb.ru
Личный кабинет: http://lk.sesb.ru
*/

var g_headers = {
  'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
  'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
  'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1',
  Connection: 'keep-alive'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://lk.sesb.ru/";

    var html = AnyBalance.requestGet(baseurl + "Services/Auth.asmx/CheckLogin?part=&login='" + encodeURIComponent(prefs.login) + "'&password='" + encodeURIComponent(prefs.password) + "'&format=json&callback=jsonp1361363130748", g_headers);
    var json = getParam(html, null, null, /jsonp\d+\(([\s\S]*)\);?$/, null, getJson);
    if(json.d != 'true'){
        AnyBalance.trace(JSON.stringify(json));
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неправильный логин или пароль?');
    }

    html = AnyBalance.requestGet(baseurl + 'default.aspx', g_headers);

    var result = {success: true};

    getParam(html, result, '__tariff', /Наименование тарифа(?:[\s\S]*?<td[^>]*>){1}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'cost', /Стоимость услуг по тарифу:(?:[\s\S]*?<td[^>]*>){1}([\S\s]*?)<hr[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Состояние счета(?:[\s\S]*?<td[^>]*>){1}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'fio', /ФИО(?:[\s\S]*?<td[^>]*>){2}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /№ л\/с(?:[\s\S]*?<td[^>]*>){1}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
