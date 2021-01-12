
var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://orionnet.ru";
    AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestPost(baseurl+'/auth.php', {
        login:prefs.login,
        password:prefs.password
    }, addHeaders());
	
	html = JSON.parse(html);
    	
	if (!html.status) {
        if(html.message)
            throw new AnyBalance.Error(html.message);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');		
	}
	else {
		var result = {success: true};
		html = AnyBalance.requestGet(baseurl+'/my.php', addHeaders());
		getParam(html, result, 'fio', /<div class="user_name">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'adress', /<div class="address docs-popover purple-tooltip" data-toggle="tooltip">\s*([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'account', /Лиц.счет:<\/strong>\s*([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'balance', /Баланс:<\/strong>\s*([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, '__tariff', /<span class="tariff">\s*([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'credit', /Обещанный платеж:<\/strong>\s*([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'block', /Состояние блокировки Вашего подключения">\s*([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'pay', /data-tariff-user-tcost="\s*([\s\S]*?)"/i, replaceTagsAndSpaces, parseBalance);
	}
    AnyBalance.setResult(result);	
}
