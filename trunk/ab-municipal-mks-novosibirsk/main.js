/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://mks-novosibirsk.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
/*	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});
*/	
	var html = AnyBalance.requestPost(baseurl + 'component/kabinet/index.php?option=com_kabinet&task=auth', {
		login: prefs.login,
		password: prefs.password
	}, addHeaders({Referer: baseurl + 'component/kabinet/index.php?option=com_kabinet&task=auth'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};

	html = AnyBalance.requestGet(baseurl + 'component/kabinet/?task=detail', g_headers);
	getParam(html, result, 'fio', /<p[^>]*>ФИО[\s\S]*?<td[^>]*>([\s\S]*?)(?:<\/p>|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'licschet', /<p[^>]*>Номер лицевого счёта[\s\S]*?<td[^>]*>([\s\S]*?)(?:<\/p>|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'kod', /<p[^>]*>Код оплаты[\s\S]*?<td[^>]*>([\s\S]*?)(?:<\/p>|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /<p[^>]*>Ваша задолженность[\s\S]*?<td[^>]*>([\s\S]*?)(?:<\/p>|<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /<p[^>]*>Номер лицевого счёта[\s\S]*?<td[^>]*>([\s\S]*?)(?:<\/p>|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);

	html = AnyBalance.requestGet(baseurl + 'component/kabinet/?task=trans', g_headers);
	var years = getElements(html, /<div[^>]+id="y\d{4}"[^>]*>/ig);
	if(years.length){
		var year = years[years.length-1];
		var yearD = getParam(year, null, null, /id="y(\d+)/i, null, parseBalance);
		AnyBalance.trace('Есть начисления в ' + yearD + ' году...'); 

		var months = getElements(year, /<div[^>]+class="h_month"[^>]*>/ig);
		if(months.length){
			var month = months[months.length-1];
			AnyBalance.trace('Последнее начисление ' + getParam(month, null, null, null, replaceTagsAndSpaces, html_entity_decode)); 
			
			var id = getParam(month, null, null, /id="(bm\d+)/i);
			var sumRegExp = new RegExp("#" + id + '[\\s\\S]*?(Math.round\\([^)]*\\))', 'i');
			
			getParam(html, result, 'bill', sumRegExp, [/^/, 'return '], safeEval);
			sumParam(month, result, '__tariff', null, [/$/i, yearD, replaceTagsAndSpaces], html_entity_decode, aggregate_join);
			getParam(month, result, 'period', null, [/$/i, yearD, replaceTagsAndSpaces], parseDateWord);
		}else{
			AnyBalance.trace('Начисления по месяцам отсутствуют'); 
		}
	}else{
		AnyBalance.trace('Ни одного начисления не найдено: ' + html);
	} 
	
	AnyBalance.setResult(result);
}