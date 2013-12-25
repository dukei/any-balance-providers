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

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
    // Проверяем правильность ввода даты рождения
    var matches = /^(\d{2})[^\d](\d{2})[^\d](\d{4})$/i.exec('' + prefs.birthday);
    if (!matches)
		throw new AnyBalance.Error('День рождения должен быть в формате DD-MM-YYYY, например, 28-04-1980');
		
    var birthdate = new Date(matches[2] + '/' + matches[1] + '/' + matches[3]);
	// Тут кроется возможная ошибка, если prefs.type == 0 у переменной matches не будет третьей группы, что вызовет падение на строке 39
	// Проверить пока не на чем, попробую сделать третью группу пустой в 26 строке
    if (prefs.type == 0) {
    	var url = 'http://www.mvideo-bonus.ru/personal/login';
    	matches = /(\d{4})(\d{4})()/.exec(prefs.card);
    } else {
    	var url = 'http://www.mvideo-bonus.ru/personal/cobrand';
    	matches = /(\d)(\d{4})(\d{3})/.exec(prefs.card);
    }
    if (!matches)
		throw new AnyBalance.Error('Номер карты не соответствует выбраному типу карты: ' + prefs.card);
	
    var html = AnyBalance.requestGet('http://www.mvideo-bonus.ru/');
    html = AnyBalance.requestPost(url, {
    	zip: prefs.zip,
    	num1: matches[1],
    	num2: matches[2],
    	num3: matches[3],
    	"birthdate[Date_Day]": addzero(birthdate.getDate()),
    	"birthdate[Date_Month]": addzero(birthdate.getMonth() + 1),
    	"birthdate[Date_Year]": birthdate.getFullYear(),
    }, addHeaders({
    	"Referer": "http://www.mvideo-bonus.ru/"
    }));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /class="errtx"[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error && /Неверная дата рождения/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
    // Скидка
    getParam(html, result, 'balance', /balance_summ"(?:[^>]*>){2}Итого:(?:[^>]*>){4}(\d+)/i, replaceTagsAndSpaces, parseBalance);
    //Баланс бонусных рублей
    getParam(html, result, 'balance_all', /Всего бонусных рублей(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    //Даты сгорания бонусных рублей
    sumParam(html, result, 'burn_date2', /<tr\s+class="drk"(?:[^>]*>){4}(\d+.\d+.\d{4})/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
    // Стратегия
    if (AnyBalance.isAvailable('strategy')) {
    	html = AnyBalance.requestGet('http://www.mvideo-bonus.ru/personal/edit/strategy/', g_headers);
    	getParam(html, result, '__tariff', /Выберите стратегию:[\s\S]*?<option[^>]*selected[^>]*>([^<]+)/i, replaceTagsAndSpaces);
    	getParam(result.__tariff, result, 'strategy');
    }
    // Дата последней операции по счету
    if (AnyBalance.isAvailable('last_date')) {
    	html = AnyBalance.requestGet('http://www.mvideo-bonus.ru/personal/detail/', g_headers);
    	getParam(html, result, 'last_date2', /<td[^>]*class="tdl"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    }
    AnyBalance.setResult(result);
}

function addzero(i) {
	return (i < 10) ? "0" + i : i;
}

function format_date(d, format) {
	var m;
	if (d[4] + d[5] == "01") {
		m = "янв";
	}
	if (d[4] + d[5] == "02") {
		m = "фев";
	}
	if (d[4] + d[5] == "03") {
		m = "мар";
	}
	if (d[4] + d[5] == "04") {
		m = "апр";
	}
	if (d[4] + d[5] == "05") {
		m = "май";
	}
	if (d[4] + d[5] == "06") {
		m = "июн";
	}
	if (d[4] + d[5] == "07") {
		m = "июл";
	}
	if (d[4] + d[5] == "08") {
		m = "авг";
	}
	if (d[4] + d[5] == "09") {
		m = "сен";
	}
	if (d[4] + d[5] == "10") {
		m = "окт";
	}
	if (d[4] + d[5] == "11") {
		m = "ноя";
	}
	if (d[4] + d[5] == "12") {
		m = "дек";
	}
	if (format == 1) {
		d = d[0] + d[1] + d[2] + d[3] + ' ' + m + ' ' + d[6] + d[7];
	} //          YYYY MMM DD
	if (format == 2) {
		d = d[6] + d[7] + ' ' + m + ' ' + d[0] + d[1] + d[2] + d[3];
	} //          DD MMM YYYY
	if (format == 3) {
		d = d[0] + d[1] + d[2] + d[3] + '-' + d[4] + d[5] + '-' + d[6] + d[7];
	} //          YYYY-MM-DD
	if (format == 4) {
		d = d[6] + d[7] + '-' + d[4] + d[5] + '-' + d[0] + d[1] + d[2] + d[3];
	} //          DD-MM-YYYY
	return d;
}