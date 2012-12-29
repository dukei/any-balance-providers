/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Провайдер трекинга объявлений Slando.ru
Сайт оператора: http://slando.ru/
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	var region = prefs.region;
	var pattern = prefs.pattern;


	AnyBalance.trace('Selected region: ' + region);

	var pattern1=pattern.replace(" ","+");
	var baseurl = 'http://'+region+'.slando.ru/list/?q='+pattern1;
	AnyBalance.setDefaultCharset('utf-8');


	AnyBalance.trace('Starting search: ' + baseurl);
	var info = AnyBalance.requestGet(baseurl);

	var error = $('#errHolder', info).text();
	if(error){
		throw new AnyBalance.Error(error);
	}
    
	var result = {success: true};

	result.__tariff = pattern;

	if(AnyBalance.isAvailable('found') && (matches = info.match(/<li class="fleft">\s*<span class="fleft tab selected">\s*<span class="fbold">Продам<\/span>\s*<span class="color-2 normal">(\d+)<\/span>\s*<\/span>\s*<\/li>/i))){
		result.found = matches[1];
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
			AnyBalance.trace('See link to the last post: '+matches[1]);
	}

	if(AnyBalance.isAvailable('region') && (matches = info.match(/<span class="link hn"><span>\s*<strong>(.*?)<\/strong>\s*<\/span><\/span>/i))){
		result.region = matches[1];
	}

    
	if(matches = info.match(/<p style="color: red;">(.*?)<\/p>/i)){
		throw new AnyBalance.Error(matches[1]);
	}




	AnyBalance.setResult(result);
};






