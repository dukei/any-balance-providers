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
    var baseurl = 'https://scc.aquafon.com/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl + 'AWWW/ACCOUNT_INFO', {
        X_Username:prefs.login,
        X_Password:prefs.password,
        x:'34',
		y:'10'
    }, addHeaders({Referer: baseurl + 'login'})); 

	var sessionID = getParam(html, null, null, /SESSION_ID=([\s\S]*?)"/i, replaceTagsAndSpaces, html_entity_decode);
    if(!sessionID){
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	html = AnyBalance.requestGet(baseurl + 'AWWW/BILL_ORDER_FORM?SESSION_ID='+sessionID , g_headers);

    var result = {success: true};
    getParam(html, result, 'fio', /&#1050;&#1083;&#1080;&#1077;&#1085;&#1090;[\s\S]*?<span class="pseudo-input-field">([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_num', /&#8470; &#1089;&#1095;&#1077;&#1090;&#1072;[\s\S]*?<span class="pseudo-input-field">([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /&#1041;&#1072;&#1083;&#1072;&#1085;&#1089;[\s\S]*?">([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}