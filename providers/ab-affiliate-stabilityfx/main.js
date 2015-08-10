/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Провайдер инвестиционной программы StabilityFX
Сайт: http://stabilityfx.com
mailto:wtiger@mail.ru
*/

function main(){
	var prefs = AnyBalance.getPreferences();

//разлогиниться из кабинета 
//	var outinfo = AnyBalance.requestPost(baseurl + "cab.php", {
//		"logout": "1"
//	});

	throw new AnyBalance.Error("К сожалению, проект прекратил работу. Вы можете удалить этот провайдер. Все средства, остававшиеся в проекте, утрачены. Пожалуйста, не забывайте основные правила инвестирования: 1) Не вкладывайте последнее. 2) Не вкладывайте заемные средства. 3) Вкладывайте то, чего не боитесь потерять. 4) Всегда будьте готовы к форс-мажору. 5) Не кладите все яйца в одну корзину.");


	var baseurl = 'http://www.stabilityfx.com/';
	AnyBalance.setDefaultCharset('windows-1251');
//	AnyBalance.setDefaultCharset('utf-8');


	AnyBalance.trace('Authorizing...');
	var info = AnyBalance.requestPost(baseurl + "account.php", {
		"id": prefs.id,
		"pass": prefs.pass,
		"enter": "1"
	},
	{	"Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4",
		"User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64)"
	});

	var error = $('#errHolder', info).text();
	if(error){
		throw new AnyBalance.Error(error);
	}

	if(matches = info.match(/<form method="post" action="account.php">/i)){
		throw new AnyBalance.Error("Вероятно, введены неверные данные, поскольку вход в кабинет не удался.");}

	if(!(matches = info.match(/Личный кабинет/i))){
		throw new AnyBalance.Error("Ошибка получения данных.");}

	var result = {success: true};

	AnyBalance.trace('Parsing... ');

	result.__tariff=prefs.id;
	getParam(info, result, 'invested_total', /<td>Инвестировано<\/td>\s+<td>(.*?)\$<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'invested_process', /<td>Инвестировано \(в обработке\)<\/td>\s+<td>(.*?)\$<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'withdrawal', /<td>Выведено<\/td>\s+<td>(.*?)\$<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'profit', /<td>Прибыль по вкладу <\/td>\s+<td>(.*?)\$<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'profit_referral', /<td >Прибыль от рефералов<\/td>\s+<td>(.*?)\$<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'profit_total', /<td>Общая прибыль<\/td>\s+<td.*?>(.*?)\$<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'balance', /<td>Баланс счета<\/td>\s+<td.*?>(.*?)\$<\/td>/i, replaceTagsAndSpaces, parseBalance);

//	var outinfo = AnyBalance.requestPost(baseurl + "cab.php", {
//		"logout": "1"
//	});

	AnyBalance.setResult(result);
};

