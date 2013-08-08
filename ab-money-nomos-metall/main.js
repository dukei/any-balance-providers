/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11'
};

function main() {
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://www.nomos.ru/';
    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(baseurl, g_headers);
	
	var table = getParam(html, null, null, /Драгоценные металлы[\s\S]*?(<table[\s\S]*?<\/table>)/i, null, html_entity_decode);
	if(!table)
		throw new AnyBalance.Error('Не удалось таблицу с курасами металлов, сайт изменен либо недоступен.');
		
	var result = {success: true};
	getParam(table, result, 'gold_buy', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'gold_sell', /(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'serebro_buy', /(?:[\s\S]*?<td[^>]*>){10}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'serebro_sell', /(?:[\s\S]*?<td[^>]*>){11}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'platina_buy', /(?:[\s\S]*?<td[^>]*>){13}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'platina_sell', /(?:[\s\S]*?<td[^>]*>){14}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'palladi_buy', /(?:[\s\S]*?<td[^>]*>){16}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'palladi_sell', /(?:[\s\S]*?<td[^>]*>){17}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}