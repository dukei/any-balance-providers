
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://ul.yantarenergosbyt.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите номер лицевого счета!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	var form = getElement(html, /<form[^>]*id="autorization"[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}
		
	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'ls') {
			return prefs.login;
		} else if (name == 'pwd') {
			return prefs.password;
		} else if (name == 'vpb_captcha_code'){
		/*  //Вроде и без капчи пускает
			var img_url = getParam(form, null, null, /<img[^>]+src="([^"]*)[^>]*captchaimg/i, replaceHtmlEntities);
			var img = AnyBalance.requestGet(joinUrl(baseurl, img_url), addHeaders({Referer: AnyBalance.getLastUrl()}));
			return AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', img, {inputType: 'number'});
		*/
		}

		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'page.php?page=ul-org', params, AB.addHeaders({
		Referer: baseurl
	}));

	if (!/exit/i.test(html)) {
		var error = AB.getParam(html, null, null, /<div[^>]+login_response[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	AB.getParam(html, result, 'inn', /<input[^>]+name="inn"[^>]*value="([^"]*)/i, AB.replaceHtmlEntities);
	AB.getParam(html, result, 'name', /<input[^>]+name="short_name"[^>]*value="([^"]*)/i, AB.replaceHtmlEntities);
	AB.getParam(html, result, 'address', /<input[^>]+name="adress"[^>]*value="([^"]*)/i, AB.replaceHtmlEntities);

	html = AnyBalance.requestGet(baseurl + 'page.php?page=ul-svod', g_headers);

	var dogs = sumParam(html, null, null, /<input[^>]*class="dog_checkbox"[\s\S]*?<\/label>/ig);
	var dogids = [];
	for(var i=0; i<dogs.length; ++i){
		var id = getParam(dogs[i], null, null, /<input[^>]+id="([^"]*)/i);
		if(id == 'all')
			continue;
		var name = getElement(dogs[i], /<label[^>]*>/i, replaceTagsAndSpaces);
		AnyBalance.trace('Найден ' + name + ' (ID:' + id + ')');
		dogids.push(id);
	}

	getParam(dogids.length, result, 'num');
	
	html = AnyBalance.requestPost(baseurl + 'ajax.php', {
		action: 'showDataSvod',
		idDog: dogids.join('#'),
		dateFrom:getFormattedDate({offsetMonth: 7}),
		dateTo:getFormattedDate(),
		type: '0'
    }, addHeaders({Referer: baseurl + 'page.php?page=ul-svod'}));

	var tbl = getElement(html, /<table[^>]*svodTable[^>]*>/i);
	if(!tbl){
		AnyBalance.trace(html);
		throw AnyBalance.Error('Не удалось найти сводную таблицу');
	}

	tbl = tbl.replace(/<tr[^>]*>(?:[\s\S](?!<\/tr>))*?Итого[\s\S]*?<\/tr>/i, ''); //Убрали строку с Итого

	var data = [];

    var colsDef = {
        date_str: {
            re: /Месяц/i,
            result_func: null,
        },
        date: {
            re: /Месяц/i,
            result_func: parseDateWord,
        },
        balance_start: {
        	re: /Вх[^<]*кредит/i,
        	result_sum: true,
        	result_func: parseBalance
        },
        balance_start_debet: {
        	re: /Вх[^<]*дебет/i,
        	result_name: 'balance_start',
        	result_sum: true,
        	result_func: function(str){ return -(parseBalance(str) || 0) }
        },
        balance: {
        	re: /Исх[^<]*кредит/i,
        	result_sum: true,
        	result_func: parseBalance
        },
        balance_debet: {
        	re: /Исх[^<]*дебет/i,
        	result_name: 'balance',
        	result_sum: true,
        	result_func: function(str){ return -(parseBalance(str) || 0) }
        },
        spent: {
        	re: /Потреблено/i,
        },
        topay: {
        	re: /Начислено/i,
        },
        payed: {
        	re: /Оплачено/i,
        },
    };

    processTable(tbl, data, '__', colsDef);

	for(var i=data.length-1; i>=0; --i){
    	var r = data[i];
    	if(i == data.length-1){
    		getParam(r.__date_str, result, '__tariff');
    		getParam(r.__date, result, 'period');
    		getParam(r.__balance_start, result, 'balance_start');
    		getParam(r.__spent, result, 'spent');
     		getParam(r.__topay, result, 'topay');
    		getParam(r.__payed, result, 'payed');
   			getParam(r.__balance, result, 'balance');
    	}
	}

	if(AnyBalance.isAvailable('payment_date', 'payment_sum', 'payment_doc')){
		var maxdate = 0;

		for(var i=0; i<dogids.length; ++i){
			html = AnyBalance.requestPost(baseurl + 'ajax.php', {
				action: 'showDogInfo',
				idDog: dogids[i],
				typeInfo: 'doc',
				useDate: '1',
				dateFrom:getFormattedDate({offsetMonth: 13}),
				dateTo:getFormattedDate(),
				typePay: 'all'
    		}, addHeaders({Referer: baseurl + 'page.php?page=ul-doc'}));

			var tbl = getElement(html, /<table[^>]+id="pays"[^>]*>/i);
			var date = getParam(tbl, null, null, /<tbody[^>]*>(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);

			if(date > maxdate){
				maxdate = date;
				getParam(date, result, 'payment_date');
				getParam(tbl, result, 'payment_sum', /<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
				sumParam(tbl, result, 'payment_doc', /<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, null, aggregate_join);
				sumParam(tbl, result, 'payment_doc', /<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, null, aggregate_join);
			}
		}
	}


	AnyBalance.setResult(result);
}
