﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Connection': 'keep-alive',
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36',
	'Content-Type': 'application/x-www-form-urlencoded',
	'Accept-Encoding': 'gzip, deflate',
	'Accept-Language': 'en-US,en;q=0.8'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.smartutilities.com.mt/wps/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.userid, 'Input user ID');
	checkEmpty(prefs.password, 'Input password');
	
	var html = AnyBalance.requestGet(baseurl + 'portal/Public%20Area/wps.Login/!ut/p/b1/04_Sj9CPykssy0xPLMnMz0vMAfGjzOKd3Y0CzYzdfMwCzZ1dDRxNzHxdXPzDjAw8jYAKIoEKDHAARwNC-sP1o6BKHD1MzH0MDCx83E0NPB09QoMsA42NDRyNoQrwWOHnkZ-bql-QG2GQZeKoCABxOILM/dl4/d5/L2dJQSEvUUt3QS80SmtFL1o2X0NHQUg0N0wwMDhMRzUwSUFIVVI5UTMzMEU3/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
    var params = {
		'wps.portlets.userid': prefs.userid,
		'password': prefs.password,
		'ns_Z7_CGAH47L008LG50IAHUR9Q330U1__login': 'Log in'
    };
    // var loginurl = 'myportal/!ut/p/b0/04_Sj9CPykssy0xPLMnMz0vMAfGjzOKd3R09TMx9DAwsfNxNDTwdPUKDLAONjQ1czfULsh0VAW9IRPw!/';
    var loginurl = 'portal/Public%20Area/wps.Login/!ut/p/b1/04_Sj9CPykssy0xPLMnMz0vMAfGjzOKd3R09TMx9DAwsfNxNDTwdPUKDLAONjQ1czYEKIoEKDHAARwOofqNAM2M3H7NAc2dXA0cTM18XF_8wIwNPI6h-XBY4GhNnPx4LCOgP14_CqwTkArACPF7088jPTdUvyA0NjTDIMgEAMTbqew!!/dl4/d5/L0lDUWtpQ1NZSkNncFJBISEvb0VvZ0FFQ1FRREdJUXBTR0djRndUT0EhLzRHMGhSQjdRUjM1UWhTWkNuNnBoL1o3X0NHQUg0N0wwMDhMRzUwSUFIVVI5UTMzMFUxLzAvd3BzLnBvcnRsZXRzLmxvZ2lu/';
	html = AnyBalance.requestPost(baseurl + loginurl, params);

	if (!/Выход из системы/i.test(html) && !/Log out/i.test(html)) {
		var error = getParam(html, null, null, /class="wpsFieldSuccessText"[^>]*>([\s\S]*?<\/span>)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, true);
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	// Успешно вошли в систему - можно перейти на страницу с основной информацией    
	html = AnyBalance.requestGet(baseurl + 'myportal/!ut/p/b1/04_Sj9CPykssy0xPLMnMz0vMAfGjzOKd3Y0CzYzdfMw8Q11dDBxNfENcQr19DA28zfULsh0VAWCRPls!/');

	var result = {success: true};
	getParam(html, result, 'unpaiddate', /ExclamationRounded16x16([\s\S]*?<\/td>){2}/i, replaceTagsAndSpaces, parseDateWord);
	getParam(html, result, 'unpaidbilldatedue', /ExclamationRounded16x16([\s\S]*?<\/td>){3}/i, replaceTagsAndSpaces, parseDateWord);
	getParam(html, result, 'unpaidbillnumber', /ExclamationRounded16x16([\s\S]*?<\/td>){4}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'unpaidbilled', /ExclamationRounded16x16([\s\S]*?<\/td>){5}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'unpaidoutstanding', /ExclamationRounded16x16([\s\S]*?<\/td>){6}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'unpaidbillstatus', /ExclamationRounded16x16([\s\S]*?<\/td>){7}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'unpaiddaysoverdue', /ExclamationRounded16x16([\s\S]*?<\/td>){8}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'unpaidinterestacc', /ExclamationRounded16x16([\s\S]*?<\/td>){9}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'subtotal', /Payment Subtotal[\s\S]*?\/>/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}