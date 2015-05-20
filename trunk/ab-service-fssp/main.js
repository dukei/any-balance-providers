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
		['is[sort_direction]',''],
	];
	
	var strParams = '';
	for(var i = 0; i < params.length; i++) {
		strParams += '&' + encodeURIComponent(params[i][0]) + '=' + encodeURIComponent(params[i][1]);
	}
	
	var url = baseurl + 'iss/ajax_search?' + strParams;
	html = AnyBalance.requestGet(url, addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
	
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
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /search-found-tota[^>]*>\s*Найдено([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	if(/По вашему запросу ничего не найдено/i.test(html)) {
		getParam(0, result, 'balance');
		getParam(0, result, 'sum');
		getParam('По вашему запросу ничего не найдено', result, 'all');
	} else {
		getParam(html, null, null, /<table[^>]*class="list[\s\S]*?<\/table>/i, null, function(table) {
			// Сводка в html
			sumParam(table, result, 'sum', /[\d\s-.,]{3,}\s*руб/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			
			var rows = sumParam(table, null, null, /(<tr[^>]*>[\s\S]*?<\/tr>)/ig);
			var all = [];
			for(i = 0; i < rows.length; i++) {
				var curRow = rows[i];

				// var name = getParam(curRow, null, null, /<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
				var order = getParam(curRow, null, null, /(?:[\s\S]*?<td>){2}([^<]+)/i, replaceTagsAndSpaces);
				// var order = getParam(curRow, null, null, /(?:[\s\S]*?<td>){3}([^<]+)/i, replaceTagsAndSpaces);
				var ammount = getParam(curRow, null, null, /(?:[\s\S]*?<td>){4}([^<]+)/i, replaceTagsAndSpaces);
				
				if(order && ammount)
					all.push('<b>' + order + ':</b> ' + ammount);
			}
			getParam(all.join('<br/><br/>'), result, 'all');
		});		
	}
	
	AnyBalance.saveCookies();
	AnyBalance.saveData();
    AnyBalance.setResult(result);
}