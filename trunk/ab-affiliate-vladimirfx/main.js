/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Провайдер партнерской программы Vladimirfx
Сайт: http://www.vladimirfx.com/
mailto:wtiger@mail.ru
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	var region = prefs.login;
	var pattern = prefs.pass;


//разлогиниться из кабинета 
//	var outinfo = AnyBalance.requestPost(baseurl + "cab.php", {
//		"logout": "1"
//	});

	var baseurl = 'https://www.vladimirfx.com/';
	AnyBalance.setDefaultCharset('utf-8');

	AnyBalance.trace('Authorizing...');
	var info = AnyBalance.requestPost(baseurl + "cab.php", {
		"login": prefs.login,
		"pass": prefs.pass,
		"enter": "1"
	});

	var error = $('#errHolder', info).text();
	if(error){
		throw new AnyBalance.Error(error);
	}

	var result = {success: true};
	result.__tariff=prefs.login;

	if(matches = info.match(/В доступе отказано/i)){
		throw new AnyBalance.Error("В доступе к сайту отказано.");}



	AnyBalance.trace('Parsing... '+info);

	if(AnyBalance.isAvailable('total_investors') && (matches = info.match(/<td>Всего инвесторов:<\/td><td><b>(\d+)<\/b><\/td>/i))){
			result.total_investors = parseFloat(matches[1]);
	}else {throw new AnyBalance.Error("Ошибка при разборе ответа с сайта: total_investors.");}

	if(AnyBalance.isAvailable('total_deposit') && (matches = info.match(/<td>Общий депозит:<\/td><td><b>(.*?)\$<\/b><\/td>/i))){
			result.total_deposit = parseFloat(matches[1]);
	}else {throw new AnyBalance.Error("Ошибка при разборе ответа с сайта: total_deposit.");}

	if(AnyBalance.isAvailable('average_week') && (matches = info.match(/<td>В среднем за неделю:<\/td><td><b>(.*?)%<\/b><\/td>/i))){
			result.average_week = parseFloat(matches[1]);
	}else {throw new AnyBalance.Error("Ошибка при разборе ответа с сайта: average_week.");}

	if(AnyBalance.isAvailable('average_month') && (matches = info.match(/<td>В среднем за месяц:<\/td><td><b>(.*?)%<\/b><\/td>/i))){
			result.average_month = parseFloat(matches[1]);
	}else {throw new AnyBalance.Error("Ошибка при разборе ответа с сайта: average_month.");}

	if(AnyBalance.isAvailable('all_time') && (matches = info.match(/<td>За всё время:<\/td><td><b>(.*?)%<\/b><\/td>/i))){
			result.all_time = parseFloat(matches[1]);
	}else {throw new AnyBalance.Error("Ошибка при разборе ответа с сайта: all_time.");}

	if(AnyBalance.isAvailable('trade_time') && (matches = info.match(/<td>Торговля ведётся:<\/td><td><b>(.*?) .*?<\/b><\/td>/i))){
			result.trade_time = parseFloat(matches[1]);
	}else {throw new AnyBalance.Error("Ошибка при разборе ответа с сайта: trade_time.");}


	if(AnyBalance.isAvailable('stocking_withdrawal') && (matches = info.match(/<b>Пополнение\/снятие:<\/b><\/td><td align="center">(.*?) USD<\/td>/i))){
			result.stocking_withdrawal = parseFloat(matches[1]);
	}else {throw new AnyBalance.Error("Ошибка при разборе ответа с сайта: stocking_withdrawal.");}

	if(AnyBalance.isAvailable('profit_deadloss') && (matches = info.match(/<b>Прибыль\/убыток:<\/b><\/td><td align="center">(.*?) USD\s*<\/td>/i))){
			result.profit_deadloss = parseFloat(matches[1]);
	}else {throw new AnyBalance.Error("Ошибка при разборе ответа с сайта: profit_deadloss.");}

	if(AnyBalance.isAvailable('balance') && (matches = info.match(/<b>Баланс:<\/b><\/td><td align="center">(.*?) USD\s*<\/td>/i))){
			result.balance = parseFloat(matches[1]);
	}else {throw new AnyBalance.Error("Ошибка при разборе ответа с сайта: balance.");}

	if(AnyBalance.isAvailable('max_percent') && (matches = info.match(/<b>Максимальный процент:<\/b><\/td><td align="center">(.*?)\%\s*<\/td>/i))){
			result.max_percent = parseFloat(matches[1]);
	}else {throw new AnyBalance.Error("Ошибка при разборе ответа с сайта: max_percent.");}

	if(AnyBalance.isAvailable('current_percent') && (matches = info.match(/<b>Ваш текущий процент:<\/b><\/td><td align="center">(.*?)\%\s*<\/td>/i))){
			result.current_percent = parseFloat(matches[1]);
	}else {throw new AnyBalance.Error("Ошибка при разборе ответа с сайта: current_percent.");}

//	var outinfo = AnyBalance.requestPost(baseurl + "cab.php", {
//		"logout": "1"
//	});

	AnyBalance.setResult(result);
};

