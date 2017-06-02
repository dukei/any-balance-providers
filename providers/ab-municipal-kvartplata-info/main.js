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
	var baseurl = 'https://lk.kvartplata.info/LK/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'Home/Login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl + 'Home/Login', {
		UserNameEmail: prefs.login,
		PasswordEntered: prefs.password
	}, addHeaders({Referer: baseurl + 'Home/Login'}));
	
	if (!/logout/i.test(html)) {
		var error = getElement(html, /<div[^>]+message-red/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var form = getParam(html, /<form[^>]+action="[^"]*AccountInfo"[^>]*>([\s\S]*?)<\/form>/i);
	var months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

	if(prefs.digits) {
		var accs = sumParam(getElement(form, /<select[^>]+AccauntNum/i), /<option[^>]+value="(\d+)/ig);
		if(!accs || accs.length < 1) {
			AnyBalance.trace(html);
			AnyBalance.trace('Не удалось найти счета в кабинете. Похоже на кабинет с одним счетом');
		}
		
		for(var i = 0; i < accs.length; i++) {
			AnyBalance.trace('Найден счет ' + accs[i]);
			if(endsWith(accs[i], prefs.digits)) {
				var account = accs[i];
				break;
			}
		}
		if(!account)
			throw new AnyBalance.Error('Не удалось найти счет с последними цифрами ' + prefs.digits);

		var dt = new Date();
		var params = createFormParams(form, function(params, str, name, value) {
			if (name == 'AccauntNum') 
				return account;
			else if (name == 'Month')
				return months[dt.getMonth()];
			else if (name == 'Year')
				return dt.getFullYear();
	    
			return value;
		});

		html = AnyBalance.requestPost(baseurl + 'Home/AccountInfo', params, addHeaders({Referer: baseurl + 'Home/Login'}));
	}

	var error;
	for(var i=1; i<=3; ++i){
		if(/Нет данных для лицевого счета/i.test(html)){
			error = getParam(html, null, null, /Нет данных для лицевого счета[^<]*/i);
			AnyBalance.trace(error);
			var dtNow = new Date();
			var dt = new Date(dtNow.getFullYear(), dtNow.getMonth()-i, dtNow.getDate());

			var params = createFormParams(form, function(params, str, name, value) {
				if (name == 'Month')
					return months[dt.getMonth()];
				else if (name == 'Year')
					return dt.getFullYear();
	        
				return value;
			});
			
			html = AnyBalance.requestPost(baseurl + 'Home/AccountInfo', params, addHeaders({Referer: baseurl + 'Home/Login'}));
		}else{
			break;
		}
	}

	if(i > 3)
		throw new AnyBalance.Error(error);
	
	var result = {success: true};

	var form = getParam(html, /<form[^>]+action="[^"]*AccountInfo"[^>]*>([\s\S]*?)<\/form>/i);
	var params = createFormParams(form);

	var data = getElements(html, [/<table/ig, /Плательщик/i])[0];
	
	getParam(data, result, 'balance', /Начислено[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalanceRK);
	getParam(html, result, 'debt', /((?:Вы не заплатили|Переплата на)[^<]*)/i, [/Переплата на/i, '-', replaceTagsAndSpaces], parseBalanceRK);
	getParam(params.Month + ' ' + params.Year, result, '__tariff');
	getParam(+new Date(params.Year, months.indexOf(params.Month), 15), result, 'period');
	getParam(data, result, 'fine', /Пеня[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalanceRK);
	getParam(html, result, 'payment', /Сумма к оплате:([^<]*)/i, replaceTagsAndSpaces, parseBalanceRK);
	getParam(html, result, 'prev_payment', /Оплачено ранее([^<]*)<\//i, replaceTagsAndSpaces, parseBalanceRK);
	getParam(params.AccauntNum, result, 'licschet');

	var countersTable = getElement(html, /<table[^>]+flat-counters-table/i);
	getParam(countersTable, result, 'cold_last_counter', /ХВС(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(countersTable, result, 'hot_last_counter', /ГВС(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

	
	AnyBalance.setResult(result);
}

function parseBalanceRK(_text) {
  var text = _text.replace(/\s+/g, '');
  var rub = getParam(text, /(-?\d[\d\.,]*)р/i, replaceTagsAndSpaces, parseBalance) || 0;
  var _sign = rub < 0 || /-\d[\d\.,]*р/i.test(text) ? -1 : 1;
  var kop = getParam(text, /(-?\d[\d\.,]*)к/i, replaceTagsAndSpaces, parseBalance) || 0;
  var val = _sign*(Math.abs(rub) + kop / 100);
  AnyBalance.trace('Parsing balance (' + val + ') from: ' + _text);
  return val;
}

