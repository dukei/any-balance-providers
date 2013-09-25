/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://calc.unistream.com/';
	AnyBalance.setDefaultCharset('utf-8');
		
	var html = AnyBalance.requestGet(baseurl + 'tracking/frame.aspx', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if(name == 'knp')
			return prefs.login;
		else if(name == 'sender_lastname')
			return prefs.lastname;
		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'tracking/frame.aspx', params, addHeaders({Referer: baseurl }));
	
	if(!/Повторить/i.test(html)) {
		throw new AnyBalance.Error('Не удалось получить данные по переводу с номером ' + prefs.login);
	}
    var result = {success: true};
	getParam(html, result, 'perevod', /Перевод:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /Перевод:[^>]*>[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'dest', /Пункт выдачи:([^<]{2,})/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'adress', /Адрес:([^<]{5,})/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'naim', /Наименование:([^<]{5,})/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}