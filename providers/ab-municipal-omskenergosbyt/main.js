/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает задолженность у Омской энергосбытовой компании

Сайт оператора: https://www.omesc.ru/
Личный кабинет: https://my.omesc.ru/
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Language': 'en-GB,en;q=0.9,ru-RU;q=0.9,ru;q=0.7,en-US;q=0.6',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Origin': 'https://my.omesc.ru',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
};

var baseurl = 'https://my.omesc.ru/lk/cabinet/';
var g_savedData;
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите E-mail!');
    checkEmpty(prefs.password, 'Введите пароль!');

    if(!g_savedData)
		g_savedData = new SavedData('omskenergosbyt', prefs.login);

	g_savedData.restoreCookies();
	
	var html = AnyBalance.requestGet(baseurl + 'accountinfo', g_headers);
	
	if (!html || AnyBalance.getLastStatusCode() >= 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	if(!/name="ls"\s*value/i.test(html)){
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
	
	    var html = AnyBalance.requestGet(baseurl + 'loginform', g_headers);
		
		var form = getElement(html, /<form[^>]*>/i);
        if(!form){
        	AnyBalance.trace(html);
        	throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
        }
	
	    var params = createFormParams(form, function(params, str, name, value) {
	   		if (name == 'ls') {
	   			return prefs.login;
    		} else if (name == 'password') {
	    		return prefs.password;
	    	}
	        
	    	return value;
	    });
		
	    var action = getParam(form, null, null, /<form[\s\S]*?action="([^"]*)/i, replaceHtmlEntities);

		html = AnyBalance.requestPost(joinUrl(baseurl, action), params, addHeaders({
			'Content-Type': 'application/x-www-form-urlencoded',
			Referer: baseurl + 'lk/cabinet/loginform'
		}));
		
		if(!/name="ls"\s*value/i.test(html)){
	    	var error = getParam(html, null, null, /<span[^>]+class="error"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
			if(error)
	    		throw new AnyBalance.Error(error, null, /пользовател|парол/i.test(error));
			
			AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }
		
		g_savedData.setCookies();
	    g_savedData.save();
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}

	var result = {success: true};
	
	var tables = getElements(html, /<table[^>]+class="a-table"[^>]*>/ig);
	
	if(tables && tables.length > 0){
		for(var i=0; i<tables.length; ++i){
			var info = tables[i];
			if(/Лицевой счет|Абонент/i.test(info)){
				AnyBalance.trace('Получаем данные из карточки лицевого счета...');
				getParam(info, result, '__tariff', /Лицевой сч[е|ё]т([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
	            getParam(info, result, 'account', /Лицевой сч[е|ё]т([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
				getParam(info, result, 'els_gis', /ГИС ЖКХ([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
	            getParam(info, result, 'address', /Адрес([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
	            getParam(info, result, 'fio', /Абонент([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
				getParam(info, result, 'last_pay_date', /Дата последнего платежа([^>]*>){3}/i, replaceTagsAndSpaces, parseDate);
			}else if(/Услуга|Задолженность/i.test(info)){
				AnyBalance.trace('Получаем данные из таблицы поставщиков и услуг...');
				getParam(info, result, 'power', /Электроэнергия - пик([^>]*>){5}/i, replaceTagsAndSpaces, parseBalance);
				getParam(info, result, 'power_pen', /Электроэнергия пени([^>]*>){5}/i, replaceTagsAndSpaces, parseBalance);
				getParam(info, result, 'tko', /Обращение с ТКО([^>]*>){5}/i, replaceTagsAndSpaces, parseBalance);
				getParam(info, result, 'tko_pen', /Обращение с ТКО пени([^>]*>){5}/i, replaceTagsAndSpaces, parseBalance);
				getParam(info, result, 'cold', /Холодное водоснабжение([^>]*>){5}/i, replaceTagsAndSpaces, parseBalance);
                getParam(info, result, 'debt_date', /Задолженность([\s\S]*?)<\/th>/i, replaceTagsAndSpaces, parseDate);
				sumParam(info, result, 'balance', /<td>(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			}else{
				AnyBalance.trace('Неизвестный тип данных: ' + info);
			}
		}

	}else{
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти таблицы с данными. Сайт изменен?');
	}
	
	var html = AnyBalance.requestGet(baseurl + 'historycalculations', g_headers);
	
	var peak = getElements(html, [/<tr[^>]+name="saldo10"[^>]*>/ig, /Пиковый/]); // Пиковый тариф для многотарифных счетчиков
	
	if(peak && peak.length > 0){
		AnyBalance.trace('Получаем показания пиковой зоны тарифа...');
		var info = peak[peak.length-2];
		
		getParam(info, result, 'period', /<tr(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, capitalFirstLetters); // Расчетный период
		getParam(info, result, 'power_counter', /<tr(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode); // Номер счетчика
		getParam(info, result, 'power_start_sum', /<tr(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance); // Сумма на начало периода
		getParam(info, result, 'accrued_kwt', /<tr(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance); // Начислено кВтч (всего)
		getParam(info, result, 'accrued_sum', /<tr(?:[\s\S]*?<td[^>]*>){10}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance); // Начислено руб. (всего)
		getParam(info, result, 'power_to_pay', /<tr(?:[\s\S]*?<td[^>]*>){15}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance); // Сумма на конец периода (к оплате)
		
		if(AnyBalance.isAvailable('accrued_kwt_peak', 'accrued_sum_peak')){
		    var peakTariff = getParam(info, null, null, /<tr(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance); // Стоимость пикового тарифа
		    var peakPrevInd = getParam(info, null, null, /<tr(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance); // Нач. показания (кВтч) по пиковому тарифу
		    var peakLastInd = getParam(info, null, null, /<tr(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance); // Кон. показания (кВтч) по пиковому тарифу
			
			getParam(((peakLastInd-peakPrevInd)*100)/100, result, 'accrued_kwt_peak', null, null, parseBalance); // Начислено кВтч по пиковому тарифу
			getParam((((peakLastInd-peakPrevInd)*peakTariff)*100)/100, result, 'accrued_sum_peak', null, null, parseBalance); // Начислено руб. по пиковому тарифу
		}
	}else{
		AnyBalance.trace('Не удалось найти показания пиковой зоны тарифа');
	}
	
	if(AnyBalance.isAvailable('accrued_kwt_ppeak', 'accrued_sum_ppeak')){
	    var ppeak = getElements(html, [/<tr[^>]+name="saldo10"[^>]*>/ig, /П\/пиковый/]); // Полупиковый тариф для многотарифных счетчиков
	    
	    if(ppeak && ppeak.length > 0){
	    	AnyBalance.trace('Получаем показания полупиковой зоны тарифа...');
	    	var info = ppeak[ppeak.length-2];
	    	
	    	var ppeakTariff = getParam(info, null, null, /<tr(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance); // Стоимость полупикового тарифа
	    	var ppeakPrevInd = getParam(info, null, null, /<tr(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance); // Нач. показания (кВтч) по полупиковому тарифу
	    	var ppeakLastInd = getParam(info, null, null, /<tr(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance); // Кон. показания (кВтч) по полупиковому тарифу
	    	
            getParam(((ppeakLastInd-ppeakPrevInd)*100)/100, result, 'accrued_kwt_ppeak', null, null, parseBalance); // Начислено кВтч по полупиковому тарифу
			getParam((((ppeakLastInd-ppeakPrevInd)*ppeakTariff)*100)/100, result, 'accrued_sum_ppeak', null, null, parseBalance); // Начислено руб. по полупиковому тарифу
	    }else{
	    	AnyBalance.trace('Не удалось найти показания полупиковой зоны тарифа');
	    }
    }
	
	if(AnyBalance.isAvailable('accrued_kwt_night', 'accrued_sum_night')){
	    var night = getElements(html, [/<tr[^>]+name="saldo10"[^>]*>/ig, /Ночной/]); // Ночной тариф для многотарифных счетчиков
	    
	    if(night && night.length > 0){
	    	AnyBalance.trace('Получаем показания ночной зоны тарифа...');
	    	var info = night[night.length-2];
	    	
	    	var nightTariff = getParam(info, null, null, /<tr(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance); // Стоимость ночного тарифа
	    	var nightPrevInd = getParam(info, null, null, /<tr(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance); // Нач. показания (кВтч) по ночному тарифу
	    	var nightLastInd = getParam(info, null, null, /<tr(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance); // Кон. показания (кВтч) по ночному тарифу
	    	
            getParam(((nightLastInd-nightPrevInd)*100)/100, result, 'accrued_kwt_night', null, null, parseBalance); // Начислено кВтч по ночному тарифу
			getParam((((nightLastInd-nightPrevInd)*nightTariff)*100)/100, result, 'accrued_sum_night', null, null, parseBalance); // Начислено руб. по ночному тарифу
	    }else{
	    	AnyBalance.trace('Не удалось найти показания ночной зоны тарифа');
	    }
	}
	
	if(AnyBalance.isAvailable(['email', 'phone'])){
	    var html = AnyBalance.requestGet(baseurl + 'changemail', g_headers);
	    
	    getParam(html, result, 'email', /name="email"[\s\S]*?value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	    getParam(html, result, 'phone', /name="phone"[\s\S]*?value="([^"]*)/i, replaceNumber, html_entity_decode);
	}

    setCountersToNull(result);
	
	AnyBalance.setResult(result); 
}
