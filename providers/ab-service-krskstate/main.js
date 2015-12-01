/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Encoding':'gzip, deflate, sdch',
	'Accept-Language':'en-US,en;q=0.8,ru;q=0.6',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36'
}

function main(){
	AnyBalance.setDefaultCharset('utf-8'); 
    var prefs = AnyBalance.getPreferences();
	
    checkEmpty(prefs.login, 'Введите номер заявления!');
	var baseurl = "http://www.krskstate.ru/krao/underschool/";
    
    var html = AnyBalance.requestGet(baseurl + 'queue', g_headers);
	
    if(!html || AnyBalance.getLastStatusCode() > 400){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    };
	
    html = AnyBalance.requestGet(baseurl + 'queue?kinnumber=' + prefs.login, addHeaders({Referer: baseurl + 'queue'})); 

    if(!/<h3[^>]*>Первичная информация о положении в очереди/i.test(html)) {
        var error = getParam(html, null, null, /<\/form>[^f]*(?=Уважаемые посетители!)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, true);
        
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true, login: prefs.login};
	
    getParam(html, result, 'district', /<p[^>]*>Район:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'agegroup', /<p[^>]*>Возрастная группа:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'healthgroup', /<p[^>]*>Группа здоровья:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<p[^>]*>Номер в очереди:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /<p[^>]*>Статус\/состояние:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'lvcount', /<p[^>]*>Количество внеочередников:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'lpcount', /<p[^>]*>Количество первоочередников:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'uncount', /<p[^>]*>Количество не имеющих льготу:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'total', /<p[^>]*>Всего в очереди:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}
