﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'Origin': 'http://www.podarok.rn-card.ru',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.podarok.rn-card.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите номер карты!');

	var html = AnyBalance.requestGet(baseurl + '?q=cabinet', g_headers);

	var formId = getParam(html, null, null, /name="form_build_id"[^>]*value="([^"]+)/i);
	
	html = AnyBalance.requestPost(baseurl + '?q=cabinet', {
		'number': prefs.login,
		'op': 'Отправить',
		'bonus': '',
		'form_build_id': formId,
		'form_id': '_forte_cabinet_form'
	}, addHeaders({Referer: baseurl + '?q=cabinet'}));

	if (!/name="bonus"[^>]*value="\d+"/i.test(html)) {
		var error = getParam(html, null, null, /Сообщение об ошибке(?:[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		
		throw new AnyBalance.Error('Не удалось получить данные по бонусам. Сайт изменен?');
	}
	var result = {success: true};
	
	getParam(html, result, 'balance', /Количество бонусов(?:[^>]*>){1}[^>]*value="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}