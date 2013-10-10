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
    var baseurl = 'https://cabinet.tvingo.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    //var html = AnyBalance.requestGet(baseurl, g_headers);

	var html = AnyBalance.requestPost(baseurl, {
        username:prefs.login,
        passwd:prefs.password,
        B1:'Вход'
    }, addHeaders({Referer: baseurl})); 

    if(!/logout/i.test(html)){
        var error = getParam(html, null, null, /<td[^>]*>[^>]*id="info"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	html = AnyBalance.requestGet(baseurl+'start.php?do=doginfo', g_headers);
	
    var result = {success: true};
    getParam(html, result, 'balance', /Текущий остаток:(?:[\s\S]*?<[^>]*>)([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /Статус:(?:[\s\S]*?<[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_num', /Договор[^<]*?(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /ФИО(?:[\s\S]*?<[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}