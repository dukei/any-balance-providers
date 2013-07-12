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

	if(matches = info.match(/ничего не найдено/i)){
		result.found = 0;
		AnyBalance.setResult(result);
		return;
	}

	result.found = getParam(info, null, null, /<span class="catalog_breadcrumbs-count">[,\s]*(.+?)\s*<\/span>/i, replaceTagsAndSpaces, parseBalance);

	if(result.found == null){throw new AnyBalance.Error("Ошибка при получении данных с сайта.");}

	if(AnyBalance.isAvailable('last') && (matches = info.match(/<div class="t_i_i (t_i_odd )?t_i_e_r">[\s\S]*?<div class="t_i_description">[\s\S]*?<\/div>/i))){
		info=matches[0];

		result.date = getParam(info, null, null, /<div class="t_i_date">\s+(\S*?)\s*<span/i, replaceTagsAndSpaces, html_entity_decode);
		result.time = getParam(info, null, null, / <span class="t_i_time">(.*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		if(result.date != null && result.time != null){result.datetime = result.date + ' ' + result.time;}
		else if(result.date != null){result.datetime = result.date;}
		else if(result.time != null){result.datetime = result.time;}

		getParam(info, result, 'last', /<a class="second-link".*?>\s+(.*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(info, result, 'price', /<div class="t_i_description">\s+<span>(.*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
		getParam(info, result, 'currency', /<div class="t_i_description">\s+<span.*?span>\s*<span>(.*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

	}else {throw new AnyBalance.Error("Ошибка при разборе ответа с сайта.");}

	AnyBalance.setResult(result);
};

