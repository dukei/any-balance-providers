/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main(){
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');

	// Если указан логин и пароль - заходим по нему и ищем наши объявления
	if(prefs.login && prefs.password) {
		AnyBalance.trace('Есть логин и пароль, заходим...');
		var baseurl = 'https://www.avito.ru/';
	
		var html = AnyBalance.requestGet(baseurl + 'profile', g_headers);
		
		html = requestPostMultipart(baseurl + 'profile', {
			'next': '/profile',
			login: prefs.login,
			password: prefs.password,
			quick_expire: 'on'
		}, addHeaders({Referer: baseurl + 'profile'}));	
		
		if (!/logout/i.test(html)) {
			var error = getParam(html, null, null, /class="error-description"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
			if (error && /Неправильная пара электронная почта/i.test(error)) throw new AnyBalance.Error(error, null, true);
			if (error) throw new AnyBalance.Error(error);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
		var req = prefs.pattern ? prefs.pattern : '';
		//                   (<div\s+class="[^"]*title"(?:[^>]*>){2}[^>]*Перейти на страницу объявления[^>]*>[^>]*АКПП tiptronik(?:[\s\S]*?<\/div){4})
		var re = new RegExp('(<div\\s+class=\\"[^\\"]*description\\"(?:[^>]*>){2}[^>]*Перейти на страницу объявления[^>]*>[^>]*'+ req +'(?:[\\s\\S]*?</div){4})', 'i');
		var div = getParam(html, null, null, re);
		if(!div)
			throw new AnyBalance.Error('Не удаётся найти ' + (prefs.pattern ? 'объявления с именем ' + prefs.pattern : 'ни одного объявления'));
		
		var result = {success: true};
	
		getParam(div, result, 'views', /Перейти на страницу объявления[^>]*просмотров:\s*(\d+)/i, replaceTagsAndSpaces, parseBalance);
		getParam(div, result, 'views_today', /Перейти на страницу объявления[^>]*просмотров:[^>]*сегодня\s+(\d+)/i, replaceTagsAndSpaces, parseBalance);
		//getParam(div, result, '__tariff', /Перейти на страницу объявления[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(div, result, 'adv_title', /Перейти на страницу объявления[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(div, result, 'price', /<p\s*class="[^"]*price">([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(div, result, ['currency', 'price'], /<p\s*class="[^"]*price">([^<]*)/i, replaceTagsAndSpaces, parseCurrency);
		getParam(div, result, 'days_left', /До истечения срока размещения осталось\s*(\d+)\s*д/i, replaceTagsAndSpaces, parseBalance);
		
		AnyBalance.setResult(result);
	// Если нет ни логина ни пароля - просто ищем объявление
	} else {
		var region = prefs.region;
		var pattern = prefs.pattern;

		var pattern1=pattern.replace(/ /g,"+");

		var baseurl = 'http://www.avito.ru/'+region+'?name='+pattern1;

		AnyBalance.trace('Starting search: ' + baseurl);
		var info = AnyBalance.requestGet(baseurl);	
		
		/*var error = $('#errHolder', info).text();
		if(error){
			throw new AnyBalance.Error(error);
		}*/		
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
	}
}