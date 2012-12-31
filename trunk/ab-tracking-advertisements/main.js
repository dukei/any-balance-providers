/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Провайдер трекинга объявлений Slando.ru
Сайт оператора: http://slando.ru/
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	var region = prefs.region;
	var region_a = prefs.region_a;
	var pattern = prefs.pattern;


//Slando
	AnyBalance.trace('Selected region (Slando): ' + region);

	var pattern1=pattern.replace(" ","+");
	var baseurl = 'http://'+region+'.slando.ru/list/?q='+pattern1;

//Avito
	var baseurl_a = 'http://www.avito.ru/'+region_a+'?name='+pattern1;
	AnyBalance.setDefaultCharset('utf-8');

//Slando
	AnyBalance.trace('Starting search (Slando): ' + baseurl);
	var info = AnyBalance.requestGet(baseurl);

	var error = $('#errHolder', info).text();
	if(error){
		throw new AnyBalance.Error(error);
	}
    
	var result = {success: true};

	result.__tariff = pattern;

	if((AnyBalance.isAvailable('found') || AnyBalance.isAvailable('found_total')) && (matches = info.match(/<li class="fleft">\s*<span class="fleft tab selected">\s*<span class="fbold">Продам<\/span>\s*<span class="color-2 normal">(\d+)<\/span>\s*<\/span>\s*<\/li>/i))){
		result.found = parseInt(matches[1]);
	}

	var price=null;
	if(AnyBalance.isAvailable('last')){
		if(matches = info.match(/<p class="margintop10">\s*(.*?)\s*<\/p>/i)){
			result.date = matches[1];
			result.date=result.date.replace(new RegExp("<.*?>",'g')," ");
			result.date=result.date.replace(new RegExp("\s+",'g')," ");
		}
		if(matches = info.match(/<span class="fbold" >(.*?)<\/span>/i))
			result.last = matches[1];
		if(matches = info.match(/<p class="price large margintop10"><strong class="c000">(.*?)<\/strong>/i))
			price = matches[1];
		if(price!=null) result.last = result.last + " – " + price;
		if(matches = info.match(/<h3 class="large lheight20 margintop10">\s*<a href="(.*?)l" class="link linkWithHash clicker {clickerID:'ads_title'}">/i))
			AnyBalance.trace('See link to the last post (Slando): '+matches[1]);
	}

	if(AnyBalance.isAvailable('region') && (matches = info.match(/<span class="link hn"><span>\s*<strong>(.*?)<\/strong>\s*<\/span><\/span>/i))){
		result.region = matches[1];
	}

    
	if(matches = info.match(/<p style="color: red;">(.*?)<\/p>/i)){
		throw new AnyBalance.Error(matches[1]);
	}


//Avito
	AnyBalance.trace('Starting search (Avito): ' + baseurl_a);
	var info = AnyBalance.requestGet(baseurl_a);

	price=null;
	if((AnyBalance.isAvailable('found_a') || AnyBalance.isAvailable('found_total')) && (matches = info.match(/><span class="catalog_breadcrumbs-count">, (.*?)<\/span>/i))){
		result.found_a = parseInt(matches[1].replace("&nbsp;",""));
	}
	result.found_total = result.found + result.found_a;


	if(AnyBalance.isAvailable('last_a')){
		if(matches = info.match(/<div class="t_i_date">\s*(.*?)\s*<span class="t_i_time">(.*?)<\/span>\s*<\/div>/i)){
			result.date_a = matches[1] + ' ' + matches[2];
			result.date_a=result.date_a.replace(new RegExp("<.*?>",'g')," ");
			result.date_a=result.date_a.replace(new RegExp("\s+",'g')," ");
		}
		if(matches = info.match(/<div class="t_i_title">\s*<h3 class="t_i_h3">\s*<a name=.*?href="(.*?)".*?>\s*(.*?)<\/a>\s*<\/h3>/i)){
			result.last_a = matches[2];
			AnyBalance.trace('See link to the last post (Avito): http://www.avito.ru'+matches[1]);
		}
		if(matches = info.match(/<\/h3>\s*<p>\s*<span>(.*?)<\/p>/i)){
			price = matches[1].replace(new RegExp("<.*?>",'g')," ");
			result.last_a = result.last_a + " – " + price;
		}
	}

	AnyBalance.setResult(result);
};






