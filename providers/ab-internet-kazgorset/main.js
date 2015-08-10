/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.user, 'Введите логин!');
	checkEmpty(prefs.pswd, 'Введите пароль!');
	
	AnyBalance.setDefaultCharset('utf-8');
	var baseurl = 'https://bill.kazgorset.ru/client/stat1/bgbilling/webexecuter';
	//разлогиниться из кабинета
	if(prefs.dbg) {
		AnyBalance.trace('Дебаг: выходдим из кабинета...');
		var outinfo = AnyBalance.requestGet(baseurl + '?action=Exit&mid=contract');
	}
	// Авторизуемся
	AnyBalance.trace('Authorizing: ' + baseurl);
	var html = AnyBalance.requestPost(baseurl, {
		"user": prefs.user,
		"pswd": prefs.pswd
	});
	
	if (!/action=Exit/i.test(html)) {
		var error = getParam(html, null, null, [/<h2>(ОШИБКА[^<]+)/i, /<error>\n(.*?)\n<\/error>/i], replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неправильный пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	result.__tariff = prefs.user;
	//запрос баланса
	if(AnyBalance.isAvailable('balance')) {
		AnyBalance.trace('Getting balance by ' + baseurl + '?action=ShowBalance&mid=contract');
		html = AnyBalance.requestGet(baseurl + '?action=ShowBalance&mid=contract');
		
		getParam(html, result, 'balance', /Исходящий остаток на конец месяца([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	}
	//module=dialup&mid=1&action=ShowLoginsBalance&pageIndex=1&unit=1048576&month=6&year=2012&day_from=1&day_to=31
    if (AnyBalance.isAvailable('traffic_outer') || AnyBalance.isAvailable('uptime') || AnyBalance.isAvailable('price')) {
    	var d = new Date();
    	var n = d.getMonth() + 1;
    	var y = d.getYear() + 1900;
		
    	AnyBalance.trace('Getting uptime and traffic by ' + n + '/' + y + ' (' + baseurl + '?module=dialup&mid=1&action=ShowLoginsBalance&pageIndex=1&unit=1048576&month=' + n + '&year=' + y + '&day_from=1&day_to=31)');
    	
		html = AnyBalance.requestGet(baseurl + '?module=dialup&mid=1&action=ShowLoginsBalance&pageIndex=1&unit=1048576&month=' + n + '&year=' + y + '&day_from=1&day_to=31');
    	
		if (matches = html.match(/<td>Итого:<\/td><td>.*?<\/td><td>(.*?)\s+\[.*?<\/td><td>(.*?)<\/td><td>(.*?)<\/td>/i)) {
    		result.uptime = matches[1];
    		value = matches[2].replace(',', '.');
    		value = value.replace(' ', '');
    		result.price = parseFloat(value);
    		value = matches[3].replace(',', '.');
    		value = value.replace(' ', '');
    		result.traffic_outer = parseFloat(value);
    		AnyBalance.trace('WARNING! Statistics for current connection hasn\'t been showed.');
    	} else {
			AnyBalance.trace('Error getting statistics');
    		//throw new AnyBalance.Error("Error getting statistics");
    	}
    }
	
	if(AnyBalance.isAvailable('traffic_outer_last') || AnyBalance.isAvailable('uptime_last') || AnyBalance.isAvailable('price_last')){
		var d = new Date();var n=d.getMonth();var y=d.getYear()+1900;
		if(n==0){
			n=12;
			y=y-1;
		}

		AnyBalance.trace('Getting uptime and traffic by ' +n+'/'+y+' (' + baseurl + '?module=dialup&mid=1&action=ShowLoginsBalance&pageIndex=1&unit=1048576&month='+n+'&year='+y+'&day_from=1&day_to=31)');

		html = AnyBalance.requestGet(baseurl + '?module=dialup&mid=1&action=ShowLoginsBalance&pageIndex=1&unit=1048576&month='+n+'&year='+y+'&day_from=1&day_to=31');
		if(matches = html.match(/<td>Итого:<\/td><td>.*?<\/td><td>(.*?)\s+\[.*?<\/td><td>(.*?)<\/td><td>(.*?)<\/td>/i)){
			result.uptime_last= matches[1];
			value=matches[2].replace(',','.');value=value.replace(' ','');
			result.price_last= parseFloat(value);
			value=matches[3].replace(',','.');value=value.replace(' ','');
			result.traffic_outer_last= parseFloat(value);
		}
		else{
			AnyBalance.trace('Error getting statistics');
			//throw new AnyBalance.Error("Error getting statistics");
		}
	}
	
	if(AnyBalance.isAvailable('delimiter')){
		AnyBalance.trace('Getting check period ' + baseurl + '?action=ShowPeriods&mid=1&module=dialup');
		
		html = AnyBalance.requestGet(baseurl + '?action=ShowPeriods&mid=1&module=dialup');
		
		getParam(html, result, 'delimiter', /<td>.*?<\/td><td>(.*?)<\/td>\s+<\/tr>\s+<\/tbody>/i, replaceTagsAndSpaces, html_entity_decode);
	}
	
	AnyBalance.setResult(result);
};