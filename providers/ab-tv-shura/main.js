﻿/**
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
	var baseurl = 'https://shura.tv/';
	AnyBalance.setDefaultCharset('Windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var url = baseurl + 'b/?_=' + Math.random();
	
	var cf = Cloudflare(url);
	var html = AnyBalance.requestGet(url, g_headers);
    if(cf.isCloudflared(html))
        html = cf.executeScript(html);
	
	var logonTries = 5;
	var cookie = getParam(html, null, null, /document\.cookie='_ddn_intercept_2_=([^';]+)/i);
	while(cookie && logonTries > 0) {
		logonTries--;
		AnyBalance.setCookie('shura.tv', '_ddn_intercept_2_', cookie);
		AnyBalance.setCookie('www.shura.tv', '_ddn_intercept_2_', cookie);
		
		html = AnyBalance.requestGet(baseurl + 'b/', addHeaders({'Referer': baseurl + 'b/',	'Cache-Control': 'max-age=0'}));
		cookie = getParam(html, null, null, /document\.cookie='_ddn_intercept_2_=([^';]+)/i);
	}
	
	html = AnyBalance.requestPost(baseurl + 'b/submit.php', {
		login: prefs.login,
		password: prefs.password,
		'action': 'login'
	}, addHeaders({Referer: baseurl + 'b/',	'X-Requested-With':'XMLHttpRequest'}));
	
	if (!/status:1/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Неверный логин-пароль или сайт изменен.');
	}
	
	html = AnyBalance.requestGet(baseurl + 'b/b.php', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', [/>Balance:(?:[^>]*>){1}([\s\d.,]+)/i, /Баланс:(?:[^>]*>){1}(-?[\s\d.,]+)/i], replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'requests', [/>Total requests:(?:[^>]*>){1}([\s\d.,]+)/i, /Всего запросов:(?:[^>]*>){1}(-?[\s\d.,]+)/i], replaceTagsAndSpaces, parseBalance);
	
	if(isAvailable(['pack_till', 'pack_till_name'])) {
		html = AnyBalance.requestGet(baseurl + 'b/b.php?page=bouquets', g_headers);
		
		getParam(html, result, 'pack_till', /<tr bgcolor="#ffdd99"(?:[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDateISO);
		getParam(html, result, 'pack_till_name', /<tr bgcolor="#ffdd99"(?:[^>]*>){5}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	}
	
	AnyBalance.setResult(result);
}