/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Провайдер инвестиционной программы Union Payment Services
Сайт: http://unionpaymentservices.com/
      http://unionpaymentservices.net/
mailto:wtiger@mail.ru
*/

function main(){
	var prefs = AnyBalance.getPreferences();

//разлогиниться из кабинета 
//	var outinfo = AnyBalance.requestPost(baseurl + "cab.php", {
//		"logout": "1"
//	});


	throw new AnyBalance.Error("К сожалению, проект прекратил работу. Вы можете удалить этот провайдер. Все средства, остававшиеся в проекте, утрачены. Пожалуйста, не забывайте основные правила инвестирования: 1) Не вкладывайте последнее. 2) Не вкладывайте заемные средства. 3) Вкладывайте то, чего не боитесь потерять. 4) Всегда будьте готовы к форс-мажору. 5) Не кладите все яйца в одну корзину.");


	var baseurl;

	if(prefs.site==1){baseurl= 'https://unionpaymentservices.com/';}
	else{baseurl= 'https://unionpaymentservices.net/';}

	AnyBalance.setDefaultCharset('utf-8');

	AnyBalance.trace('Authorizing to '+baseurl+'...');
	var info = AnyBalance.requestPost(baseurl + "ru/login", {
		"Login": prefs.Login,
		"Pswd": prefs.Pswd
	},
	{	"Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4",
		"User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64)"
	});

	var error = $('#errHolder', info).text();
	if(error){
		throw new AnyBalance.Error(error);
	}

	if(matches = info.match(/Неверный пароль/i)){
		throw new AnyBalance.Error("В доступе к сайту отказано.");}

	var result = {success: true};


	AnyBalance.trace('Get info... ');

	var info = AnyBalance.requestGet(baseurl + "ru/cabinet/account",
	{	"Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4",
		"User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64)"
	});


	if(!(matches = info.match(/<h3>Общая информация<\/h3>/i))){
		throw new AnyBalance.Error("Ошибка при получении данных.");}


	AnyBalance.trace('Parsing... ');

	result.__tariff=prefs.Login;
	getParam(info, result, 'withdrawal', /<span class="s1">Всего выведено<\/span><span class="s2">\$\s*(.*?)<\/span>/i, [/\,/g, '', replaceTagsAndSpaces], parseBalance);
	getParam(info, result, 'current_sum', /<span class="s1">Сумма текущих долей <\/span><span class="s2">\$\s*(.*?)<\/span>/i, [/\,/g, '', replaceTagsAndSpaces], parseBalance);
	getParam(info, result, 'total_income', /<span class="s1">Всего заработано<\/span><span class="s2">\$\s*(.*?)<\/span>/i, [/\,/g, '', replaceTagsAndSpaces], parseBalance);
	getParam(info, result, 'balance', /<span class="s1">Баланс<\/span><span class="s2">\$\s*(.*?)<\/span>/i, [/\,/g, '', replaceTagsAndSpaces], parseBalance);
	getParam(info, result, 'terminals', /<p>Терминалов выкуплено - (\d+)<br>/i, replaceTagsAndSpaces, parseBalance);
	result.total_balance = result.balance + result.current_sum;


	if(AnyBalance.isAvailable('referal_total') || AnyBalance.isAvailable('referal_active') || AnyBalance.isAvailable('referal_balance')){

		info = AnyBalance.requestGet(baseurl + "ru/cabinet/affiliate",
		{	"Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4",
			"User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64)"
		});

		getParam(info, result, 'referal_total', /<tr><td>Всего рефералов<\/td><td>(.*?)<\/td><\/tr>/i, replaceTagsAndSpaces, parseBalance);
		getParam(info, result, 'referal_active', /<tr><td>Активных рефералов<\/td><td>(.*?)<\/td><\/tr>/i, replaceTagsAndSpaces, parseBalance);
		getParam(info, result, 'referal_balance', /<tr><td>Партнерское вознаграждение<\/td><td>(.*?)<\/td><\/tr>/i, [/\,/g, '', replaceTagsAndSpaces], parseBalance);
	}

	if(AnyBalance.isAvailable('order_status')){

		info = AnyBalance.requestGet(baseurl + "ru/cabinet/profile",
		{	"Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4",
			"User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64)"
		});

		getParam(info, result, 'order_status', /<p>Состояние договора <span.*?>\s+(\S+)\s+/i, replaceTagsAndSpaces, html_entity_decode);
	}

//	var outinfo = AnyBalance.requestPost(baseurl + "cab.php", {
//		"logout": "1"
//	});

	AnyBalance.setResult(result);
};

