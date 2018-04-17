 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

var monthsArray = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lk.kvp24.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'lk/login', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'j_spring_security_check', {
		j_username: prefs.login,
		j_password: prefs.password
	}, addHeaders({Referer: baseurl + 'lk/login.jsp'}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+alert-error[^>]*>([\s\S]*?)(?:<\/div>|<\/strong)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error) throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var dt = new Date();
	var year = dt.getFullYear();
	var result = {success: true};

	if(isAvailable(['balance', 'date'])) {
		for(i=0; i<2; ++i){
			html = AnyBalance.requestGet(baseurl + 'payment/part/dataByYear/' + (year-i), addHeaders( {
				Referer: baseurl + 'payment',
				Accept:'*/*',
				'X-Requested-With':'XMLHttpRequest',		
			}));
		    
			var trsBal = getElements(html, [/<tr/ig, /Начислено за/i]);

			if(!trsBal.length)
				continue;
			
			getParam(trsBal[trsBal.length-1], result, 'balance', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			getParam(trsBal[trsBal.length-1], result, 'date', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
			break;
		}
	}

	if(isAvailable(['facilityGroup', 'serialNumber', 'usluga_balance'])) {
		html = AnyBalance.requestGet(baseurl + 'history/part/dataByYear/' + year, addHeaders( {
			Referer: baseurl + 'history',
			Accept:'*/*',
			'X-Requested-With':'XMLHttpRequest',		
		}));		


        var colsDef = {
			sn: {
				re: /Серийный /i,
				result_func: null //Текст
			},
			service: {
                re: /Услуга/i,
				result_func: null //Текст
            },
			m0: {
                re: /Январь/i,
            },
			m1: {
                re: /Февраль/i,
            },
			m2: {
                re: /Март/i,
            },
			m3: {
                re: /Апрель/i,
            },
			m4: {
                re: /Май/i,
            },
			m5: {
                re: /Июнь/i,
            },
			m6: {
                re: /Июль/i,
            },
			m7: {
                re: /Август/i,
            },
			m8: {
                re: /Сентябрь/i,
            },
			m9: {
                re: /Октябрь/i,
            },
			m10: {
                re: /Ноябрь/i,
            },
			m11: {
                re: /Декабрь/i,
            },
	 	};
	    
	    var counters = [];
		processTable(html, counters, '__', colsDef);

		for(var i=0; i<counters.length; ++i){
			var curr = counters[i];
			AnyBalance.trace('Найдены показания по услуге: ' + curr.service);
			if(!prefs.usluga || curr.__service == prefs.usluga){
				getParam(curr.__service, result, 'facilityGroup');
				getParam(curr.__sn, result, 'serialNumber');
				for(var m=11; m>=0; --m){
					if(isset(curr['__m'+m])){
						AnyBalance.trace('Найдены показания за месяц: ' + (m+1));
						getParam(curr['__m'+m], result, 'serialNumber');
						break;
					}
				}
				break;
			}
		}
	}
	
	AnyBalance.setResult(result);
}

