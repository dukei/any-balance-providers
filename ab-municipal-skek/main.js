/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'*/*',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://skek.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'cabinet/info.html', g_headers);
	// Входные данные, берутся из подзапросов
	var street;
	street = AnyBalance.requestGet(baseurl + 'cabinet/assets/snippets/skekinfo/core/request.php?q='+encodeURIComponent(prefs.street)+'&limit=10&timestamp=1378902323090&mrk=1', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'cabinet/assets/snippets/skekinfo/core/buscador.php', {
        'city':prefs.city,
		'street':street.trim(),
		'house':prefs.house,
		'quenta':prefs.acc,
    }, addHeaders({Referer: baseurl + 'cabinet/info.html'})); 

    if(/Нет данных/i.test(html)){
        throw new AnyBalance.Error('Не найти информацию по счету ' + prefs.acc);
    }
    var result = {success: true};
    getParam(html, result, 'balance', /Сумма долга(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'usluga', /Название услуги(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'counter_val', /Показания счетчика(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'full_adr', /<span>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}