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
	var baseurl = 'http://track.yw56.com.cn/en-US/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер посылки!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
        
    var token = getParam(html, null, null, /__RequestVerificationToken[\s\S]*?value="([^]*?)"/i);
    
	html = AnyBalance.requestPost(baseurl, {
		'txa_trackingnumber': prefs.login,
		'__RequestVerificationToken': token
	}, addHeaders({Referer: baseurl}));
    
    var key = getParam(html, null, null, /data-theme="([^]*?)"/i);
    var index = getParam(html, null, null, /data-title="([^]*?)"/i);
    
	html = AnyBalance.requestPost(baseurl + 'Home/GetExpressDetail', {
		'trackingNumber': prefs.login,
        index: index,
        key: key
	}, addHeaders({Referer: baseurl, 'X-Requested-With': 'XMLHttpRequest'}));    
    
    var json = getJson(html);
    
	if (!json || json.Status == "Not found") {
		var error = json.Status;
		if (error)
			throw new AnyBalance.Error(error, null, /Not found/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
    getParam(json.Days + '', result, 'days', null, replaceTagsAndSpaces, html_entity_decode);
    getParam(json.Status + '', result, 'status', null, replaceTagsAndSpaces, html_entity_decode);
    getParam(json.Region + '', result, 'destination', null, replaceTagsAndSpaces, html_entity_decode);
 
	if (AnyBalance.isAvailable('fulltext')) {
        var res = [];
        for (var i = 0; i < json.Details.length; i++) {       
            var date = getParam(json.Details[i].NodeTime_str + '', null, null, null, replaceTagsAndSpaces, html_entity_decode);
            var location = getParam(json.Details[i].Location + '', null, null, null, replaceTagsAndSpaces, html_entity_decode);
            var node_status = getParam(json.Details[i].NodeStatus + '', null, null, null, replaceTagsAndSpaces, html_entity_decode);
            res.push('<b>' + date + '</b> ' + node_status + '. ' + 'Location: ' + location);
        }
        result.fulltext = res.join('<br/>');
	}   
	
	AnyBalance.setResult(result);
}