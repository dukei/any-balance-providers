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
    var baseurl = 'http://inti.net.ua/';
    AnyBalance.setDefaultCharset('utf-8'); 
	// Ставит куку какую-то
	AnyBalance.requestGet(baseurl + 'lviv');

	var html = AnyBalance.requestPost(baseurl + 'enteruser', {
		'txt_city':'1',
        'txt_login':prefs.login,
        'txt_pass':prefs.password,
        'btn_enter':'Увійти'
    }, addHeaders({Referer:baseurl + 'lviv&lang=ru'})); 
	AnyBalance.setCookie(baseurl, 'city', 'lviv');
	
    if(!/value="Змiнити"|value="Изменить"|value="Change"/i.test(html)){
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
	var lastname = getParam(html, null, null, /(?:Фамиилия|Прізвище|Last Name)[\s\S]{1,100}value="([\s\S]*?)"/i, replaceTagsAndSpaces, html_entity_decode);
	var firstname = getParam(html, null, null, /(?:Імя|Имя)[\s\S]{1,100}value="([\s\S]*?)"/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(firstname + ' ' + lastname, result, 'fio', null, null, null);
    getParam(html, result, 'balance', /(?:Balance|Баланс)[\s\S]{1,100}value="([\s\S]*?)"/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'acc_num', /(?:personal account|личного счета|особового рахунку)[\s\S]*?value="\s*([\s\S]*?)"/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
