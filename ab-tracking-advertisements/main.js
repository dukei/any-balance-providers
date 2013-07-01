/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Провайдер трекинга объявлений Avito.ru
Сайт оператора: http://Avito.ru/
mailto:wtiger@mail.ru
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	var region = prefs.region;
	var pattern = prefs.pattern;

	var pattern1=pattern.replace(/ /g,"+");

	var baseurl = 'http://www.avito.ru/'+region+'?name='+pattern1;
	AnyBalance.setDefaultCharset('utf-8');

	AnyBalance.trace('Starting search: ' + baseurl);
	var info = AnyBalance.requestGet(baseurl);

	var error = $('#errHolder', info).text();
	if(error){
		throw new AnyBalance.Error(error);
	}

	var result = {success: true};
	result.__tariff=prefs.pattern;


	if(AnyBalance.isAvailable('found') && (matches = info.match(/<span class="catalog_breadcrumbs-count">,\s*(\d+?)\s*<\/span>/i))){
		result.found = matches[1];
	}else {throw new AnyBalance.Error("Ошибка при получении данных с сайта.");}

	if(AnyBalance.isAvailable('last') && (matches = info.match(/<div class="t_i_date">[\s\S]*?<div class="t_i_description">[\s\S]*?<\/div>/i))){
		info=matches[0];

		getParam(info, result, 'date', /<div class="t_i_date">\s+(\S*?)\s*<span/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(info, result, 'time', / <span class="t_i_time">(.*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(info, result, 'last', /<div class="t_i_title">\s*<.*?>\s*<a.*?>\s+(.*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(info, result, 'price', /<div class="t_i_description">\s+<span>(.*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
		getParam(info, result, 'currency', /<div class="t_i_description">\s+<span>.*?<\/span>\s*<span>(.*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

	}else {throw new AnyBalance.Error("Ошибка при разборе ответа с сайта.");}

	AnyBalance.setResult(result);
};

