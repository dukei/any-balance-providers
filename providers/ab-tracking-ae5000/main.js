/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.ae5000.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl + 'senders/state_delivery/', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'senders/state_delivery/', {
	    'StateModel[number]':prefs.sender_number,
        'StateModel[cargo_date]':prefs.sender_date,
        'StateModel[filial]':prefs.sender_filial,
        'StateModel[barcode]':prefs.sender_barcode,
		'yt0':'Показать'
    }, addHeaders({Referer: baseurl + 'login'}));
	
	var table = getParam(html, null, null, /(<table>([\s\S]*?)<\/table>)/i);
	if(!table) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true, all:''};

	var rows = sumParam(table, null,null, /(<tr[^>]*>(?!<th)[\s\S]*?<\/tr>)/ig, replaceTagsAndSpaces, html_entity_decode);
	for(i = 0; i<rows.length; i++) {
		result.all += rows[i] + '\n';
	}
	result.all = result.all.replace(/^\s+|\s+$/g, '');
	
    AnyBalance.setResult(result);
}