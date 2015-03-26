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
    var baseurl = 'http://yaltateplo.com/';
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(/\d{2}\/\d{5}/i.test(prefs.login), 'Введите номер лицевой счет в формате 02/04545!');
	
	var html = AnyBalance.requestPost(baseurl, {
		'DOGOVOR':prefs.login,
		'mode':'Показать выписку',
		'action':'form'
	}, g_headers); 
	
    if(!/Выписка из лицевого счета/i.test(html)){
        var error = getParam(html, null, null, /<div class="error_ins"><p>([\s\S]*?)<\/p><\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось найти информацию по счету. Сайт изменен?');
    }

    if(prefs.type === 'gup' || !prefs.type)
    	html = AnyBalance.requestGet(AnyBalance.getLastUrl() + 'GUPlight/')
	
    var result = {success: true};
	var balance = getParam(html, null, null, /У вас([\s\S]*?)руб/i, null, null);
	var val = 0;
	if(balance){
		if(/долг/i.test(balance))
			val = parseBalance(balance)*-1;
		else
			val = parseBalance(balance);
	}
	result.balance = val;
	getParam(prefs.login, result, 'acc', null, null, null);
	getParam(html, result, 'nachisleno', /<td>\s*Начислено\s*<\/td>(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, null, parseBalance);
	getParam(html, result, 'oplacheno', /<td>\s*Оплачено\s*<\/td>(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, null, parseBalance);
	getParam(html, result, 'dolg', /<td>\s*Долг\s*<\/td>(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, null, parseBalance);

    AnyBalance.setResult(result);
}