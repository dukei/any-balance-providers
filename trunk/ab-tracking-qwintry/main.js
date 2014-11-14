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
	var baseurl = 'http://logistics.qwintry.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.number, 'Enter tracking number!');
	
	var html = AnyBalance.requestGet(baseurl + 'track?tracking=' + prefs.number, g_headers);
	
	if (!/<h1>Current status<\/h1>/i.test(html)) {
		var error = getParam(html, null, null, /alert-danger"[^>]*>[\s\S]*?([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /tracking does not exist/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
    getParam(html, result, 'tracking', /Track[\s]*?([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
    
    var trs = sumParam(html, null, null, /(<tr[\s\S]*?[\s\S]*?<\/tr>)/ig);
    var len = trs.length - 1;
    
    getParam(trs[len], result, 'create_time', /<tr(?:[^>]*>){1}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseDate);
    getParam(trs[len], result, 'status', /<tr(?:[^>]*>){4}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(trs[len], result, 'message', /<tr(?:[^>]*>){6}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, html_entity_decode);
    	
	AnyBalance.setResult(result);
}