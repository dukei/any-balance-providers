/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'utf-8, iso-8859-1, utf-16, *;q=0.7',
	'Accept-Language':'ru-RU, en-US',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Linux; U; Android 4.0.4; ru-ru; Android SDK built for x86 Build/IMM76D) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
	'Origin':'http://m.turkcell.com.tr/',
};

function requestBonuses() {
	return AnyBalance.requestPost('http://m.turkcell.com.tr/accountremainingusage.json?t2=' + new Date().getTime(), {
		'title':'TURKCELL - Hat Özetim',
		'uri':'/accountsummary.aspx',
	}, addHeaders({Referer: 'http://m.turkcell.com.tr/accountsummary.aspx', Accept: 'application/json, text/javascript, */*; q=0.01'}));
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://m.turkcell.com.tr/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Enter login!');
	checkEmpty(prefs.password, 'Enter password!');
	
	var html = AnyBalance.requestGet(baseurl + 'giris', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'msisdn') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});	
	
	html = AnyBalance.requestPost(baseurl + 'giris', params, addHeaders({Referer: baseurl + 'giris'}));
	
	var re = new RegExp('media__number(?:[^>]*>){1}[^<]*'+prefs.login, 'i');
	
	if(!re.exec(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Can`t login? Is the site changed?');
	}
	
	var result = {success: true};
	// Одинаковые данные для всех линий
	getParam(html, result, 'balance', /class="price"(?:[^>]*>){2}([^<]*TL)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /"media__title text-satura"(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'phone', /"media__number"(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
	// Пакеты
	if(isAvailable(['sms_days', 'sms_left', 'sms_total', 'sms_used', 
		'minutes_local_days', 'minutes_local_left', 'minutes_local_total', 'minutes_local_used', 
		'minutes_days', 'minutes_left', 'minutes_total', 'minutes_used', 
		'minutes_group_total', 'minutes_group_used', 'minutes_group_left', 
		'data_days', 'data_left', 'data_total', 'data_used'])) {
		
		html = AnyBalance.requestGet(baseurl + 'hesabim', g_headers);

		sumParam(html, result, 'minutes_local_total', /class="media__body"(?:[\s\S]*?<\/div)(?:[^>]*>){2}TURKCELL'LİLERLE\s*-([^<]*DK)/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
		sumParam(html, result, 'minutes_local_used', /([\d.,]+)(?:<[^<]*){6}TURKCELL'LİLERLE[^<]*DK/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
		sumParam(html, result, 'minutes_local_left', /([\d.,]+)(?:<[^<]*){13}TURKCELL'LİLERLE[^<]*DK/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
		
		sumParam(html, result, 'minutes_total', /class="media__body"(?:[\s\S]*?<\/div)(?:[^>]*>){2}HER YÖNE\s*-([^<]*DK)/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
		sumParam(html, result, 'minutes_used', /([\d.,]+)(?:<[^<]*){6}HER YÖNE[^<]*DK/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
		sumParam(html, result, 'minutes_left', /([\d.,]+)(?:<[^<]*){13}HER YÖNE[^<]*DK/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
		
		sumParam(html, result, 'minutes_group_total', /class="media__body"(?:[\s\S]*?<\/div)(?:[^>]*>){2}GRUP[^-]*-([^<]*DK)/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
		sumParam(html, result, 'minutes_group_used', /([\d.,]+)(?:<[^<]*){6}GRUP[^<]*DK/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
		sumParam(html, result, 'minutes_group_left', /([\d.,]+)(?:<[^<]*){13}GRUP[^<]*DK/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
		// Интернет 
		var dataTable = getParam(html, null, null, /<h3(?:[^>]*>){3}\s*İNTERNET\s*<\/h3>\s*<div[^>]*data-toggle="carousel"[\s\S]*?<\/ul>/i, [/<!--[\s\S]*?-->/ig, '']);
		if(dataTable) {
			sumParam(dataTable, result, 'data_used', /((?:<[^<]*){2})(?:[^>]*>){1}MB KULLANILDI/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
			sumParam(dataTable, result, 'data_left', /((?:<[^<]*){2})(?:[^>]*>){1}MB KALDI/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
			if(isset(result.data_left) && isset(result.data_used))
				getParam(result.data_left+result.data_used, result, 'data_total');
		}
		// SMS
		var smsTable = getParam(html, null, null, /<h3(?:[^>]*>){3}\s*SMS\s*<\/h3>\s*<div[^>]*data-toggle="carousel"[\s\S]*?<\/ul>/i, [/<!--[\s\S]*?-->/ig, '']);
		if(smsTable) {
			sumParam(smsTable, result, 'sms_used', /((?:<[^<]*){2})(?:[^>]*>){1}ADET KULLANILDI/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
			sumParam(smsTable, result, 'sms_left', /((?:<[^<]*){2})(?:[^>]*>){1}ADET KALDI/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
			if(isset(result.sms_left) && isset(result.sms_used))
				getParam(result.sms_left+result.sms_used, result, 'sms_total');
		}		
	}
	
	
	// Предоплата
	if(true) {
		
	// Постоплата
	} else {
		if(isAvailable(['balance', 'fio', 'phone', 'deadline'])) {
			html = AnyBalance.requestGet('http://m.turkcell.com.tr/faturam.aspx', addHeaders({'X-Requested-With':'XMLHttpRequest', Referer: 'http://m.turkcell.com.tr/InvoiceLogin.aspx?ReturnUrl=/faturam.aspx'}));
			
			getParam(html, result, 'balance', /Güncel Fatura Tutarınız(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
			
			getParam(html, result, 'fio', /"clsCustName"(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(html, result, 'phone', /"clsCustTel"(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(html, result, 'deadline', /Son Ödeme Tarihi(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseDate);
		}	
		// Пакеты минут
		if(isAvailable(['sms_days', 'sms_left', 'sms_total', 'sms_used', 'minutes_local_days', 'minutes_local_left', 'minutes_local_total', 'minutes_local_used', 'minutes_days', 'minutes_left', 'minutes_total', 'minutes_used', 'data_days', 'data_left', 'data_total', 'data_used'])) {
			html = requestBonuses();

			var json = getJson(html);
			// Не бросаем исключение! Может есть только баланс?
			if(json && json.success == 'true') {
				// Остаток СМС
				var sms = json.sms;
				if(sms) {
					//AnyBalance.trace('Found sms ' + sms);
					// Это смс кому угодно, могут быть еще и внутри сети
					var total = sumParam(sms, null, null, /class="info"[^>]*>\s*\d+\s*\/\s(\d*)\s*ADET(?:[^>]*>){4}SMSHeryone/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
					var used = sumParam(sms, null, null, /class="info"[^>]*>\s*(\d+)\s*\/\s\d*\s*ADET(?:[^>]*>){4}SMSHeryone/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
					sumParam(sms, result, 'sms_days', /Kalan Gün[^\d]*(\d+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_min);
					
					if(total >= 0 && used >= 0) {
						getParam(total-used, result, 'sms_left');
						getParam(total, result, 'sms_total');
						getParam(used, result, 'sms_used');
					} else {
						AnyBalance.trace('Can`t parse sms, contact the developer, please!');
					}
				}
				// Остаток минут
				var minutes = json.voice;
				if(minutes) {
					//AnyBalance.trace('Found minutes ' + minutes);
					// Это минуты внутри сети
					if(isAvailable(['minutes_local_days', 'minutes_local_left', 'minutes_local_total', 'minutes_local_used'])) {
						var total = sumParam(minutes, null, null, /class="info"[^>]*>\s*\d+\s*\/\s([\d\.]*)\s*DK(?:[^>]*>){4}Turkcelllilerle/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
						var used = sumParam(minutes, null, null, /class="info"[^>]*>\s*([\d\.]*)\s*\/\s[\d\.]*\s*DK(?:[^>]*>){4}Turkcelllilerle/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
						var mins = sumParam(minutes, null, null, /Kalan Gün[^\d]*(\d+)(?:[^>]*>){6,8}Turkcelllilerle/ig, replaceTagsAndSpaces, parseBalance, aggregate_min);
						result.minutes_local_days = mins;
						// Нет даты у этого пакета, это совместный пакет
						if(!result.minutes_local_days) {
							getParam(result.minutes_days, result, 'minutes_local_days');
						}					
						if(total >= 0 && used >= 0) {
							getParam(total-used, result, 'minutes_local_left');
							getParam(total, result, 'minutes_local_total');
							getParam(used, result, 'minutes_local_used');
						} else {
							AnyBalance.trace('Can`t parse Turkcelllilerle minutes, contact the developer, please!');
						}				
					}
					// Это минуты кому угодно
					if(isAvailable(['minutes_days', 'minutes_left', 'minutes_total', 'minutes_used'])) {
						var total = sumParam(minutes, null, null, /class="info"[^>]*>\s*\d+\s*\/\s([\d\.]*)\s*DK(?:[^>]*>){4}Heryone/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
						var used = sumParam(minutes, null, null, /class="info"[^>]*>\s*([\d\.]*)\s*\/\s[\d\.]*\s*DK(?:[^>]*>){4}Heryone/ig, [replaceTagsAndSpaces, /\./, ''], parseBalance, aggregate_sum);
						var mins = sumParam(minutes, null, null, /Kalan Gün[^\d]*(\d+)(?:[^>]*>){6,8}Turkcelllilerle/ig, replaceTagsAndSpaces, parseBalance, aggregate_min);
						result.minutes_days = mins;					
						// Нет даты у этого пакета, это совместный пакет
						if(!result.minutes_days) {
							getParam(result.minutes_local_days, result, 'minutes_days');
						}
						if(total >= 0 && used >= 0) {
							getParam(total-used, result, 'minutes_left');
							getParam(total, result, 'minutes_total');
							getParam(used, result, 'minutes_used');
						} else {
							AnyBalance.trace('Can`t parse Heryone minutes, contact the developer, please!');
						}				
					}
				}
				// Остаток интернета
				var data = json.data;
				if(data) {
					//AnyBalance.trace('Found data ' + data);
					var total = sumParam(data, null, null, /class="info"[^>]*>\s*\d+\s*\/\s(\d*)\s*MB/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
					var used = sumParam(data, null, null, /class="info"[^>]*>\s*(\d+)\s*\/\s\d*\s*MB/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
					sumParam(data, result, 'data_days', /Kalan Gün[^\d]*(\d+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_min);
					
					if(total >= 0 && used >= 0) {
						getParam(total-used, result, 'data_left');
						getParam(total, result, 'data_total');
						getParam(used, result, 'data_used');
					} else {
						AnyBalance.trace('Can`t parse data, contact the developer, please!');
					}
				}
			} else {
				AnyBalance.trace('Can`t find bonuses!');
			}
		}
	}
	
    AnyBalance.setResult(result);
}