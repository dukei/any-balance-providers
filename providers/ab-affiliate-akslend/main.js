/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Провайдер инвестиционной программы AKSlend
Сайт: http://www.akslend.com
mailto:wtiger@mail.ru
*/

function main(){
	var prefs = AnyBalance.getPreferences();

	var baseurl = 'https://akslend.com';
//разлогиниться из кабинета 
//	var info = AnyBalance.requestGet(baseurl+"/cab/login?out");

	throw new AnyBalance.Error("К сожалению, проект прекратил работу. Вы можете удалить этот провайдер. Все средства, остававшиеся в проекте, утрачены. Пожалуйста, не забывайте основные правила инвестирования: 1) Не вкладывайте последнее. 2) Не вкладывайте заемные средства. 3) Вкладывайте то, чего не боитесь потерять. 4) Всегда будьте готовы к форс-мажору. 5) Не кладите все яйца в одну корзину.");


	var cert = '';
	var cabinet_link = '';
	var addos = '';
	AnyBalance.setDefaultCharset('utf-8');

	AnyBalance.trace('Requesting token...');
	var info = AnyBalance.requestGet(baseurl+"/cab/",
	{	"Accept-Charset": "UTF-8",
		"Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
		"Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4",
		"User-Agent": "User-Agent: Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.94 Safari/537.36",
		"Referer": baseurl + "/"
	});

	if(matches = info.match(/<input name="a-ddos" value="(.*?)" type="hidden">/i)){
		addos = matches[1];
		AnyBalance.trace('Antiddos token found: '+addos);

		AnyBalance.sleep(2000);
		info = AnyBalance.requestPost(baseurl + "/cab/", {
			"a-ddos": addos,
		},
		{	"Accept-Charset": "UTF-8",
			"Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
			"Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4",
			"User-Agent": "User-Agent: Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.94 Safari/537.36",
                        "Referer": baseurl + "/cab/"
		});
	}
	if(matches = info.match(/<input name="a-ddos" value="(.*?)" type="hidden">/i)){
		throw new AnyBalance.Error("Не пройдена защита от DDOS-атак. Попробуйте чуть позже.");}

	var error = $('#errHolder', info).text();
	if(error){
		throw new AnyBalance.Error(error);
	}

	AnyBalance.sleep(2000);

	if(matches = info.match(/<input name="__Cert" value="(.*?)" type="hidden">/i)){
		cert = matches[1];
		AnyBalance.trace('Token found: '+cert);
	}else{
		throw new AnyBalance.Error("Token not found");
	}

	AnyBalance.trace('Authorizing...');
	info = AnyBalance.requestPost(baseurl + "/cab/login", {
		"Login": prefs.Login,
		"Pass": prefs.Pass,
		"Remember": "",
		"URL": "",
		"__Cert": cert,
		"login_frm_btn": "Enter"
	},
	{	"Accept-Charset": "UTF-8",
		"Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
		"Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4",
		"User-Agent": "User-Agent: Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.94 Safari/537.36",
		"Referer": baseurl + "/cab/login"
	});


	if(matches = info.match(/<input name="a-ddos" value="(.*?)" type="hidden">/i)){
		addos = matches[1];
		AnyBalance.trace('Antiddos token found: '+addos);

		AnyBalance.sleep(2000);
		info = AnyBalance.requestPost(baseurl + "/cab/login", {
			"a-ddos": addos,
		},
		{	"Accept-Charset": "UTF-8",
			"Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
			"Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4",
			"User-Agent": "User-Agent: Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.94 Safari/537.36",
			"Referer": baseurl + "/cab/login"
		});
	}
	if(matches = info.match(/<input name="a-ddos" value="(.*?)" type="hidden">/i)){
		throw new AnyBalance.Error("Не пройдена защита от DDOS-атак. Попробуйте чуть позже.");}


	if(matches = info.match(/Неверный пароль/i)){
		throw new AnyBalance.Error("В доступе к сайту отказано.");}

	var result = {success: true};

	AnyBalance.sleep(2000);

	info = AnyBalance.requestGet(baseurl+"/cab/cabinet",
	{	"Accept-Charset": "UTF-8",
		"Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
		"Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4",
		"User-Agent": "User-Agent: Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.94 Safari/537.36",
		"Referer": baseurl + "/cab/login"
	});

	if(matches = info.match(/<input name="a-ddos" value="(.*?)" type="hidden">/i)){
		addos = matches[1];
		AnyBalance.trace('Antiddos token found: '+addos);

		AnyBalance.sleep(2000);
		info = AnyBalance.requestPost(baseurl + "/cab/cabinet", {
			"a-ddos": addos,
		},
		{	"Accept-Charset": "UTF-8",
			"Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
			"Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4",
			"User-Agent": "User-Agent: Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.94 Safari/537.36",
			"Referer": baseurl + "/cab/cabinet"
		});
	}
	if(matches = info.match(/<input name="a-ddos" value="(.*?)" type="hidden">/i)){
		throw new AnyBalance.Error("Не пройдена защита от DDOS-атак. Попробуйте чуть позже.");}

	getParam(info, result, 'main_access', /Ваш баланс<\/h2><table.*?><tr.*?tr><tr><td.*?td><td.*?>(.*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'main_busy', /Ваш баланс<\/h2><table.*?><tr.*?tr><tr><td.*?td><td.*?td><td.*?>(.*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'main_referral', /Ваш баланс<\/h2><table.*?><tr.*?tr><tr><td.*?td><td.*?td><td.*?td><td.*?>(.*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	result.__tariff = prefs.Login;
	result.balance = (result.main_access*1) + (result.main_busy*1);

//	var outinfo = AnyBalance.requestPost(baseurl + "cab.php", {
//		"logout": "1"
//	});
	AnyBalance.setResult(result);
};

