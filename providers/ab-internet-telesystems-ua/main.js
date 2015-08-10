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
    var baseurl = 'http://telesystems.ua/';
    AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestPost(baseurl + 'cabinet/index.php?route=common/login', {
        username:prefs.login,
        password:prefs.password,
        login:'1'
    }, addHeaders({Referer: baseurl + 'login'})); 
	
    if(!/logout/i.test(html)){
        var error = getParam(html, null, null, /<div id="login_warning"[\s\S]{1,50}">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'balance', /Balance([\s\S]*?)грн/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /<div class="right_header">\s*([\s\S]*?)\s*\|/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'acc_num', /Номер договора:[\s\S]*?(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_num_two', /Номер личного счета:[\s\S]*?(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
    AnyBalance.setResult(result);
}