/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс голосов вконтакте

Сайт оператора: http://vk.com
Личный кабинет: http://vk.com/settings?act=balance
*/

var g_headers = {
    Accept:'*/*',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru,en-US;q=0.8,en;q=0.6',
    Connection: 'keep-alive',
    Origin: 'https://vk.com',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.115 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://vk.com";

    var uid = AnyBalance.getData('remixttpid');
    if(uid){
        AnyBalance.trace('Найдена привязка к браузеру, восстанавливаем её.');
        AnyBalance.setCookie('.vk.com', 'remixttpid', uid);
    }

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
            throw new AnyBalance.Error(error, null, /проверьте правильность написания логина и пароля/i.test(error));
        throw new AnyBalance.Error('Не удалось зайти. Сайт изменен?');
    }

    if(/<input[^>]+id="authcheck_code"/i.test(html)){
        AnyBalance.trace('Требуется двухфакторная авторизация...');
        var _prompt = getParam(html, null, null, /<div[^>]+class="login_authcheck_info"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        var hash = getParam(html, null, null, /a_authcheck_code[^\}]*hash:\s*'([^']*)/, replaceSlashes);
        var code = AnyBalance.retrieveCode(_prompt, null, {inputType: 'number'});
        var referer = AnyBalance.getLastUrl();

        html = AnyBalance.requestPost(baseurl + '/al_login.php', {
        	act: 'a_authcheck_code',
        	al: '1',
        	code: code,
        	remember: 1,
        	hash: hash
        }, addHeaders({'X-Requested-With': 'XMLHttpRequest', Referer: referer}));

        var res = getVKResult(html);
        if(res.code != 4){
        	if(res.code != 8)
        		AnyBalance.trace(html);
        	throw new AnyBalance.Error(res.data ? replaceAll(res.data, replaceTagsAndSpaces) : 'Неизвестная ошибка. Сайт изменен?');
        }

        var uid = AnyBalance.getCookie('remixttpid');
        AnyBalance.setData('remixttpid', uid);
        AnyBalance.saveData();

        var url = res.data;
        if(!/^https?:/i.test(url))
        	url = baseurl + url;
            
        html = AnyBalance.requestGet(url, g_headers);
    }

    if(!/<b[^>]+id="balance_str"/i.test(html)){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось получить страницу голосов. Сайт изменен?');
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

function getVKResult(html){
	var a = html.split(/<!>/g);
	return {code: a[4], data: a[5]};
}