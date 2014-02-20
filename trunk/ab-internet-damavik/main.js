/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.66 Safari/537.36',
	'Origin':'https://issa.damavik.by',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://issa.damavik.by/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
    var html = AnyBalance.requestGet(baseurl, g_headers);
	
	html = AnyBalance.requestPost(baseurl, {
		form_action_true:'https://issa.damavik.by/about',
        login__n18:prefs.login,
        password__n18:prefs.password,
        action__n18:'login'
    }, addHeaders({Referer: baseurl})); 
	
    if(!/Информация о лицевом счете/i.test(html)){
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
    var result = {success: true};
    getParam(html, result, 'balance', /Состояние счета[^>]*value="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /Добро пожаловать,\s*<[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'acc', /Номер лицевого счета[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
	var details = getParam(html, null, null, />Тарифный план<(?:[^>]*>){20}<a href="\/([^"]+)/i);
	if(details && isAvailable(['trafic', 'trafic_total'])) {
		html = AnyBalance.requestGet(baseurl + details, g_headers);
		
		getParam(html, result, 'trafic_total', /Кол-во трафика в интернет на услуге([^>]*>){3}/i, replaceTagsAndSpaces, parseTraffic);
		getParam(html, result, 'trafic', /<th>\s*<\/th>\s*<th>([\s\d.]+)<\/th>/i, [replaceTagsAndSpaces, /(.*)/i, '$1 мб'], parseTraffic);
	}	
	
    AnyBalance.setResult(result);
}