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
        siteUrl = prefs.login.replace('http://', ''),
        baseurl = 'https://a.pr-cy.ru/';

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + siteUrl, g_headers);

    var result = {success: true};
    AB.getParam(html, result, 'searchSystems_mainParams_yandexTic', /Яндекс ТИЦ([^>]+>){5}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'searchSystems_mainParams_yandexRank', /Яндекс Rank(?:[^>]+>){3}\D*(\d+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'searchSystems_mainParams_googleRank', /Google PageRank(?:[^>]+>){3}\D*(\d+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);

    AB.getParam(html, result, 'searchSystems_indexing_yandexIndex', /<h3>Индексация[\s\S]+?Яндекс([^>]+>){5}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'searchSystems_indexing_googleIndex', /<h3>Индексация[\s\S]+?info-test[^>]*>Google([^>]+>){5}/i, AB.replaceTagsAndSpaces, AB.parseBalance);

    AB.getParam(html, result, 'searchSystems_catalog_yandexCatalog', /<h3>Каталоги[\s\S]+?Яндекс\.Каталог(?:[^>]+>){3}((?:[^>]+>){2})/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'searchSystems_catalog_dmozCatalog', /<h3>Каталоги[\s\S]+?info-test[^>]*>DMOZ([^>]+>){4}/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'searchSystems_catalog_mailRuCatalog', /<h3>Каталоги[\s\S]+?info-test[^>]*>Mail\.ru([^>]+>){4}/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'searchSystems_catalog_ramblerCatalog', /<h3>Каталоги[\s\S]+?info-test[^>]*>Rambler(?:[^>]+>){3}((?:[^>]+>){2})/i, AB.replaceTagsAndSpaces);

    AB.getParam(html, result, 'searchSystems_sanction_domainSplicing', /<h3>Санкции[\s\S]+?Склейка домена(?:[^>]+>){3}((?:[^>]+>){2})/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'searchSystems_sanction_agsFilter', /<h3>Санкции[\s\S]+?Фильтр АГС(?:[^>]+>){3}((?:[^>]+>){2})/i, AB.replaceTagsAndSpaces);

    AB.getParam(html, result, 'searchSystems_virusCheck_yandexVirusCheck', /<h3>Проверка на вирусы[\s\S]+?Вирусы от Yandex(?:[^>]+>){3}((?:[^>]+>){2})/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'searchSystems_virusCheck_googleVirusCheck', /<h3>Проверка на вирусы[\s\S]+?Вирусы от Google(?:[^>]+>){3}((?:[^>]+>){2})/i, AB.replaceTagsAndSpaces);


    AB.getParam(html, result, 'traffic_alexRating_alexWorldRating', /Рейтинг Alexa[\s\S]+?Место в мире([^>]+>)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'traffic_alexRating_alexCountryRating', /Рейтинг Alexa[\s\S]+?Место в стране([^>]+>){2}/i, AB.replaceTagsAndSpaces, AB.parseBalance);

    AB.getParam(html, result, 'traffic_gender_male', /Гендер[\s\S]+?мужчин[\s\S]*?([\d,.]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'traffic_gender_female', /Гендер[\s\S]+?женщин[\s\S]*?([\d,.]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);


    AB.getParam(html, result, 'links_linkPad_referPages', /LinkPad[\s\S]+?ссылается страниц([^>]+>){4}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'links_linkPad_referDomains', /LinkPad[\s\S]+?ссылаются доменов([^>]+>){4}/i, AB.replaceTagsAndSpaces, AB.parseBalance);

    AB.getParam(html, result, 'links_majesticSeo_referPages', /MajesticSEO[\s\S]+?ссылается страниц([^>]+>){4}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'links_majesticSeo_referDomains', /MajesticSEO[\s\S]+?ссылаются доменов([^>]+>){4}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'links_majesticSeo_trust', /MajesticSEO[\s\S]+?Траст(?:[^>]+>){5}\D+(\d+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'links_majesticSeo_quoting', /MajesticSEO[\s\S]+?Цитирование(?:[^>]+>){5}\D+(\d+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);

    AB.getParam(html, result, 'links_socialNetwork_commonSocialActivity', /общая социальная активность([^>]+>)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'links_socialNetwork_vkActivity', /Социальная активность[\s\S]*?Вконтакте([^>]+>){4}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'links_socialNetwork_facebookLikes', /facebook лайки([^>]+>){4}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'links_socialNetwork_facebookShared', /facebook шареды([^>]+>){4}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'links_socialNetwork_googlePlus', /Социальная активность[\s\S]*?google\+([^>]+>){4}/i, AB.replaceTagsAndSpaces, AB.parseBalance);


    AB.getParam(html, result, 'optimization_content_pageTitle', /заголовок страницы(?:[^>]+>){3}((?:[^>]+>){4})/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'optimization_content_pageDescription', /описание страницы(?:[^>]+>){3}((?:[^>]+>){4})/i, AB.replaceTagsAndSpaces);

    AB.getParam(html, result, 'optimization_heading_pageHeaders', /info-test[^>]*>заголовки(?:[^>]+>){5}((?:[^>]+>){35})/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'optimization_heading_wordsAmount', /info-test[^>]*>количество слов([^>]+>){4}/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'optimization_heading_textLength', /info-test[^>]*>длина текста([^>]+>){4}/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'optimization_heading_loathing', /info-test[^>]*>тошнота(?:[^>]+>){3}\D*([\d.,]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'optimization_heading_pageSize', /info-test[^>]*>размер HTML страницы([^>]+>){4}/i, AB.replaceTagsAndSpaces);

    AB.getParam(html, result, 'optimization_serverInfo_ip', /info-test[^>]*>IP([^>]+>){4}/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'optimization_serverInfo_location', /info-test[^>]*>местоположение сервера((?:[^>]+>){5})/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'optimization_serverInfo_dataCenter', /info-test[^>]*>датацентр((?:[^>]+>){4})/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'optimization_serverInfo_domainAge', /info-test[^>]*>Возраст домена((?:[^>]+>){4})/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'optimization_serverInfo_domainTermination', /info-test[^>]*>окончание домена((?:[^>]+>){4})/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'optimization_serverInfo_sslCertificate', /info-test[^>]*>SSL-сертификат((?:[^>]+>){4})/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'optimization_serverInfo_redirect', /info-test[^>]*>редирект[^>]+>((?:[^>]+>){4})/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'optimization_serverInfo_encoding', /info-test[^>]*>кодировка((?:[^>]+>){4})/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'optimization_serverInfo_robotsFile', /info-test[^>]*>файл robots\.txt((?:[^>]+>){4})/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'optimization_serverInfo_sitemap', /info-test[^>]*>наличие sitemap((?:[^>]+>){8})/i, AB.replaceTagsAndSpaces);

    AB.getParam(html, result, 'usability_main_favicon', /info-test[^>]*>favicon((?:[^>]+>){6})/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'usability_main_responseCode404', /info-test[^>]*>код ответа страницы 404((?:[^>]+>){4})/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'usability_main_linkFrom404Page', /info-test[^>]*>ссылка со страницы 404((?:[^>]+>){4})/i, AB.replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}
