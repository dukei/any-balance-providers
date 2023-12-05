/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://hyzmat.tmcell.tm/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(/^\d{8}$/.test(prefs.login), 'Введите 8 последних цифр номера телефона (без префикса +993) без пробелов и разделителей!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'ru-ru/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	
	var form = getElement(html, /<form[^>]+form-signin[^>]*>/i);
    if(!form){
        AnyBalance.trace(form);
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
    }
	
	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});
	
	var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
		
	html = AnyBalance.requestPost(joinUrl(baseurl, action), params, addHeaders({Referer: baseurl + 'ru-ru/'}));
	
	if(!/Выход из системы/i.test(html)){
		var error = getParam(html, null, null, /alert-error(?:[^>]*>){3}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /неправильный номер телефона или неправильный пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс контракта:(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Тарифный план:(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'contract', /№ Контракта:(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'phone', /Телефонный номер:(?:[^>]*>){2}([^<]+)/i, [replaceTagsAndSpaces, /\D/g, '', /.*(\d{3})(\d{2})(\d{2})(\d{2})(\d{2})$/, '+$1 $2 $3-$4-$5'], html_entity_decode);
	getParam(html, result, 'fio', /Имя:(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	if(AnyBalance.isAvailable(['traffic_total', 'traffic_left', 'traffic_used', 'min_total', 'min_left', 'min_used', 'sms_total', 'sms_left', 'sms_used', 'packet_start', 'packet_till'])){
	    html = AnyBalance.requestGet(baseurl + 'TrafficPackets/Index', addHeaders({Referer: baseurl + 'ru-ru/'}));
		
	    var packs = getElements(html, /<table[^>]+table-values\s*table-packets[^>]*>/ig);
	    
	    if(packs && packs.length > 0){
		    AnyBalance.trace('Найдено пакетов услуг: ' + packs.length);
		    for(var i=0; i<packs.length; ++i){
				var pack = packs[i];
			    var val_total = getParam(pack, null, null, /<td[^>]+tdsmall(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, parseBalanceSilent);
				var val_left = getParam(pack, null, null, /<td[^>]+tdsmall(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, parseBalanceSilent);
				var unit = getParam(pack, null, null, /<td[^>]+tdsmall(?:[^>]*>){5}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
			    
		        if(/Интернет|Байт|Тб|Мб|Гб|Кб|Tb|Mb|Gb|Kb|Byte/i.test(pack)){
	    	        sumParam(val_total + ' ' + unit, result, 'traffic_total', null, null, parseTraffic, aggregate_sum);
					sumParam(val_left + ' ' + unit, result, 'traffic_left', null, null, parseTraffic, aggregate_sum);
					sumParam((val_total - val_left) + ' ' + unit, result, 'traffic_used', null, null, parseTraffic, aggregate_sum);
			    }else if(/Мин|Сек|Min|Sec/i.test(pack)){
	    	        sumParam(val_total + ' ' + unit, result, 'min_total', null, null, parseMinutes, aggregate_sum);
					sumParam(val_left + ' ' + unit, result, 'min_left', null, null, parseMinutes, aggregate_sum);
					sumParam((val_total - val_left) + ' ' + unit, result, 'min_used', null, null, parseMinutes, aggregate_sum);
			    }else if(/СМС|SMS|шт/i.test(pack)){
	    	        sumParam(val_total + ' ' + unit, result, 'sms_total', null, null, parseBalance, aggregate_sum);
					sumParam(val_left + ' ' + unit, result, 'sms_left', null, null, parseBalance, aggregate_sum);
					sumParam((val_total - val_left) + ' ' + unit, result, 'sms_used', null, null, parseBalance, aggregate_sum);
			    }else{
                    AnyBalance.trace('Неизвестный пакет: ' + pack);
                }
	        }
			getParam(html, result, 'packet_start', /<td[^>]+tdmedium(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, parseDate);
			getParam(html, result, 'packet_till', /<td[^>]+tdlast(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, parseDate);
	    }else{
		    AnyBalance.trace('Не удалось получить информацию по пакетам услуг');
	    }
	}
	
	if(AnyBalance.isAvailable('last_oper_date', 'last_oper_sum', 'last_oper_type', 'last_oper_dealer', 'last_oper_nds')){
	    html = AnyBalance.requestGet(baseurl + 'Payment/Details', addHeaders({Referer: baseurl + 'ru-ru/'}));
		
		var table = getElement(html, /<table[^>]+table-values[^]*>/i);
	    var hists = getElements(table, /<tr[^>]*>/ig);
	
	    if(hists.length && hists.length > 0){
			AnyBalance.trace('Найдено операций: ' + hists.length);
		    for(var i=0; i<hists.length; ++i){
	    	    var hist = hists[i];
				
				getParam(hist, result, 'last_oper_date', /<tr(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseDate);
		        getParam(hist, result, 'last_oper_sum', /<tr(?:[^>]*>){4}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
				getParam(hist, result, 'last_oper_type', /<tr(?:[^>]*>){6}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
				getParam(hist, result, 'last_oper_dealer', /<tr(?:[^>]*>){8}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
				getParam(hist, result, 'last_oper_nds', /<tr(?:[^>]*>){10}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
				
			    break;
	        }
			if(!result.last_oper_dealer)
				result.last_oper_dealer = '–';
		}else{
			AnyBalance.trace('Не удалось получить данные по операциям');
		}
	}
	
	
	AnyBalance.setResult(result);
}