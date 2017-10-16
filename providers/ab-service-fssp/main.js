﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'*/*',
	'Accept-Language': 'ru,en;q=0.8',
	'Connection':'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.71 Safari/537.36',
	'Referer': 'http://fssprus.ru/iss/ip/',
	'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
};

function getCaptchaImage(e){
	var img = getParam(e, /<img[^>]+src="([^"]*)"[^>]*capchaVisual/i, [replaceHtmlEntities, /^.*?base64,/i, '']);
	return img;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://fssprus.ru/';
	var baseurl_api = 'http://is.fssprus.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.last_name, 'Введите Фамилию!');
	checkEmpty(prefs.first_name, 'Введите имя!');
	
	if(isset(prefs.birthdate))
		checkEmpty(prefs.birthdate, 'Введите дату рождения в формате ДД.ММ.ГГГГ!');
	
	// Прежде чем входить, вынем куки
	// Почему-то иногда падает, завернем
	try {
		AnyBalance.restoreCookies();
	} catch(e) {}
	
	var html = AnyBalance.requestGet(baseurl + 'iss/ip/', g_headers);
	
	var params = [
		// ['/ajax_search?url', 'iss/ajax_search'], 
		['system', 'ip'], 
		['is[extended]','1'],
		['is[variant]','1'],
		['is[region_id][0]',(prefs.region_id || '-1')],
		['is[last_name]', prefs.last_name],
		['is[first_name]',prefs.first_name],
		['is[patronymic]',(prefs.otchestvo || '')],
		['is[date]',(prefs.birthdate || '')],
		['nocache','1'],
		['is[sort_field]',''],
		['is[sort_direction]','']
	];
	
	var url = baseurl_api + 'ajax_search?' + createUrlEncodedParams(params);
	html = AnyBalance.requestGet(url, addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
	var json = getJson(html);
	html = json.data;
	
	var captchaa = json.data && getCaptchaImage(json.data);
	if(captchaa) {
		AnyBalance.trace('Пытаемся ввести капчу');
		captchaa = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', captchaa);
		AnyBalance.trace('Капча получена: ' + captchaa);
		
		params.push(['code', captchaa]);
		html = AnyBalance.requestGet(baseurl_api + 'ajax_search?' + createUrlEncodedParams(params), addHeaders({Referer: url, 'X-Requested-With': 'XMLHttpRequest'}));
		html = getJson(html).data;
	}

	if(!/<div[^>]+class="results"/i.test(html)){
		var error = getParam(html, /<div[^>]+class="empty"[^>]*>([^]*?)<\/div>/i, replaceTagsAndSpaces);
		if(error)
			throw new AnyBalance.Error(error, null, /не найден/i.test(html));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /search-found-tota[^>]*>\s*Найдено([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	if(/По вашему запросу ничего не найдено/i.test(html)) {
		getParam(0, result, 'balance');
		getParam(0, result, 'sum');
		getParam('По вашему запросу ничего не найдено', result, 'all');
	} else {
		getParam(html, /<table[^>]*class="list[\s\S]*?<\/table>/i, null, function(table) {
			// Сводка в html
			sumParam(table, result, 'sum', /[\d\s-.,]{3,}\s*руб/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			
			var rows = getElements(table, /<tr/ig);
			var all = [];
			for(i = 0; i < rows.length; i++) {
				var curRow = rows[i];

				var order = getParam(curRow, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
				var ammount = getParam(curRow, /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
				
				if(order && ammount)
					all.push('<b>' + order + ':</b> ' + ammount);
			}
			getParam(all.join('<br/>'), result, 'all');
		});		
	}
	
	AnyBalance.saveCookies();
	AnyBalance.saveData();
    AnyBalance.setResult(result);
}