/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	Connection: 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.72 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.acc, 'Введите л/c школьника');
	
	AnyBalance.setDefaultCharset('UTF-8');
	
	var baseurl = 'http://edu-nv.ru/l-s-po-detyam/list/84?resetfilters=0';
	
	var html = AnyBalance.requestPost(baseurl, {
		'fabrik___filter[list_84_com_fabrik_84][value][0]':prefs.acc,
		'fabrik___filter[list_84_com_fabrik_84][condition][0]':'=',
		'fabrik___filter[list_84_com_fabrik_84][join][0]':'AND',
		'fabrik___filter[list_84_com_fabrik_84][key][0]':'`month_summ`.`NomerLC`',
		'fabrik___filter[list_84_com_fabrik_84][search_type][0]':'normal',
		'fabrik___filter[list_84_com_fabrik_84][match][0]':'1',
		'fabrik___filter[list_84_com_fabrik_84][eval][0]':'0',
		'fabrik___filter[list_84_com_fabrik_84][grouped_to_previous][0]':'0',
		'fabrik___filter[list_84_com_fabrik_84][hidden][0]':'0',
		'fabrik___filter[list_84_com_fabrik_84][elementid][0]':'845',
		'option':'com_fabrik',
		'orderdir':'',
		'orderby':'',
		'view':'list',
		'listid':'84',
		'listref':'84_com_fabrik_84',
		'Itemid':'513',
		'fabrik_referrer':'/l-s-po-detyam/list/84?resetfilters=0',
		'50c4b05da1a945968e059a12f8259a41':'1',
		'format':'html',
		'_packageId':'0',
		'task':'',
		'fabrik_listplugin_name':'',
		'fabrik_listplugin_renderOrder':'',
		'fabrik_listplugin_options':'',
		'incfilters':'1',
	}, g_headers);

	var error = getParam(html, null, null, /<div class="emptyDataMessage" style="">[\s\S]*Нет записей/, replaceTagsAndSpaces, html_entity_decode);
	if(error) {
		throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Нет записей для заданного л/с');
	};

	var result = {success: true};

	getParam(html, result, 'balanceSP', /Школьное питание [\s\S]*Остаток на 01[\s\S]*Остаток на [\s\S]*<td class="month_summ___saldoN fabrik_element fabrik_list_84_group_100" >([^<]+)[\s\S]*<td class="month_summ___saldoN fabrik_element fabrik_list_84_group_100" >[\s\S]*Группа продленного дня/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'topaySP', /Школьное питание [\s\S]*<td class="month_summ___saldoN fabrik_element fabrik_list_84_group_100" >([^<]+)[\s\S]*Группа продленного дня/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balanceGPD', /Группа продленного дня[\s\S]*Остаток на 01[\s\S]*Остаток на [\s\S]*<td class="month_summ___saldoN fabrik_element fabrik_list_84_group_100" >([^<]+)[\s\S]*<tr id="list_84_com_fabrik_84/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'topayGPD', /Группа продленного дня[\s\S]*Остаток на 01[\s\S]*Остаток на [\s\S]*<td class="month_summ___saldoN fabrik_element fabrik_list_84_group_100" >([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	AnyBalance.trace(result);


	AnyBalance.setResult(result);
};


