/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'	Mozilla/5.0 (Windows NT 6.1; WOW64; rv:23.0) Gecko/20100101 Firefox/23.0'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://portal.freshtel.ua/';
    AnyBalance.setDefaultCharset('windows-1251'); 
	
	var html = AnyBalance.requestPost(baseurl + 'ps/selfcare_unt/login.php', {
        X_Username:prefs.login,
        X_Password:prefs.password,
        P_USER_LANG_ID:'1'
    }, addHeaders({Referer: baseurl + 'ps/selfcare_unt/login.php'})); 
	// Нас вежливо послали.. :) но это не страшно :)
	var href = getParam(html, null, null, /Для коректної роботи необхідно увімкнути JavaScript в браузері[\s\S]*?<a href="([^>]*?)"/i, null, html_entity_decode);
	
	if(!href){
        var error = getParam(html, null, null, /<div class="cell-label">\s*<font color="red">\s*([\s\S]*?)\s*<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	html = AnyBalance.requestGet(baseurl + href, g_headers);
	
    var result = {success: true};
    getParam(html, result, 'fio', /&#1050;&#1083;&#1110;&#1108;&#1085;&#1090;[\s\S]*?class="pseudo-input-field">([\s\S]*?)<\//i, null, html_entity_decode);
	getParam(html, result, 'acc', /&#8470; &#1088;&#1072;&#1093;&#1091;&#1085;&#1082;&#1091;[\s\S]*? class="pseudo-input-field">([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /&#1041;&#1072;&#1083;&#1072;&#1085;&#1089;[\s\S]*?class="gray">([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'dolg', /&#1041;&#1086;&#1088;&#1075;[\s\S]*?class="gray">([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus', /&#1041;&#1086;&#1085;&#1091;&#1089;&#1080;[\s\S]*?"data1">([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /&#1041;&#1072;&#1083;&#1072;&#1085;&#1089;[\s\S]*?class="gray">([\s\S]*?)<\//i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'traf_limit', /&#1051;&#1110;&#1084;&#1110;&#1090; &#1090;&#1088;&#1072;&#1092;&#1110;&#1082;&#1091;(?:[^>]*>){6}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'traf_bonus', /&#1041;&#1086;&#1085;&#1091;&#1089; &#1090;&#1088;&#1072;&#1092;&#1110;&#1082;&#1091;(?:[^>]*>){6}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'traf_used', /&#1042;&#1080;&#1082;&#1086;&#1088;&#1080;&#1089;&#1090;&#1072;&#1085;&#1086;(?:[^>]*>){6}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /<NAME>([^<]*)/i, null, html_entity_decode);
	
    AnyBalance.setResult(result);
}