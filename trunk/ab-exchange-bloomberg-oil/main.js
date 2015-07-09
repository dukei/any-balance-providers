﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.bloomberg.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl + 'energy/', g_headers);

	var result = {success: true};
	
	var type = prefs.type || 'WTI';
	var baseFind = type + '\\s*Crude(?:[^>]*>)';
	
	getParam(html, result, 'balance', new RegExp(baseFind + '{5}([^<]+)', 'i'), replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], new RegExp(baseFind + '{3}([^<]*)', 'i'), replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'change', new RegExp(baseFind + '{7}([^<]*)', 'i'), replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'change_pcts', new RegExp(baseFind + '{9}([^<]*)', 'i'), replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'contract', new RegExp(baseFind + '{11}([^<]*)', 'i'), replaceTagsAndSpaces);
	getParam(html, result, 'contract_time', new RegExp(baseFind + '{13}([^<]*)', 'i'), replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /<h2>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}