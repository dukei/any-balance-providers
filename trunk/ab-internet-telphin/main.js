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
    var baseurl = 'https://account.telphin.ru/';
    AnyBalance.setOptions({FORCE_CHARSET: 'windows-1251'}); 

    var html = AnyBalance.requestPost(baseurl + 'login.php?r_page=', {
        'user_name':prefs.login,
        'user_pass':prefs.password,
    }, g_headers); 
	
    if(!/btnout/i.test(html)){
        var error = getParam(html, null, null, /<font color ="red"><b>([\s\S]*?)<\/b><\/font><\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'balance', /auth_conteiner[\s\S]*?(-?\d[\d\s]*[.,]?\d*[.,]?\d*)<\/p>/i, replaceTagsAndSpaces, parseBalance);
    AnyBalance.setResult(result);
}