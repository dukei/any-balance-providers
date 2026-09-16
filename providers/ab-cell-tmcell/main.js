/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://my.tmcell.tm/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(/^\d{8}$/.test(prefs.login), 'Введите 8 последних цифр номера телефона (без префикса +993) без пробелов и разделителей!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + '?dil=ru', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	
	var _csrf = getParam(html, null, null, /<input[^>]+name="_csrf" value="([^"]*)/i, replaceHtmlEntities);
		
	html = AnyBalance.requestPost(baseurl, {
		'login': prefs.login,
		'password': prefs.password,
		'login-remember-me': 'on',
		'_csrf': _csrf
	}, addHeaders({'Content-Type': 'application/x-www-form-urlencoded', 'Referer': baseurl}));
	
	if(!/logout/i.test(html)){
		var error = getParam(html, null, null, /alert-error(?:[^>]*>){3}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (/is-invalid/i.test(html))
			error = 'Неправильный номер телефона или пароль';
		if (error)
			throw new AnyBalance.Error(error, null, /номер|парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /(?:Баланс контракта|Şertnamanyň balansy)\s*?:(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /(?:Тарифный план|Nyrhnama meýilnamasy)\s*?:(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'contract', /(?:Договор|Şertnamanyň)\s*?№\s*?:(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'phone', /(?:Номер телефона|Telefon belgisi)\s+?:(?:[^>]*>){3}([^<]+)/i, [replaceTagsAndSpaces, /\D/g, '', /.*(\d{3})(\d{2})(\d{2})(\d{2})(\d{2})$/, '+$1 $2 $3-$4-$5'], html_entity_decode);
	getParam(html, result, 'fio', /(?:Имя и фамилия|Ady we familiýasy)\s*?:(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	if(AnyBalance.isAvailable(['traffic_total', 'traffic_left', 'traffic_used', 'packet_traffic_till', 'min_total', 'min_left', 'min_used', 'packet_min_till', 'sms_total', 'sms_left', 'sms_used', 'packet_sms_till'])){
	    html = AnyBalance.requestGet(baseurl + '?internet_bukja', addHeaders({'Referer': baseurl}));
        
	    var packs = getElements(html, /<div[^>]+class="col-md-6\s*?col-xl-3\s*?col-xl-3\s*?"[^>]*>/ig); // Активные пакеты обозначены двойным col-xl-3
	    
	    if(packs && packs.length > 0){
		    AnyBalance.trace('Найдено пакетов услуг: ' + packs.length);
		    for(var i=0; i<packs.length; ++i){
				var pack = packs[i];
			    var val_total = getParam(pack, null, null, /<span[^>]+class="underline_dotted"[^>]*>[\s\S]*?\(([\s\S]*?)\)<\/span>/i, replaceTagsAndSpaces, parseBalanceSilent);
				var val_left = getParam(pack, null, null, /<i[^>]+fa-globe mr\-2">([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalanceSilent);
				var unit = getParam(pack, null, null, /<span[^>]+class="underline_dotted"[^>]*>[\s\S]*?\(([\s\S]*?)\)<\/span>/i, [replaceTagsAndSpaces, /(\d+)\s*?([\s\S]*?)$/i, '$2'], html_entity_decode);
				
		        if(/Интернет|Байт|Тб|Мб|Гб|Кб|Tb|Mb|Gb|Kb|Byte/i.test(unit)){
	    	        sumParam(val_total + ' ' + unit, result, 'traffic_total', null, null, parseTraffic, aggregate_sum);
					sumParam(val_left + ' ' + unit, result, 'traffic_left', null, null, parseTraffic, aggregate_sum);
					sumParam((val_total - val_left) + ' ' + unit, result, 'traffic_used', null, null, parseTraffic, aggregate_sum);
					sumParam(pack, result, 'packet_traffic_till', /<p[^>]+class="fs-lg"[^>]*>[\s\S]*?fa-calendar-check mr\-2">([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseDate, aggregate_min);
			    }else if(/Мин|Сек|Min|Sec/i.test(unit)){
	    	        sumParam(val_total + ' ' + unit, result, 'min_total', null, null, parseMinutes, aggregate_sum);
					sumParam(val_left + ' ' + unit, result, 'min_left', null, null, parseMinutes, aggregate_sum);
					sumParam((val_total - val_left) + ' ' + unit, result, 'min_used', null, null, parseMinutes, aggregate_sum);
					sumParam(pack, result, 'packet_min_till', /<p[^>]+class="fs-lg"[^>]*>[\s\S]*?fa-calendar-check mr\-2">([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseDate, aggregate_min);
			    }else if(/СМС|SMS|шт/i.test(unit)){
	    	        sumParam(val_total + ' ' + unit, result, 'sms_total', null, null, parseBalance, aggregate_sum);
					sumParam(val_left + ' ' + unit, result, 'sms_left', null, null, parseBalance, aggregate_sum);
					sumParam((val_total - val_left) + ' ' + unit, result, 'sms_used', null, null, parseBalance, aggregate_sum);
					sumParam(pack, result, 'packet_sms_till', /<p[^>]+class="fs-lg"[^>]*>[\s\S]*?fa-calendar-check mr\-2">([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseDate, aggregate_min);
			    }else{
                    AnyBalance.trace('Неизвестный пакет: ' + pack);
                }
	        }
	    }else{
		    AnyBalance.trace('Не удалось получить информацию по пакетам услуг');
	    }
	}
	
	if(AnyBalance.isAvailable('last_oper_date', 'last_oper_sum', 'last_oper_type', 'last_oper_dealer', 'last_oper_nds')){
	    var dt = new Date();
	    var dtPrev = new Date(dt.getFullYear(), dt.getMonth()-3, '01');
		var dateFrom = dtPrev.getFullYear() + '-' + n2(dtPrev.getMonth()+1) + '-' + n2(dtPrev.getDate());
	    var dateTo = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + n2(dt.getDate());
		
		html = AnyBalance.requestPost(baseurl + '?toleg_taryhy', {
			'sene_begin': dateFrom,
            'sene_end': dateTo
		}, addHeaders({'Content-Type': 'application/x-www-form-urlencoded', 'Referer': baseurl}));
		
		var table = getElement(html, /<table[^>]+table-hover[^>]*>/i);
	    var hists = getElements(table, [/<tr[^>]*>/ig, /<td[^>]*>/i]);
	
	    if(hists.length && hists.length > 0){
			AnyBalance.trace('Найдено операций: ' + hists.length);
			result.last_oper_dealer = '–';
		    for(var i=0; i<hists.length; ++i){
	    	    var hist = hists[i];
				
				getParam(hist, result, 'last_oper_date', /<tr(?:[^>]*>){5}([^<]+)/i, replaceTagsAndSpaces, parseDate);
		        getParam(hist, result, 'last_oper_sum', /<tr(?:[^>]*>){7}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
				getParam(hist, result, 'last_oper_type', /<tr(?:[^>]*>){9}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
				getParam(hist, result, 'last_oper_dealer', /<tr(?:[^>]*>){11}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
				getParam(hist, result, 'last_oper_nds', /<tr(?:[^>]*>){13}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
				
				if(!result.last_oper_dealer)
					result.last_oper_dealer = '–';
				
			    break;
	        }
		}else{
			AnyBalance.trace('Не удалось получить данные по операциям');
		}
	}
	
	AnyBalance.setResult(result);
}