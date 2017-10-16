﻿/**
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

    var uid = AnyBalance.getData ? AnyBalance.getData('remixttpid') : '';
    if(uid){
        AnyBalance.trace('Найдена привязка к браузеру, восстанавливаем её.');
        AnyBalance.setCookie('.vk.com', 'remixttpid', uid);
    }

    var html = AnyBalance.requestGet(baseurl + '/settings?act=payments', g_headers);

    var form = getElement(html, /<form[^>]+id="quick_login_form"[^>]*>/i);
    if(!form){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
    }
    	
	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'email') 
			return prefs.login;
		else if (name == 'pass')
			return prefs.password;

		return value;
	});

	html = AnyBalance.requestPost("https://login.vk.com/?act=login", params, g_headers);
	
    if(/act=authcheck/i.test(html)){
        AnyBalance.trace('Требуется двухфакторная авторизация...');

    	html = AnyBalance.requestGet(baseurl + '/login?act=authcheck', addHeaders({Referer: AnyBalance.getLastUrl()}));

        var _prompt = getParam(html, null, null, /<div[^>]+class="login_authcheck_info"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
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
        if(AnyBalance.getData){
        	AnyBalance.setData('remixttpid', uid);
        	AnyBalance.saveData();
        }

        var url = res.data;
        if(!/^https?:/i.test(url))
        	url = baseurl + url;
            
        html = AnyBalance.requestGet(url, g_headers);
    }

    if(!/onLoginDone|act=logout/.test(html)){
    	if(/onLoginFailed/.test(html))
    		throw new AnyBalance.Error('Не удается войти. Пожалуйста, проверьте правильность написания логина и пароля.', null, true);
    	AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти. Сайт изменен?');
    }

	html = AnyBalance.requestGet(baseurl + '/settings?act=payments', g_headers);

    if(!/<b[^>]+id="balance_str"/i.test(html)){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось получить страницу голосов. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'balance', /<b[^>]+id="balance_str"[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
    
    getParam(getElement(html, /<li[^>]+id="l_msg"[^>]*>/i), result, 'messages', /<span[^>]+left_count[^>]*>([\s\S]*?)<\/span>/i, [replaceTagsAndSpaces, /^$/, '0'], parseBalance);
	getParam(getElement(html, /<li[^>]+id="l_fr"[^>]*>/i), result, 'new_friends', /<span[^>]+left_count[^>]*>([\s\S]*?)<\/span>/i, [replaceTagsAndSpaces, /^$/, '0'], parseBalance);

	if(AnyBalance.isAvailable('friends_requests_in', 'friends_requests_out')){
		html = AnyBalance.requestGet(baseurl + '/friends?section=all_requests', g_headers);
    	getParam(getElement(html, /<a[^>]+out_requests/i), result, 'friends_requests_out', null, replaceTagsAndSpaces, parseBalance);
    	getParam(getElement(html, /<a[^>]+all_requests/i), result, 'friends_requests_in', null, replaceTagsAndSpaces, parseBalance);
	}
	
	if(isAvailable('vk_name')) {
		var href = getParam(html, null, null, /<a[^>]*href="([^"]*)[^>]*>[^>]*>\s*Моя Страница/i);
		html = AnyBalance.requestGet('https://m.vk.com', g_headers);
		result.vk_name = getElement(html, /<a\s[^>]*?class="[^"]*?\bop_owner\b/i, replaceTagsAndSpaces);
	}
	if(result.vk_name) {
		result.__tariff = result.vk_name;
            }
    
    AnyBalance.setResult(result);
}

function getVKResult(html){
	var a = html.split(/<!>/g);
	return {code: a[4], data: a[5]};
}