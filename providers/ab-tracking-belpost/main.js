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
	var baseurl = 'http://search.belpost.by/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.cargo, 'Введите номер отправления!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    
	html = AnyBalance.requestPost(baseurl + 'ajax/search', {
		item: prefs.cargo,
		internal: prefs.internal || '1'
	}, addHeaders({Referer: baseurl + 'ajax/search'}));
	
	if (/ничего не найдено/i.test(html)) {
		var error = getParam(html, null, null, /По вашему запросу ничего не найдено/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /По вашему запросу ничего не найдено/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
    var trs = sumParam(html, null, null, /<tr>[\s\S]*?<\/tr>/ig);
    var len = trs.length - 1;
    
    getParam(trs[len], result, 'date', /<td>([^>]*>){1}/i, replaceTagsAndSpaces, parseDate);
    getParam(trs[len], result, 'status', /<td>([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(trs[len], result, 'post_office', /<td>([^>]*>){5}/i, replaceTagsAndSpaces, html_entity_decode);

	if (AnyBalance.isAvailable('fulltext')) {
        var res = [];
        for (var i = 1; i < trs.length; i++) {       
            var date = getParam(trs[i], null, null, /<td>([^>]*>){1}/i, replaceTagsAndSpaces, html_entity_decode);
            var status = getParam(trs[i], null, null, /<td>([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
            var post_office = getParam(trs[i], null, null, /<td>([^>]*>){5}/i, replaceTagsAndSpaces, html_entity_decode);
            res.push('<b>' + date + '</b> ' + status + '. ' + 'Post office: ' + post_office);
        }
        result.fulltext = res.join('<br/>');
	}   
	
	AnyBalance.setResult(result);
}