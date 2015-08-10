/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:23.0) Gecko/20100101 Firefox/23.0'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://dtv.dn.ua/';
    AnyBalance.setDefaultCharset('windows-1251'); 

    var html = AnyBalance.requestGet(baseurl + 'check.php', g_headers);

	html = requestPostMultipart(baseurl+ 'check.php', {
		num_dogovor:prefs.login,
		num_card:prefs.password,
		remember:'on'
	}, addHeaders({Referer: baseurl + 'check.php'}))
	
    if(!/logout/i.test(html)){
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
    var result = {success: true};
    getParam(html, result, 'balance', /Текущий баланс(?:[\s\S]*?<[^>]*>)([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'acc_num', /номер договора(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'daily', /ежедневного списания в тек\. месяце:([\s\S]*?)грн/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'monthly', /Стоимость подписки на месяц([\s\S]*?)грн/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}