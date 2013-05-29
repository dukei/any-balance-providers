/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получается статисту Яндекса и Google с сайта PR-CY 

Operator site: http://pr-cy.ru/
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences(),
        siteUrl = prefs.login.replace("http://", ""),
        baseurl = "http://pr-cy.ru/a/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + siteUrl, g_headers);

    if(!/<!-- Показатели Яндекс -->/i.test(html)){
        throw new AnyBalance.Error('Не удалось получить информацию. Возможно вы неверно ввели название домена. Или сайт изменен.');
    }

    var result = {success: true};
    getParam(html, result, 'yandexTic', /<!-- тИЦ -->(?:[\s\S]*?<a[^>]+>){1}([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'yandexCatalog', /<!-- Яндекс каталог -->(?:[\s\S]*?<a[^>]+>){1}([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'yandexIndex', /<!-- Индекс Яндекса -->(?:[\s\S]*?<a[^>]+>){1}([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);

    getParam(html, result, 'googlePR', /<!-- PR -->(?:[\s\S]*?<div[^>]+>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'googleCatalog', /<!-- DMOZ -->(?:[\s\S]*?<a[^>]+>){1}([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'googleIndex', /<!-- Гугл Индекс -->(?:[\s\S]*?<a[^>]+>){1}([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
