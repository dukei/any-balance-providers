/**
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

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://fssprus.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.last_name, 'Введите Фамилию!');
	checkEmpty(prefs.first_name, 'Введите имя!');
	//checkEmpty(prefs.otchestvo, 'Введите отчество!');
	checkEmpty(prefs.birthdate, 'Введите дату рождения в формате ДД.ММ.ГГГГ!');
	
	var params = [
		['/ajax_search?url', 'iss/ajax_search'], 
		['system', 'ip'], 
		['is[extended]','1'],
		['is[variant]','1'],
		['is[region_id][0]',(prefs.region_id || '77')],
		['is[last_name]', prefs.last_name],
		['is[first_name]',prefs.first_name],
		['is[patronymic]',(prefs.otchestvo || '')],
		['is[date]',(prefs.birthdate || '')],
		['nocache','1'],
		['is[sort_field]',''],
		['is[sort_direction]',''],
		['nocache', '1']
	];
	
	var strParams = '';
	for(var i = 0; i < params.length; i++) {
		strParams += '&' + encodeURIComponent(params[i][0]) + '=' + encodeURIComponent(params[i][1]);
	}
	
	var url = baseurl + 'iss/ajax_search?' + strParams;
	var html = AnyBalance.requestGet(url, addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
	
	var captchaa = getParam(html, null, null, /<img\s*src=".([^"]*)/i);
	if(captchaa) {
		if(AnyBalance.getLevel() >= 7) {
			AnyBalance.trace('Пытаемся ввести капчу');
			//AnyBalance.setOptions({forceCharset:'base64'});
			var captcha = AnyBalance.requestGet(baseurl + captchaa);
			captchaa = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', captcha);
			//AnyBalance.setOptions({forceCharset:'utf-8'});
			AnyBalance.trace('Капча получена: ' + captchaa);
		} else {
			throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
		}
		
		html = AnyBalance.requestPost(url, {
			code:captchaa,
		}, addHeaders({Referer: url, 'X-Requested-With': 'XMLHttpRequest'}));
	}
	
	var table = getParam(html, null, null, /<table[^>]*class="list[\s\S]*?<\/table>/i);
	var result = {success: true, all:''};
	if(table) {
		getParam(html, result, 'balance', /Найдено([^\/]*)/i, replaceTagsAndSpaces, parseBalance);
		var rows = sumParam(table, null, null, /<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/tr>/ig, replaceTagsAndSpaces, html_entity_decode);
		for(i = 0; i < rows.length; i++) {
			result.all += rows[i] + '\n\n';
		}
		result.all = result.all.replace(/^\s+|\s+$/g, '');
		sumParam(table, result, 'sum', /[\d\s-.,]{3,}\s*руб/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	} else {
		var err = getParam(html, null, null, /class="empty"[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		if(!err)
			err = "Не найдено информации...";

		result.all = err;
	}
	
    AnyBalance.setResult(result);
}