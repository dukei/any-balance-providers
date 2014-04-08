/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru,en;q=0.8',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.154 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "http://www.uvokuzbass.ru/";
    AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestGet(baseurl + 'zadolg/', g_headers);
	
    html = AnyBalance.requestPost(baseurl + 'zadolg/', {
		'sposob':'1', //По лицевому счету
		'NOMOVO':prefs.city || 'А8238',
		'LSCHET':prefs.login,
		'DOG':'',
		'FIO':'',
		'sendinfo':'Узнать задолженность'
    }, addHeaders({Referer: baseurl + 'zadolg/'})); 
	
	if(!/На дату \d{2}.\d{2}.\d{2,4}/i.test(html)){
		var error = sumParam(html, null, null, /class="errorstr"([^>]*>){2}/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		if (error)
			throw new AnyBalance.Error(error, null, /не\s*найдено/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти информацию. Сайт изменен?');
	}
	
    var result = {success: true};
	
	getParam(html, result, 'balance', /(?:Переплата|Задолженность) по штрафам(?:[^>]*>){7}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /На дату[^<]*(?:задолженность|переплата)\s+по\s+договору([^<]*)составляет/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}