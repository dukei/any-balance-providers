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
	
	var baseurl = 'http://edu-nv.ru/onlajn-servis-shkolnoe-pitanie?resetfilters=0&clearordering=0&clearfilters=0';
	
	var html = AnyBalance.requestPost(baseurl, {
		'fabrik___filter[list_2_com_fabrik_2][value][0]':prefs.acc,
		'fabrik___filter[list_2_com_fabrik_2][condition][0]':'=',
		'fabrik___filter[list_2_com_fabrik_2][join][0]':'AND',
		'fabrik___filter[list_2_com_fabrik_2][key][0]':'`schol_pit`.`NomerLC`',
		'fabrik___filter[list_2_com_fabrik_2][search_type][0]':'normal',
		'fabrik___filter[list_2_com_fabrik_2][match][0]':'1',
		'fabrik___filter[list_2_com_fabrik_2][full_words_only][0]':'0',
		'fabrik___filter[list_2_com_fabrik_2][eval][0]':'0',
		'fabrik___filter[list_2_com_fabrik_2][grouped_to_previous][0]':'0',
		'fabrik___filter[list_2_com_fabrik_2][hidden][0]':'0',
		'fabrik___filter[list_2_com_fabrik_2][elementid][0]':'13',
		'option':'com_fabrik',
		'orderdir':'',
		'orderby':'',
		'view':'list',
		'listid':'2',
		'listref':'2_com_fabrik_2',
		'Itemid':'505',
		'fabrik_referrer':'/onlajn-servis-shkolnoe-pitanie?resetfilters=0&amp;clearordering=0&amp;clearfilters=0',
		'855b940861007eb46ea65db6d9382a36':'1',
		'format':'html',
		'packageId':'0',
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

	getParam(html, result, 'balanceSP', /Школьное питание [\s\S]*?Остаток на 01[\s\S]*?Остаток на [\s\S]*?<td class="schol_pit___saldoN fabrik_element fabrik_list_2_group_2" >([^<]+)[\s\S]*?<\/td/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'topaySP', /Школьное питание [\s\S]*?Остаток на 01[\s\S]*?Остаток на [\s\S]*?Сумма к оплате[\s\S]*?<td class="schol_pit___saldoN fabrik_element fabrik_list_2_group_2" >([^<]+)[\s\S]*?<\/td/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balanceGPD', /Группа продленного дня[\s\S]*Остаток на 01[\s\S]*Остаток на [\s\S]*?<td class="schol_pit___saldoN fabrik_element fabrik_list_2_group_2" >([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'topayGPD', /Группа продленного дня[\s\S]*Остаток на 01[\s\S]*Остаток на [\s\S]*Сумма к оплате[\s\S]*?<td class="schol_pit___saldoN fabrik_element fabrik_list_2_group_2" >([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	AnyBalance.trace(result);


	AnyBalance.setResult(result);
};


