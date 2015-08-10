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

function getToken(html) {
	return getParam(html, null, null, /name=token[^>]*value=([0-9a-z]+)\s*>/i);
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://voip.intelnetcom.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
	var html = AnyBalance.requestGet(baseurl + 'user/index.php', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'user/info.php?check=1',{
		callerid:prefs.login,
		password:prefs.password,
		token:getToken(html),
		submit:'Войти'
	}, addHeaders({Referer: 'https://voip.intelnetcom.ru/user/index.php'})); 
	
    if(!/exit\.php/i.test(html)){
        var error = getParam(html, null, null, /<font color=RED>Ошибка[\s\S]*?>([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    var result = {success: true};
	
	getParam(html, result, 'id', /ID:[\s\S]*?align="right">([\s\S]*?)</i, null, html_entity_decode);
	getParam(html, result, 'balance', /Счет:[\s\S]*?align="right">([\s\S]*?)</i, null, parseBalance);
	getParam(html, result, 'dostup', /Доступ:[\s\S]*?align="right">([\s\S]*?)\s*</i, null, html_entity_decode);
	getParam(html, result, 'calls', /Всего звонков:[\s\S]*?align="right">([\s\S]*?)</i, null, parseBalance);
	//getParam(html, result, 'callstime', /Время:[\s\S]*?align="right">([\s\S]*?)</i, null, parseTime);
    getParam(html, result, 'fio', /ФИО:[\s\S]*?align=right>\s*([\s\S]*?)\s*</i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}