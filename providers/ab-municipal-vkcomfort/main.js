/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':           'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':   'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':  'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':       'keep-alive',
	'User-Agent':       'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://room.vkcomfort.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	    
	var form = AB.getElement(html, /<form[^>]+login/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'account') {
			return prefs.login;
		} else if (name == 'password') {
			return prefs.password;
		}

		return value;
	});

    html = AnyBalance.requestPost(baseurl + 'login/', params, addHeaders({
        Referer: baseurl + 'login/'
    }));

    if (!/logout/i.test(html)) {
        var error = AB.getParam(html, null, null, /<div[^>]+alert-warning[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
        if (error) {
            throw new AnyBalance.Error(error, null, /(Ваш аккаунт в Новом Личном Кабинете не найден|Введенный логин или пароль не верны)/i.test(error));
        }

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

	var result = {success: true};

	var accsel = getElement(html, /<select[^>]+accountsAccount/i);
	var accs = getElements(accsel, /<option/ig);
	AnyBalance.trace('Найдено ' + accs.length + ' счетов');

	var num = getParam(accsel, null, null, /<option[^>]+value="([^"]*)[^>]*selected/i, replaceHtmlEntities);
	if(!prefs.num || endsWith(num, prefs.num)){
		AnyBalance.trace('Выбран счет ' + num + ' и он подходит');
	}else{
		for(var i=0; i<accs.length; ++i){
			var a = accs[i];
			num = getParam(a, null, null, /<option[^>]+value="([^"]*)/i, replaceHtmlEntities);
			AnyBalance.trace('найден счет ' + num);
			if(endsWith(num, prefs.num)){
				AnyBalance.trace('Переключаемся на счет ' + num);
				html = AnyBalance.requestGet(baseurl + 'change-account/' + num + '/', addHeaders({Referer: baseurl}));
				break;
			}
		}
		if(i >= accs.length)
			throw new AnyBalance.Error('Не удалось найти счет с последними цифрами ' + prefs.num);
	}
	
	
	getParam(html, result, 'balance', /<span[^>]+balance[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /user.png[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(num, result, 'acc_num');

	getParam(html, result, 'total_sum', /<th[^>]*>\s*Начислено(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
/*    
    html = AnyBalance.requestGet(baseurl + '%D1%83%D0%B7%D0%BD%D0%B0%D1%82%D1%8C/%D0%BD%D0%B0%D1%87%D0%B8%D1%81%D0%BB%D0%B5%D0%BD%D0%B8%D1%8F/', g_headers);
    
    // проверяем - если за последний месяц нет начислений, тогда берем начисления за предыдущий месяц
    var last_month = getParam(html, null, null, /total-result-row(?:[^>]*>){6}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    if(last_month == 0) {        
        parsePeriodParams(html, result, '2');
    } else {
        parsePeriodParams(html, result, '4');
    }
*/	
	AnyBalance.setResult(result);
}

function parsePeriodParams(html, result, step) {
    getParam(html, result, 'period', new RegExp('Услуга/Период(?:[^>]*>){' + step + '}([\\s\\S]*?)</', 'i'), replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'water', new RegExp('Водоотведение(?:[^>]*>){' + step + '}([\\s\\S]*?)</', 'i'), replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'warm', new RegExp('Отопление(?:[^>]*>){' + step + '}([\\s\\S]*?)</', 'i'), replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'heating', new RegExp('Подогрев ХВС для ГВС(?:[^>]*>){' + step + '}([\\s\\S]*?)</', 'i'), replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'hot_water', new RegExp('ХВС<(?:[^>]*>){' + step + '}([\\s\\S]*?)</', 'i'), replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'cold_water', new RegExp('>ХВС для ГВС<(?:[^>]*>){' + step + '}([\\s\\S]*?)</', 'i'), replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'electric', new RegExp('Электроснабжение(?:[^>]*>){' + step + '}([\\s\\S]*?)</', 'i'), replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'electric_odn', new RegExp('Электроснабжение ОДН(?:[^>]*>){' + step + '}([\\s\\S]*?)</', 'i'), replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'total_utilities', new RegExp('Итого:(?:[^>]*>){' + step + '}([\\s\\S]*?)</', 'i'), replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'expluat', new RegExp('Содержание и ремонт жилого помещения(?:[^>]*>){' + step + '}([\\s\\S]*?)</', 'i'), replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'total_expluat', new RegExp('Содержание и ремонт жилого помещения[\\s\\S]*?Итого:(?:[^>]*>){' + step + '}([\\s\\S]*?)</', 'i'), replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'total_sum', new RegExp('total-result-row[\\s\\S]*?Итого:(?:[^>]*>){' + step + '}([\\s\\S]*?)</', 'i'), replaceTagsAndSpaces, parseBalance);
}
