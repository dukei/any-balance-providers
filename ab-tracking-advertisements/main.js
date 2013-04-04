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


	var pattern1=pattern.replace(" ","+");

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

	if(AnyBalance.isAvailable('last') && (matches = info.match(/<div class="t_i_date">\s+(.*?)\s+<span class="t_i_time">(.*?)<\/span>[\s\S]*?<h3 class="t_i_h3">\s+<a .*?href="(.*?)".*?>\s+(.*?)<\/a>\s+<\/h3>\s+<div class="t_i_description">\s+<span>(.*?)<\/span>\s*<span>(.*?)<\/span>\s*<\/div>/i))){
			result.date = matches[1];
			result.time = matches[2];
			result.datetime = matches[1] + ' ' + matches[2];
			result.last = matches[4];
			result.price = matches[5].replace(new RegExp("&nbsp;",''),"");
			result.currency = matches[6];

			AnyBalance.trace('See link to the last post: http://www.avito.ru'+matches[3]);
	}else {throw new AnyBalance.Error("Ошибка при разборе ответа с сайта.");}

	AnyBalance.setResult(result);
};

