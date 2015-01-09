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
	var baseurl = 'http://services.ukrposhta.ua/';
	AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestGet(baseurl+'bardcodesingle/', g_headers);

	var params = createFormParams(html, function(params, str, name, value){
		if(name == 'ctl00$centerContent$txtBarcode')
			return prefs.login;
		return value;
	});

	html = AnyBalance.requestPost(baseurl+'bardcodesingle/Default.aspx', params, addHeaders({Referer: baseurl + 'bardcodesingle/Default.aspx'})); 

	if(!/Результат пошуку/i.test(html)){
        throw new AnyBalance.Error('Не вдалося отримати інформацію. Сайт було змінено?');
    }

    var result = {success: true};
    getParam(html, result, 'all', /<div id="ctl00_centerContent_divInfo">\s*([\s\S]*?)\s*<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}