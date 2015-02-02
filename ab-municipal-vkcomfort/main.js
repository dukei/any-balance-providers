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
	var baseurl = 'http://room.vkcomfort.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet('http://vkcomfort.ru/%D0%BB%D0%B8%D1%87%D0%BD%D1%8B%D0%B9-%D0%BA%D0%B0%D0%B1%D0%B8%D0%BD%D0%B5%D1%82/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	    
    try {
        html = AnyBalance.requestPost(baseurl, { 
            accountLogin: prefs.login,
            accountPassword: prefs.password
        }, addHeaders({Referer: 'http://vkcomfort.ru/%D0%BB%D0%B8%D1%87%D0%BD%D1%8B%D0%B9-%D0%BA%D0%B0%D0%B1%D0%B8%D0%BD%D0%B5%D1%82/'}));
	} catch (e) {
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }    
	
	var result = {success: true};
	
	var balan = getParam(html, null, null, /class="(?:positive|negative)"[^>]*>[\s\S]*?<\//i, null, null);
	getParam(balan.replace(/negative">/ig, '-'), result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /header-account(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_num', /№ лс:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    
    html = AnyBalance.requestGet(baseurl + '%D1%83%D0%B7%D0%BD%D0%B0%D1%82%D1%8C/%D0%BD%D0%B0%D1%87%D0%B8%D1%81%D0%BB%D0%B5%D0%BD%D0%B8%D1%8F/', g_headers);
    
    // проверяем - если за последний месяц нет начислений, тогда берем начисления за предыдущий месяц
    var last_month = getParam(html, null, null, /total-result-row(?:[^>]*>){6}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    if(last_month == 0) {        
        parsePeriodParams(html, result, '2');
    } else {
        parsePeriodParams(html, result, '4');
    }
	
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
