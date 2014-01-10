/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function getNthCol(name, col){
    return new RegExp(name + '(?:[\\s\\S]*?<td[^>]*>){' + col + '}([\\s\\S]*?)</td>', 'i');
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://bill.southtel.ru:8001/";

    var html = AnyBalance.requestPost(baseurl + 'login', {
		'user[login]':prefs.login,
		'user[password]':prefs.password
	});
	
	if(!/logout/i.test(html)){
        var error = getParam(html, null, null, /<h1[^>]*login_header[^>]*>[\s\S]*?<\/h1>([\s\S]*?)<h4/i, replaceTagsAndSpaces, html_entity_decode); 
        if(error){
            throw new AnyBalance.Error(error);
        }
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	// Кабинеты с одним номером и несколькими - абсолютно разные!!!
	if(prefs.num) {
		var table = getParam(html, null, null, /<table[^>]+id="accounts"[^>]*>([\s\S]*?)<\/table>/i);
		if(!table)
			throw new AnyBalance.Error('Не удалось найти таблицу лицевых счетов. Сайт изменен?');

		var first_tr = getParam(html, null, null, /<tr[^>]*>([\s\S]*?)<\/tr>/i);
		if(!first_tr)
			throw new AnyBalance.Error('Не удалось найти заголовка таблицы лицевых счетов. Сайт изменен?');

		var re = new RegExp('Лицевой счет №[^<]*(' + (prefs.num ? '\\d*' + prefs.num : '\\d+') + ')');
		var tds = sumParam(first_tr, null, null, /<td[^>]*>([\s\S]*?)<\/td>/ig);
		//Найдем, в какой колонке нужный лицевой счет
		var col = -1;
		var licschet = '';
		for(var i=0; i<tds.length; ++i){
			licschet = getParam(tds[i], null, null, re);
			if(licschet){
				col = i;
				break;
			}
		}
		// Если col < 0, то скорее всего это кабинет с одним номером
		if(col < 0)
			throw new AnyBalance.Error(prefs.num ? 'Не удалось найти лицевой счет с номером ' + prefs.num : 'Не удалось найти ни одного лицевого счета');

		var result = {success: true};
		getParam(licschet, result, 'licschet');
		getParam(table, result, 'balance', getNthCol('Свободные средства', col), replaceTagsAndSpaces, parseBalance);
		getParam(table, result, 'accbalance', getNthCol('Баланс', col), replaceTagsAndSpaces, parseBalance);
		getParam(table, result, 'blocked', getNthCol('Зарезервировано на(?:&nbsp;|\\s)*оплату услуг', col), replaceTagsAndSpaces, parseBalance);
		getParam(table, result, 'limit', getNthCol('Кредитный лимит', col), replaceTagsAndSpaces, parseBalance);
		var payinfo = getParam(table, null, null, getNthCol('Последний платеж', col), replaceTagsAndSpaces, html_entity_decode);
		if(payinfo){
			getParam(payinfo, result, 'lastpay', /\)(.*)$/, replaceTagsAndSpaces, parseBalance);
			getParam(payinfo, result, 'lastpaydate', /\((.*)\)/, replaceTagsAndSpaces, parseDate);
		}

		table = getParam(html, null, null, /Рекомендуемые платежи:\s*<table[^>]*>([\s\S]*?)<\/table>/i);
		if(table){
			getParam(table, result, 'recom', new RegExp('[CС]чет №' + licschet + '(?:[\\s\\S]*?<td[^>]*>){2}([\\s\\S]*?)</td>', 'i'),  replaceTagsAndSpaces, parseBalance);
		}

		//Тарифные планы
		table = getParam(html, null, null, /<table[^>]+id="docs"[^>]*>([\s\S]*?)<\/table>/i);
		if(table){
			var tr = getParam(table, null, null, new RegExp('<tr[^>]*>(?:[\\s\\S](?!</tr>))*?<td[^>]*>' + licschet + '[\\s\\S]*?</tr>', 'i'));
			if(tr){
				getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*?>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
				getParam(tr, result, 'agr', /(?:[\s\S]*?<td[^>]*?>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
			}
		}			
	// Это кабинет с одним номером.
	} else {
		var result = {success: true};
		
		getParam(html, result, 'licschet', /Лицевой счет №\D*(\d*)/i);
		getParam(html, result, 'balance', />Свободные средства(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'accbalance', />Баланс(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'blocked', />Зарезервировано на(?:&nbsp;|\s)*оплату услуг(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'limit', />Кредитный лимит(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	}
    AnyBalance.setResult(result);
}
