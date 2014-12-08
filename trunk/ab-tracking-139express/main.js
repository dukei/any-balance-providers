/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://vip.139express.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер накладной!');
	
	
	var html = AnyBalance.requestGet(baseurl + 'search.aspx', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'TextBox1') 
			return prefs.login;

		return value;
	});
    
	html = AnyBalance.requestPost(baseurl + 'search.aspx', params, addHeaders({Referer: baseurl + 'search.aspx'}));
	
    var re = new RegExp('<td>\\d{4}-\\d{1,2}-\\d{1,2}\\s+\\d{1,2}:\\d{1,2}:\\d{1,2}</td>(?:[^>]*>){4}\\s*</tr>\\s*</?(?:div|form)', 'i');
    var tr = getParam(html, null, null, re);
    checkEmpty(tr, 'Не удалось найти данные по отправлению: ' + prefs.login, true);
    AnyBalance.trace(tr);
    
	var result = {success: true};
	
	getParam(tr, result, 'date', /<td(?:[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'status', /<td(?:[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'message', /<td(?:[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /139номер\sнакладной(?:[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}