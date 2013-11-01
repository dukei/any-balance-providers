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
    var baseurl = "https://secure.mega-billing.com/";
    AnyBalance.setDefaultCharset('utf-8'); 
	
    var html = AnyBalance.requestGet(baseurl + 'byt/ru', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value){
		if(name == 'username')
			return prefs.login;
		else if(name == 'password')
			return prefs.password;		
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'byt/ru/login', params, g_headers); 
	
    if(!/\/Logout/i.test(html)){
        var error = getParam(html, null, null, [/<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, /class="page-error"[^>]*>([^<]*)/i], replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
    var result = {success: true};
	
	var balance = getParam(html, null, null, /Задолженность[^>]*"saldo-value"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	if(balance)
		getParam(balance*-1, result, 'balance');
	else
		getParam(html, result, 'balance', /saldo debit">[\s\S]*?value">([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	
	getParam(html, result, 'acc', /Лицевой счет\s*№\s*(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /Потребитель[\s\S]*?">([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'lastpay', /Последняя оплата[\s\S]*?>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'lastcounter', /Последние показания счетчика[\s\S]*?>([\s\S]*?)г\./i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'tarif', /Действующий тариф[\s\S]*?>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}