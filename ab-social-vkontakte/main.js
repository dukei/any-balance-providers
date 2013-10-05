/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс голосов вконтакте

Сайт оператора: http://vk.com
Личный кабинет: http://vk.com/settings?act=balance
*/

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Cache-Control':'max-age=0',
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "http://vk.com";

    var html = AnyBalance.requestGet(baseurl + '/settings?act=balance', g_headers);

/*  //Непонятно, зачем этот запрос. Пропускаем его  
    var html = AnyBalance.requestPost(baseurl + '/login.php', {
        op:'a_login_attempt',
        login:prefs.login
    }, g_headers);
    AnyBalance.trace(html);*/
    if(!prefs.dbg) {
		html = AnyBalance.requestPost("https://login.vk.com", {
			act:'login',
			to:getParam(html, null, null, /<input[^>]+name="to"[^>]*value="([^"]*)/i, null, html_entity_decode),
			_origin:baseurl, 
			ip_h:getParam(html, null, null, /<input[^>]+name="ip_h"[^>]*value="([^"]*)/i, null, html_entity_decode),
			email:prefs.login,
			pass:prefs.password,
			expire:''
		}, g_headers);
	}
	else
		html = AnyBalance.requestGet(baseurl + '/settings?act=balance', g_headers);
	
    if(!/\?act=logout/.test(html)){
        var error = getParam(html, null, null, /<div[^>]+id="message"[^>]*>([\s\S]*?)(?:<\/div>|<\/ul>)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти. Сайт изменен?');
    }
    var result = {success: true};
    getParam(html, result, 'balance', /<b[^>]+id="balance_str"[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
	
	if(isAvailable(['messages', 'new_friends', 'vk_name'])) {
		var href = getParam(html, null, null, /<a[^>]*href="([^"]*)[^>]*>[^>]*>\s*Моя Страница/i);
		html = AnyBalance.requestGet(baseurl + href, g_headers);
		getParam(html, result, 'messages', /<li[^>]*id="l_msg"(?:[^>]*>){5}([\s\S]*?)<\/span>(?:[^>]*>){3}\s*Мои\s*Сообщения\s*<\/span>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'new_friends', /<li[^>]*id="l_fr"(?:[^>]*>){5}([\s\S]*?)<\/span>(?:[^>]*>){3}\s*Мои\s*Друзья\s*<\/span>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'vk_name', /<title>([\s\S]*?)<\/title>/i, replaceTagsAndSpaces, html_entity_decode);
	}
	if(result.vk_name)
		result.__tariff = result.vk_name;
    
    AnyBalance.setResult(result);
}


