/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Провайдер инвестиционной программы Union Payment Services
Сайт: http://unionpaymentservices.com/
mailto:wtiger@mail.ru
*/

function main(){
	var prefs = AnyBalance.getPreferences();

//разлогиниться из кабинета 
//	var outinfo = AnyBalance.requestPost(baseurl + "cab.php", {
//		"logout": "1"
//	});

	var baseurl = 'https://unionpaymentservices.com/';
	AnyBalance.setDefaultCharset('utf-8');

	AnyBalance.trace('Authorizing...');
	var info = AnyBalance.requestPost(baseurl + "/ru/login", {
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

	var result = {success: true};

	if(matches = info.match(/Неверный пароль/i)){
		throw new AnyBalance.Error("В доступе к сайту отказано.");}


	AnyBalance.trace('Get info... ');

	var info = AnyBalance.requestGet(baseurl + "ru/cabinet/account",
	{	"Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4",
		"User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64)"
	});


	AnyBalance.trace('Parsing... ');

	result.__tariff=prefs.Login;
	getParam(info, result, 'withdrawal', /<span class="s1">Всего выведено<\/span><span class="s2">\$\s*(.*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'current_sum', /<span class="s1">Сумма текущих долей <\/span><span class="s2">\$\s*(.*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'total_income', /<span class="s1">Всего заработано<\/span><span class="s2">\$\s*(.*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'balance', /<span class="s1">Баланс<\/span><span class="s2">\$\s*(.*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);


//	var outinfo = AnyBalance.requestPost(baseurl + "cab.php", {
//		"logout": "1"
//	});

	AnyBalance.setResult(result);
};

