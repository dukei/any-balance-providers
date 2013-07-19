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
    var baseurl = 'http://stat.aknet.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestPost(baseurl + 'cgi-bin/clients/login', {
		'action':'validate',
		'domain_id':'1',
		login:prefs.login,
		password:prefs.password,
		'submit':'Зарегистрироваться'
    }, addHeaders({Referer: baseurl + 'cgi-bin/clients/login'})); 

    if(!/Logout/i.test(html)){
        var error = getParam(html, null, null, /<td width="100%" background="" class="tableheader">([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'fio', /<b class="bigheader">([\s\S]*?),/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'acc_num', /<b class="bigheader">[\s\S]*?,\s*счет\s*N\s*(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /баланс:([\s\S]*?)(?:руб|$|EUR)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'date', /<td class="tablebodydark">([\s\S]*?)<\/td><\/tr>/i, replaceTagsAndSpaces, parseDateISO);

    AnyBalance.setResult(result);
}