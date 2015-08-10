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
    var baseurl = "http://act.telekarta.tv/chkcard/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl + 'check.php', {
        card: prefs.login
    }, addHeaders({Referer: baseurl + 'index.php'}));
	
	var msg = getParam(html, null, null, /<div[^>]+id="msg"[^>]*>([\s\S]*?)<\/div>/i);
	
	if (!/<title>Дата окончания подписки<\/title>/i.test(html)) {
		if (msg)
			throw new AnyBalance.Error(msg, null, /Ошибка в номере карты/i.test(msg));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить дату окончания подписки. Сайт изменен?');
	}
	
    var result = {success: true};
    
    getParam(msg, result, 'num', /^([\s\S]*?):/i,  replaceTagsAndSpaces, html_entity_decode);
    getParam(msg, result, '__tariff', /^([\s\S]*?):/i,  replaceTagsAndSpaces, html_entity_decode);
    getParam(msg, result, 'till', /:\s*<\/span>([^<]*)/i,  replaceTagsAndSpaces, parseDate);
	
    if(AnyBalance.isAvailable('till') && !isset(result.till)){
        //Не удалось получить дату подписки.
        if(!/нет активной подписки/i.test(msg))
            throw new AnyBalance.Error(replaceAll(msg, replaceTagsAndSpaces));
        result.till = 0; //Нет активной подписки. 
    }

    AnyBalance.setResult(result);
}
