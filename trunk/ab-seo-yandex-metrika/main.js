/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
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
	
    var baseurl = 'https://metrika.yandex.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'stat/?counter_id=' +prefs.login, g_headers);
	var title = getParam(html, null, null, /<h1 class="b-page-title__title">([\s\S]*?)<a title/i, replaceTagsAndSpaces, html_entity_decode);
	
    if(!title){
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

	html = AnyBalance.requestGet(baseurl + 'api/stat/traffic.json?offset=1&group=day&reverse=0&id='+prefs.login+'&table_mode=tree&mticket=', g_headers);
	
	var json = getJson(html);
	var today = json.data[6];
	var yesterday = json.data[5];

	
    var result = {success: true};
    getParam(title, result, '__tariff', null, replaceTagsAndSpaces, html_entity_decode);
	
	getParam(''+today.page_views, result, 'views_today', null, null, parseBalance);
	getParam(''+today.visits, result, 'visits_today', null, null, parseBalance);
	getParam(''+today.visitors, result, 'visitors_today', null, null, parseBalance);
	
	getParam(''+yesterday.page_views, result, 'views_yesterday', null, null, parseBalance);
	getParam(''+yesterday.visits, result, 'visits_yesterday', null, null, parseBalance);
	getParam(''+yesterday.visitors, result, 'visitors_yesterday', null, null, parseBalance);
	
    AnyBalance.setResult(result);
}