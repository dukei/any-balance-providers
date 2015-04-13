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
    var baseurl = 'https://advmaker.net/';
    AnyBalance.setDefaultCharset('windows-1251');

    checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestPost(baseurl + 'webmaster/', {
        'login_adv': prefs.login,
        'password_adv': prefs.password,
    }, addHeaders({Referer: baseurl + 'webmaster/'})); 

    if(!/exit\//i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
	html = AnyBalance.requestGet(baseurl + 'webmaster/', g_headers);
	
	var table = getParam(html, null, null, /(<table[\s\S]*?>[\s\S]*?<\/table>)/i);
	if(!table)
		throw new AnyBalance.Error('Не удалось найти таблицу с данными. Сайт изменен?');
	
	var result = {success: true};
	
	getParam(html, result, 'balance', [/Ваш баланс(?:[^>]*>){2}([^<]+)/i, /Заработано на[\s\S]{15}([\s\S]*?)<\/strong>/i], replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'total', /Всего:([^>]*>){11}/i, replaceTagsAndSpaces, parseBalance);

	fetchResults(result, baseurl + 'webmaster/stat/desktop/', ['web_CU', 'web_SB', 'web_BN', 'web_summary']);
	fetchResults(result, baseurl + 'webmaster/stat/video/', ['video_ads', 'video_lcs', 'video_viewer', 'video_600_300', 'video_summary']);
	fetchResults(result, baseurl + 'webmaster/stat/mobile/', ['mobile_redirect', 'mobile_300_250', 'mobile_notice', 'mobile_summary']);
	
    AnyBalance.setResult(result);
}

function fetchResults(result, url, params){
	if(isAvailable(params)){
		var html = AnyBalance.requestGet(url);

		var table = getParam(html, null, null, /(<table[\s\S]*?>[\s\S]*?<\/table>)/i);
		if(!table)
			throw new AnyBalance.Error('Не удалось найти таблицу с данными. Сайт изменен?');

		for(var i = 0, toi = params.length; i < toi; i++){
			getParam(table, result, params[i], new RegExp('Всего:([^>]*>){' + (i * 2 + 3) + '}', 'i'), replaceTagsAndSpaces, parseBalance);
		}
	}
}