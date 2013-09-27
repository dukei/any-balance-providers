/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
	'X-Requested-With':'XMLHttpRequest'
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.fssprus.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	var url = baseurl + 'is/ajax-iss.php?s=ip&is%5Bextended%5D=1&is%5Bvariant%5D=1&is%5Bregion_id%5D%5B0%5D=' + (prefs.region_id ? prefs.region_id : '77') +
		'&is%5Blast_name%5D=' + encodeURIComponent(prefs.last_name) +
		'&is%5Bfirst_name%5D=' + encodeURIComponent(prefs.first_name) +
		'&is%5Bpatronymic%5D=&is%5Bdate%5D=&nocache=1&is%5Bsort_field%5D=&is%5Bsort_direction%5D=';
	
	var html = AnyBalance.requestGet(url, g_headers);
	
	var captchaa = getParam(html, null, null, /<img\s*src=".{1}([^"]*)/i);
	if(captchaa) {
		if(AnyBalance.getLevel() >= 7){
			AnyBalance.trace('Пытаемся ввести капчу');
			var captcha = AnyBalance.requestGet(baseurl+ captchaa);
			captchaa = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', captcha);
			AnyBalance.trace('Капча получена: ' + captchaa);
		}else{
			throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
		}
		
		html = AnyBalance.requestPost(url, {
			code:captchaa,
			'capcha-submit':'Отправить'
		}, addHeaders({Referer: baseurl + ''}));
	}
	
	var table = getParam(html, null, null, /<table[^>]*class="list"[\s\S]*?<\/table>/i);
	var result = {success: true, all:''};
	if(table) {
		getParam(html, result, 'balance', /Найдено([^\/]*)/i, replaceTagsAndSpaces, parseBalance);
		var rows = sumParam(table, null, null, /<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/tr>/ig, replaceTagsAndSpaces, html_entity_decode);
		for(i = 0; i < rows.length; i++) {
			result.all += rows[i] + '\n\n';
		}
		result.all = result.all.trim();
	} else {
		var err = getParam(html, null, null, /class="empty"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if(!err)
			err = "Не найдено информации...";

		result.all = err;
	}
	
    AnyBalance.setResult(result);
}