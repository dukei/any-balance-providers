/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Провайдер инвестиционной программы AxiomLab
Сайт: http://www.invest-biznes.com/
mailto:wtiger@mail.ru
*/

function main(){
	var prefs = AnyBalance.getPreferences();

//разлогиниться из кабинета 
//	var outinfo = AnyBalance.requestPost(baseurl + "cab.php", {
//		"logout": "1"
//	});

	throw new AnyBalance.Error("К сожалению, проект прекратил работу. Вы можете удалить этот провайдер. Все средства, остававшиеся в проекте, утрачены. Пожалуйста, не забывайте основные правила инвестирования: 1) Не вкладывайте последнее. 2) Не вкладывайте заемные средства. 3) Вкладывайте то, чего не боитесь потерять. 4) Всегда будьте готовы к форс-мажору. 5) Не кладите все яйца в одну корзину.");

	var baseurl = 'http://www.invest-biznes.com';
	var form_build_id = '';
	var cabinet_link = '';
	AnyBalance.setDefaultCharset('utf-8');

	AnyBalance.trace('Requesting token...');
	var info = AnyBalance.requestGet(baseurl,
	{	"Accept-Charset": "UTF-8",
		"Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4",
		"User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64)"
	});

	var error = $('#errHolder', info).text();
	if(error){
		throw new AnyBalance.Error(error);
	}

	var result = {success: true};



	if(matches = info.match(/name="form_build_id" id="(.*?)" value="form/i)){
		form_build_id = matches[1];
		AnyBalance.trace('Token found: '+form_build_id);
	}else{
		throw new AnyBalance.Error("Token not found");
	}


	AnyBalance.trace('Authorizing...');
	var info = AnyBalance.requestPost(baseurl + "/main?destination=node%2F176", {
		"name": prefs.login,
		"pass": prefs.pass,
		"op": "Вход в систему",
		"form_build_id": form_build_id,
		"form_id": "user_login_block"
	},
	{	"Accept-Charset": "UTF-8",
		"Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4",
		"User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64)"
	});


	if(matches = info.match(/Неверный пароль/i)){
		throw new AnyBalance.Error("В доступе к сайту отказано.");}



	getParam(info, result, '__tariff', /<span class="prefix">Ваш ID<\/span><span class="data">(.*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);


	if(matches = info.match(/<li class="user-area"><a href="(.*?)">Вход в личный кабинет/i)){
		cabinet_link = matches[1];
		AnyBalance.trace('Cabinet found: '+cabinet_link);
	}else{
		throw new AnyBalance.Error("Cabinet not found");
	}


	AnyBalance.trace('Requesting cabinet...');
	var info = AnyBalance.requestGet(baseurl + cabinet_link,
	{	"Accept-Charset": "UTF-8",
		"Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4",
		"User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64)"
	});


	getParam(info, result, 'main_balance', /Ваш основной счет: (.*?) руб/i, [/\s+/g, '', replaceTagsAndSpaces], parseBalance);
	getParam(info, result, 'add_balance', /Ваши дополнительные счета: (.*?) руб/i, [/\s+/g, '', replaceTagsAndSpaces], parseBalance);
	result.balance = result.main_balance*1+result.add_balance*1;


//	var outinfo = AnyBalance.requestPost(baseurl + "cab.php", {
//		"logout": "1"
//	});

	AnyBalance.setResult(result);
};

