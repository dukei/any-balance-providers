
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
	var baseurl = 'https://fl.yantarenergosbyt.ru/';
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
		/* //Вроде пускает и без капчи
			var img_url = getParam(form, null, null, /<img[^>]+src="([^"]*)[^>]*captchaimg/i, replaceHtmlEntities);
			var img = AnyBalance.requestGet(joinUrl(baseurl, img_url), addHeaders({Referer: AnyBalance.getLastUrl()}));
			return AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', img, {inputType: 'number'});
		*/
		}

		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'page.php?page=lk-ls-info', params, AB.addHeaders({
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

	AB.getParam(html, result, 'licschet', /Номер счета:([^<]*)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'fio', /Гражданин-потребитель:([^<]*)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'address', /<div[^>]+info-text[^>]*12pt[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);

	html = AnyBalance.requestGet(baseurl + 'page.php?page=lk-period-pay', g_headers);
	var tbl = getElements(html, [/<table[^>]*>/ig, /Начисления и платежи на период/i])[0];
	if(!tbl){
		AnyBalance.trace(html);
		throw AnyBalance.Error('Не удалось найти таблицу начислений');
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
        	re: /Входящее сальдо/i,
        },
        spent: {
        	re: /Начислено/i,
        },
        payment_date: {
        	re: /Дата платежа/i,
            result_func: parseDate,
        },
        payment_sum: {
        	re: /Сумма платежа/i,
        },
        balance: {
        	re: /Исходящее сальдо/i,
        },
        payment_source: {
        	re: /Источник оплаты/i,
            result_func: null,
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
    		getParam(r.__balance, result, 'balance');
    	}
		if(r.__payment_date){
    		getParam(r.__payment_date, result, 'payment_date');
    		getParam(r.__payment_sum, result, 'payment_sum');
    		getParam(r.__payment_source, result, 'payment_source');
    		break;
    	}
	}

	AnyBalance.setResult(result);
}
