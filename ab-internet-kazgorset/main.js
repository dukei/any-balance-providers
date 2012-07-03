/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Провайдер Казгорсеть
Сайт оператора: http://kazgorset.ru/
*/

function main(){
	var prefs = AnyBalance.getPreferences();

	var baseurl = 'https://bill.kazgorset.ru/client/stat1/bgbilling/webexecuter';
	AnyBalance.setDefaultCharset('utf-8');



//разлогиниться из кабинета 
//	var outinfo = AnyBalance.requestGet(baseurl+'?action=Exit&mid=contract');


// Авторизуемся
	AnyBalance.trace('Authorizing by ' + baseurl);
	var info = AnyBalance.requestPost(baseurl, {
		"user": prefs.user,
		"pswd": prefs.pswd
	});
    
	var error = $('#errHolder', info).text();
	if(error){
		throw new AnyBalance.Error(error);
	}
    
	var result = {success: true};
	if(matches = info.match(/<error>\n(.*?)\n<\/error>/i)){
		throw new AnyBalance.Error(matches[1]);
	}

	result.__tariff=prefs.user;

//запрос баланса
	if(AnyBalance.isAvailable('balance')){
		AnyBalance.trace('Getting balance by ' + baseurl + '?action=ShowBalance&mid=contract');
		info = AnyBalance.requestGet(baseurl + '?action=ShowBalance&mid=contract');

		if(matches = info.match(/Исходящий остаток на конец месяца<\/th><td>(.*?)<\/td>/i)){
			result.balance = matches[1];
		}
	}

//module=dialup&mid=1&action=ShowLoginsBalance&pageIndex=1&unit=1048576&month=6&year=2012&day_from=1&day_to=31

	if(AnyBalance.isAvailable('traffic_outer') || AnyBalance.isAvailable('uptime') || AnyBalance.isAvailable('price')){
		var d = new Date();var n=d.getMonth()+1;var y=d.getYear()+1900;

		AnyBalance.trace('Getting uptime and traffic by ' +n+'/'+y+' (' + baseurl + '?module=dialup&mid=1&action=ShowLoginsBalance&pageIndex=1&unit=1048576&month='+n+'&year='+y+'&day_from=1&day_to=31)');

		info = AnyBalance.requestGet(baseurl + '?module=dialup&mid=1&action=ShowLoginsBalance&pageIndex=1&unit=1048576&month='+n+'&year='+y+'&day_from=1&day_to=31');
		if(matches = info.match(/<td>Итого:<\/td><td>.*?<\/td><td>(.*?)\s+\[.*?<\/td><td>(.*?)<\/td><td>(.*?)<\/td>/i)){
			result.uptime= matches[1];
			value=matches[2].replace(',','.');value=value.replace(' ','');
			result.price= parseFloat(value);
			value=matches[3].replace(',','.');value=value.replace(' ','');
			result.traffic_outer= parseFloat(value);
			AnyBalance.trace('WARNING! Statistics for current connection hasn\'t been showed.');
		}
		else{
			throw new AnyBalance.Error("Error getting statistics");
		}
	}

	if(AnyBalance.isAvailable('traffic_outer_last') || AnyBalance.isAvailable('uptime_last') || AnyBalance.isAvailable('price_last')){
		var d = new Date();var n=d.getMonth();var y=d.getYear()+1900;
		if(n==0){
			n=12;
			y=y-1;
		}

		AnyBalance.trace('Getting uptime and traffic by ' +n+'/'+y+' (' + baseurl + '?module=dialup&mid=1&action=ShowLoginsBalance&pageIndex=1&unit=1048576&month='+n+'&year='+y+'&day_from=1&day_to=31)');

		info = AnyBalance.requestGet(baseurl + '?module=dialup&mid=1&action=ShowLoginsBalance&pageIndex=1&unit=1048576&month='+n+'&year='+y+'&day_from=1&day_to=31');
		if(matches = info.match(/<td>Итого:<\/td><td>.*?<\/td><td>(.*?)\s+\[.*?<\/td><td>(.*?)<\/td><td>(.*?)<\/td>/i)){
			result.uptime_last= matches[1];
			value=matches[2].replace(',','.');value=value.replace(' ','');
			result.price_last= parseFloat(value);
			value=matches[3].replace(',','.');value=value.replace(' ','');
			result.traffic_outer_last= parseFloat(value);
		}
		else{
			throw new AnyBalance.Error("Error getting statistics");
		}
	}

	if(AnyBalance.isAvailable('delimiter')){

		AnyBalance.trace('Getting check period ' + baseurl + '?action=ShowPeriods&mid=1&module=dialup');

		info = AnyBalance.requestGet(baseurl + '?action=ShowPeriods&mid=1&module=dialup');
		if(matches = info.match(/<td>.*?<\/td><td>(.*?)<\/td>\s+<\/tr>\s+<\/tbody>/i)){
			result.delimiter = matches[1];
		}
	}

	AnyBalance.setResult(result);
};






