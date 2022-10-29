/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.6,en;q=0.4',
	'Cache-Control': 'max-age=0',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.67 Safari/537.36'
};

var baseurl = 'https://xn--80aaaf3bi1ahsd.xn--80asehdb';
var g_savedData;

function main() {
    var prefs = AnyBalance.getPreferences();
    
    AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	checkEmpty(/(^\d{10}$|@)/, 'Введите номер телефона (10 цифр без пробелов и разделителей) или E-mail!');
	
	if (prefs.flatnum && !prefs.housenum)
		checkEmpty(prefs.housenum, 'Введите номер дома!');
	
	if(!g_savedData)
		g_savedData = new SavedData('kvartplata-online', prefs.login);

	g_savedData.restoreCookies();

    var html = AnyBalance.requestGet('https://xn--j1ab.xn--80aaaf3bi1ahsd.xn--80asehdb/personal/Account/GetTotalDebt', g_headers);

    if (AnyBalance.getLastStatusCode() > 500) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	if(html){
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}else{
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
		
		var login = prefs.login;
	    if(!/@/.test(login))
		    login = '7' + login;

		html = AnyBalance.requestPost('https://xn--j1ab.xn--80aaaf3bi1ahsd.xn--80asehdb/web/account/login', JSON.stringify({
            "login": login.replace(/\+/g, ''),
            "password": prefs.password
        }), addHeaders({
			'Accept': 'application/json, text/plain, */*',
			'Content-Type': 'application/json', 
			'Origin': 'https://xn--80aaaf3bi1ahsd.xn--80asehdb',
			'Referer': 'https://xn--80aaaf3bi1ahsd.xn--80asehdb/'
		}));
		
		var json=getJson(html);
		AnyBalance.trace(JSON.stringify(json));
		
	    if (!json.userName){
	    	var error = json[0].message;
	    	if (error){
				AnyBalance.trace(html);
	    		throw new AnyBalance.Error(error, null, /пользовател|парол/i.test(error));
	    	}
			
			AnyBalance.trace(html);
		    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }
		
		var userName = json.userName;
		var token = json.token;
		
		html = AnyBalance.requestPost('https://xn--j1ab.xn--80aaaf3bi1ahsd.xn--80asehdb/web/Account/Authorize', JSON.stringify({
            "userName": userName,
            "token": token
        }), addHeaders({
			'Accept': 'application/json, text/plain, */*',
			'Content-Type': 'application/json', 
			'Origin': 'https://xn--80aaaf3bi1ahsd.xn--80asehdb',
			'Referer': 'https://xn--80aaaf3bi1ahsd.xn--80asehdb/'
		}));
		
		html = AnyBalance.requestGet('https://xn--j1ab.xn--80aaaf3bi1ahsd.xn--80asehdb/personal/Account/GetTotalDebt', g_headers);
		
		g_savedData.setCookies();
	    g_savedData.save();
	}
	
    var result = {success: true};
	
	// Получаем общую задолженность
	getParam(html, result, 'debtTotal', null, null, parseBalance);
 
    // Получаем список помещений
	html = AnyBalance.requestGet('https://xn--j1ab.xn--80aaaf3bi1ahsd.xn--80asehdb/personal/apartment', g_headers);
	
	var json = getJson(html);
	
	if (!isArray(json) || json.length < 1)
        throw new AnyBalance.Error('Не удалось найти информацию по помещениям. Сайт изменен?');
	
	var currApart;
	for(var i=0; i<json.length; ++i){
		var curr = json[i];
		AnyBalance.trace('Найдено помещение по адресу ' + curr.address);
		var currHouseNum = getParam(curr.address, null, null, /\,\sд\.?\s([\s\S]*?)(?:\,|$)/i, replaceTagsAndSpaces);
		var currFlatNum = getParam(curr.address, null, null, /\,\sкв\.?\s([\s\S]*?)$/i, replaceTagsAndSpaces);
		if (!currFlatNum){
			var currFlatNum = '';
		}

		if(!currApart && (!prefs.housenum  || endsWith(currHouseNum + currFlatNum, prefs.housenum + prefs.flatnum))){
			AnyBalance.trace('Выбрано помещение по адресу ' + curr.address);
			currApart = curr;
		}
	}
	
	var apartId = currApart.id;

	if(!currApart)
		throw new AnyBalance.Error('Не удалось найти помещение по указанному адресу');
	
	getParam(currApart.debt, result, 'balance', null, null, parseBalance);
	getParam(currApart.address, result, '__tariff', /\,\s((?:ул|пр|пер|пл|алл|бул|лин|туп|шос)[\s\S]*?)$/i, replaceTagsAndSpaces);
	getParam(currApart.address, result, 'address');

    html = AnyBalance.requestGet('https://xn--j1ab.xn--80aaaf3bi1ahsd.xn--80asehdb/personal/Account/ListByApartment?apartmentId=' + apartId, g_headers);
	
	var json = getJson(html);
	
	if (!isArray(json) || json.length < 1)
        throw new AnyBalance.Error('Не удалось найти информацию по лицевым счетам. Сайт изменен?');
	
	for(var i=0; i<json.length; ++i){
		AnyBalance.trace('Найдено лицевых счетов: ' + json.length);
		var info = json[i];
		var type = info.type;
		if(/отоплени|нагрев|ГВС/i.test(type)){ 
			AnyBalance.trace('Отопление и ГВС');
			var accHotId = info.id;
			var accHotNum = info.number; // лицевой счет организации
			getParam(info.debt, result, 'debtHot', null, null, parseBalance);
		}else if(/водоснаб|водоотв/i.test(type)){
			AnyBalance.trace('Водоснабжение и водотведение');
			var accColdId = info.id;
			var accColdNum = info.number; // лицевой счет организации
			getParam(info.debt, result, 'debtCold', null, null, parseBalance);
		}else if(/электро|энерг/i.test(type)){
			AnyBalance.trace('Электроэнергия');
			var accPowId = info.id;
			var accPowNum = info.number; // лицевой счет организации
			getParam(info.debt, result, 'debtPow', null, null, parseBalance);
		}else if(/мусор|ТБО/i.test(type)){
			AnyBalance.trace('Вывоз мусора и ТБО');
			var accTboId = info.id;
			var accTboNum = info.number; // лицевой счет организации
			getParam(info.debt, result, 'debtTbo', null, null, parseBalance);
		}else if(/коммун|услуг/i.test(type)){
			AnyBalance.trace('Коммунальные слуги и ЖКХ');
			var accJkhId = info.id;
			var accJkhNum = info.number; // лицевой счет организации
			getParam(info.debt, result, 'debtJkh', null, null, parseBalance);
		}else if(/капитал|ремонт/i.test(type)){
			AnyBalance.trace('Капитальный ремонт');
			var accCapId = info.id;
			var accCapNum = info.number; // лицевой счет организации
			getParam(info.debt, result, 'debtCap', null, null, parseBalance);
		}else{
			AnyBalance.trace('Неизвестная услуга: ' + type);
		}
	}
	
	// Показания счетчиков и последние начисления за отопление и ГВС
	if (accHotId){
	    html = AnyBalance.requestGet('https://xn--j1ab.xn--80aaaf3bi1ahsd.xn--80asehdb/personal/cnt/listnew/' + accHotId, g_headers);
	    var json = getJson(html);
	
		if (json.counters && json.counters.length > 0){
			result.countHot = 'Л/с: ' + accHotNum;
           	json.counters.forEach(function(g) {
				if (g.isActive !== false){ // Пропускаем неактивные счетчики
	    		    result.countHot += '<br>' + g.serviceName + ' № ' + g.counterNumber + ': ' + g.value + ' ' + g.unitName
				}
       	    })    	
	    }else{
		    AnyBalance.trace('Не удалось получить счетчики. Вероятно, они отсутствуют');
	    }
		
		html = AnyBalance.requestGet('https://xn--j1ab.xn--80aaaf3bi1ahsd.xn--80asehdb/personal/Accruals/List?accountId=' + accHotId, g_headers);
	    var json = getJson(html);

		if (json && json.length > 0){
		    var payInBal = getParam(json[0].inBalance, null, null, null, null, parseBalance);
		    var paySum = getParam(json[0].sum, null, null, null, null, parseBalance);
		    var payFine = getParam(json[0].fine, null, null, null, null, parseBalance);
	   	    var payPayed = getParam(json[0].payed, null, null, null, null, parseBalance);
		    var payPeriod = getParam(json[0].periodName);
		    var res = 'Л/с: ' + accHotNum;
		    res += '<br>Период начисления: ' + payPeriod;
			res += '<br>Начальный остаток: ' + payInBal + ' ₽';
		    res += '<br>Начислено за месяц: ' + paySum + ' ₽';
		    res += '<br>Пени: ' + payFine + ' ₽';
		    res += '<br>Поступило: ' + payPayed + ' ₽';
    	    getParam(res, result, 'payHot');
		}else{
			AnyBalance.trace('Не удалось получить начисления. Вероятно, они отсутствуют');
		}
		
	}else{
		AnyBalance.trace('Не удалось получить accHotId. Вероятно, услуги отсутствуют');
	}
	
	// Показания счетчиков и последние начисления за водоснабжение
	if (accColdId){
	    html = AnyBalance.requestGet('https://xn--j1ab.xn--80aaaf3bi1ahsd.xn--80asehdb/personal/cnt/listnew/' + accColdId, g_headers);
	    var json = getJson(html);
	
		if (json.counters && json.counters.length > 0){
			result.countCold = 'Л/с: ' + accColdNum;
           	json.counters.forEach(function(g) {
				if (g.isActive !== false){ // Пропускаем неактивные счетчики
	    		    result.countCold += '<br>' + g.serviceName + ' № ' + g.counterNumber + ': ' + g.value + ' ' + g.unitName
				}
       	    })    	
	    }else{
		    AnyBalance.trace('Не удалось получить счетчики. Вероятно, они отсутствуют');
	    }
		
		html = AnyBalance.requestGet('https://xn--j1ab.xn--80aaaf3bi1ahsd.xn--80asehdb/personal/Accruals/List?accountId=' + accColdId, g_headers);
	    var json = getJson(html);

		if (json && json.length > 0){
		    var payInBal = getParam(json[0].inBalance, null, null, null, null, parseBalance);
		    var paySum = getParam(json[0].sum, null, null, null, null, parseBalance);
		    var payFine = getParam(json[0].fine, null, null, null, null, parseBalance);
	   	    var payPayed = getParam(json[0].payed, null, null, null, null, parseBalance);
		    var payPeriod = getParam(json[0].periodName);
		    var res = 'Л/с: ' + accColdNum;
		    res += '<br>Период начисления: ' + payPeriod;
		    res += '<br>Начальный остаток: ' + payInBal + ' ₽';
		    res += '<br>Начислено за месяц: ' + paySum + ' ₽';
		    res += '<br>Пени: ' + payFine + ' ₽';
		    res += '<br>Поступило: ' + payPayed + ' ₽';
    	    getParam(res, result, 'payCold');
		}else{
			AnyBalance.trace('Не удалось получить начисления. Вероятно, они отсутствуют');
		}
		
	}else{
		AnyBalance.trace('Не удалось получить accColdId. Вероятно, услуги отсутствуют');
	}
	
	// Показания счетчиков и последние начисления за электроэнергию
	if (accPowId){
	    html = AnyBalance.requestGet('https://xn--j1ab.xn--80aaaf3bi1ahsd.xn--80asehdb/personal/cnt/listnew/' + accPowId, g_headers);
	    var json = getJson(html);
	
		if (json.counters && json.counters.length > 0){
			result.countPow = 'Л/с: ' + accPowNum;
           	json.counters.forEach(function(g) {
				if (g.isActive !== false){ // Пропускаем неактивные счетчики
	    		    result.countPow += '<br>' + g.serviceName + ' № ' + g.counterNumber + ': ' + g.value + ' ' + g.unitName
				}
       	    })    	
	    }else{
		    AnyBalance.trace('Не удалось получить счетчики. Вероятно, они отсутствуют');
	    }
		
		html = AnyBalance.requestGet('https://xn--j1ab.xn--80aaaf3bi1ahsd.xn--80asehdb/personal/Accruals/List?accountId=' + accPowId, g_headers);
	    var json = getJson(html);

		if (json && json.length > 0){
		    var payInBal = getParam(json[0].inBalance, null, null, null, null, parseBalance);
		    var paySum = getParam(json[0].sum, null, null, null, null, parseBalance);
		    var payFine = getParam(json[0].fine, null, null, null, null, parseBalance);
	   	    var payPayed = getParam(json[0].payed, null, null, null, null, parseBalance);
		    var payPeriod = getParam(json[0].periodName);
		    var res = 'Л/с: ' + accPowNum;
		    res += '<br>Период начисления: ' + payPeriod;
		    res += '<br>Начальный остаток: ' + payInBal + ' ₽';
		    res += '<br>Начислено за месяц: ' + paySum + ' ₽';
		    res += '<br>Пени: ' + payFine + ' ₽';
		    res += '<br>Поступило: ' + payPayed + ' ₽';
    	    getParam(res, result, 'payPow');
		}else{
			AnyBalance.trace('Не удалось получить начисления. Вероятно, они отсутствуют');
		}
		
	}else{
		AnyBalance.trace('Не удалось получить accPowId. Вероятно, услуги отсутствуют');
	}
	
	// Последние начисления за вывоз мусора и ТБО
	if (accTboId){
		html = AnyBalance.requestGet('https://xn--j1ab.xn--80aaaf3bi1ahsd.xn--80asehdb/personal/Accruals/List?accountId=' + accTboId, g_headers);
	    var json = getJson(html);

		if (json && json.length > 0){
    		var payInBal = getParam(json[0].inBalance, null, null, null, null, parseBalance);
		    var paySum = getParam(json[0].sum, null, null, null, null, parseBalance);
		    var payFine = getParam(json[0].fine, null, null, null, null, parseBalance);
	   	    var payPayed = getParam(json[0].payed, null, null, null, null, parseBalance);
		    var payPeriod = getParam(json[0].periodName);
		    var res = 'Л/с: ' + accTboNum;
		    res += '<br>Период начисления: ' + payPeriod;
		    res += '<br>Начальный остаток: ' + payInBal + ' ₽';
		    res += '<br>Начислено за месяц: ' + paySum + ' ₽';
		    res += '<br>Пени: ' + payFine + ' ₽';
		    res += '<br>Поступило: ' + payPayed + ' ₽';
    	    getParam(res, result, 'payTbo');
		}else{
			AnyBalance.trace('Не удалось получить начисления. Вероятно, они отсутствуют');
		}
		
	}else{
		AnyBalance.trace('Не удалось получить accTboId. Вероятно, услуги отсутствуют');
	}
	
	// Показания счетчиков и последние начисления за услуги ЖКХ
	if (accJkhId){
		html = AnyBalance.requestGet('https://xn--j1ab.xn--80aaaf3bi1ahsd.xn--80asehdb/personal/cnt/listnew/' + accJkhId, g_headers);
	    var json = getJson(html);
	
		if (json.counters && json.counters.length > 0){
			result.countJkh = 'Л/с: ' + accJkhNum;
           	json.counters.forEach(function(g) {
				if (g.isActive !== false){ // Пропускаем неактивные счетчики
	    		    result.countJkh += '<br>' + g.serviceName + ' № ' + g.counterNumber + ': ' + g.value + ' ' + g.unitName
				}
       	    })    	
	    }else{
		    AnyBalance.trace('Не удалось получить счетчики. Вероятно, они отсутствуют');
	    }

		html = AnyBalance.requestGet('https://xn--j1ab.xn--80aaaf3bi1ahsd.xn--80asehdb/personal/Accruals/List?accountId=' + accJkhId, g_headers);
	    var json = getJson(html);

		if (json && json.length > 0){
		    var payInBal = getParam(json[0].inBalance, null, null, null, null, parseBalance);
		    var paySum = getParam(json[0].sum, null, null, null, null, parseBalance);
		    var payFine = getParam(json[0].fine, null, null, null, null, parseBalance);
	   	    var payPayed = getParam(json[0].payed, null, null, null, null, parseBalance);
		    var payPeriod = getParam(json[0].periodName);
		    var res = 'Л/с: ' + accJkhNum;
		    res += '<br>Период начисления: ' + payPeriod;
		    res += '<br>Начальный остаток: ' + payInBal + ' ₽';
		    res += '<br>Начислено за месяц: ' + paySum + ' ₽';
		    res += '<br>Пени: ' + payFine + ' ₽';
		    res += '<br>Поступило: ' + payPayed + ' ₽';
    	    getParam(res, result, 'payJkh');
		}else{
			AnyBalance.trace('Не удалось получить начисления. Вероятно, они отсутствуют');
		}
		
	}else{
		AnyBalance.trace('Не удалось получить accJkhId. Вероятно, услуги отсутствуют');
	}
	
	// Последние начисления за капитальный ремонт
	if (accCapId){
		html = AnyBalance.requestGet('https://xn--j1ab.xn--80aaaf3bi1ahsd.xn--80asehdb/personal/Accruals/List?accountId=' + accCapId, g_headers);
	    var json = getJson(html);
		
		if (json && json.length > 0){
		    var payInBal = getParam(json[0].inBalance, null, null, null, null, parseBalance);
		    var paySum = getParam(json[0].sum, null, null, null, null, parseBalance);
		    var payFine = getParam(json[0].fine, null, null, null, null, parseBalance);
	   	    var payPayed = getParam(json[0].payed, null, null, null, null, parseBalance);
		    var payPeriod = getParam(json[0].periodName);
		    var res = 'Л/с: ' + accCapNum;
		    res += '<br>Период начисления: ' + payPeriod;
		    res += '<br>Начальный остаток: ' + payInBal + ' ₽';
		    res += '<br>Начислено за месяц: ' + paySum + ' ₽';
		    res += '<br>Пени: ' + payFine + ' ₽';
		    res += '<br>Поступило: ' + payPayed + ' ₽';
    	    getParam(res, result, 'payCap');
		}else{
			AnyBalance.trace('Не удалось получить начисления. Вероятно, они отсутствуют');
		}
		
	}else{
		AnyBalance.trace('Не удалось получить accCapId. Вероятно, услуги отсутствуют');
	}

    AnyBalance.setResult(result);
}
