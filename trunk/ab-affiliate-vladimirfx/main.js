/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Провайдер инвестиционной программы Vladimirfx.ru
Сайт: http://www.vladimirfx.ru/
mailto:wtiger@mail.ru
*/

function main(){
	var prefs = AnyBalance.getPreferences();

//разлогиниться из кабинета 
//	var outinfo = AnyBalance.requestPost(baseurl + "cab.php", {
//		"logout": "1"
//	});

	throw new AnyBalance.Error("К сожалению, проект прекратил работу. Вы можете удалить этот провайдер. Все средства, остававшиеся в проекте, утрачены. Пожалуйста, не забывайте основные правила инвестирования: 1) Не вкладывайте последнее. 2) Не вкладывайте заемные средства. 3) Вкладывайте то, чего не боитесь потерять. 4) Всегда будьте готовы к форс-мажору. 5) Не кладите все яйца в одну корзину.");

	var baseurl = 'https://www.vladimirfx.com/';
	AnyBalance.setDefaultCharset('utf-8');

	AnyBalance.trace('Authorizing...');
	var info = AnyBalance.requestPost(baseurl + "cab.php", {
		"login": prefs.login,
		"pass": prefs.pass,
		"enter": "2",
		"lang": "ru"
	},
	{	"Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4",
		"User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64)"
	});

	var error = $('#errHolder', info).text();
	if(error){
		throw new AnyBalance.Error(error);
	}

	var result = {success: true};

	if(matches = info.match(/В доступе отказано/i)){
		throw new AnyBalance.Error("В доступе к сайту отказано.");}


	AnyBalance.trace('Parsing... ');

	getParam(info, result, '__tariff', /Инвестиционный счет \#(.*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'total_investors', /<td>Всего инвесторов:<\/td><td><b>(\d+)<\/b><\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'total_deposit', /<td>Общий депозит:<\/td><td><b>(.*?)\$<\/b><\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'average_week', /<td>В среднем за неделю:<\/td><td><b>(.*?)%<\/b><\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'average_month', /<td>В среднем за месяц:<\/td><td><b>(.*?)%<\/b><\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'all_time', /<td>За всё время:<\/td><td><b>(.*?)%<\/b><\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'trade_time', /<td>Торговля ведётся:<\/td><td><b>(.*?) .*?<\/b><\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'stocking_withdrawal', /<b>Пополнение\/снятие:<\/b><\/td><td align="center">(.*?) USD<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'profit_deadloss', /<b>Прибыль\/убыток:<\/b><\/td><td align="center">(.*?) USD\s*<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'balance', /<b>Баланс:<\/b><\/td><td align="center">(.*?) USD\s*<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'term_days', /<b>Срок вклада \(суток\):<\/b><\/td><td align="center">(.*?)\s+.*?<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'term_percent', /<b>Срок вклада \(суток\):<\/b><\/td><td align="center">.*?\s+\((.*?)\%\)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'max_percent', /<b>Максимальный процент:<\/b><\/td><td align="center">(.*?)\%\s*<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'current_percent', /<b>Ваш текущий процент:<\/b><\/td><td align="center">(.*?)\%\s*<\/td>/i, replaceTagsAndSpaces, parseBalance);


//	var outinfo = AnyBalance.requestPost(baseurl + "cab.php", {
//		"logout": "1"
//	});

	AnyBalance.setResult(result);
};

