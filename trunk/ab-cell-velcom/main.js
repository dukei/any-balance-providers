/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru,en;q=0.8',
	'Connection': 'keep-alive',
	'Origin': 'https://my.velcom.by',
	'Cache-Control': 'max-age=0',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1985.143 Safari/537.36',
};

//var velcomOddPeople = 'Velcom сознательно противодействует оперативному получению вами баланса через сторонние программы! Вот и снова они специально ввели изменения, которые сломали получение баланса. Пожалуйста, позвоните в службу поддержки Velcom (411 и 410 с мобильного телефона в сети velcom без взимания оплаты) и оставьте претензию, что вы не можете пользоваться любимой программой. Проявите активную позицию, они скрывают ваш баланс от вас же. Зачем, интересно? МТС и Life своих абонентов уважают значительно больше...';
var velcomOddPeople = 'Не удалось войти в личный кабинет. Сайт изменен?';

function main(){
    var prefs = AnyBalance.getPreferences();
	
    var baseurl = "https://my.velcom.by/";
    AnyBalance.setDefaultCharset('utf-8');
	
    checkEmpty(prefs.login, 'Введите номер телефона в международном формате!');
    checkEmpty(prefs.password, 'Введите пароль к ИССА!');
	
    var matches;
    if(!(matches = /^\+(375\d\d)(\d{7})$/.exec(prefs.login)))
		throw new AnyBalance.Error('Неверный номер телефона. Необходимо ввести номер в международном формате без пробелов и разделителей!');
	
    var phone = matches[2];
    var prefix = matches[1];
    
    var html = AnyBalance.requestGet(baseurl, g_headers);

		function randomString(length) {var result = '', chars = '0123456789';for (var i = length; i > 0; --i) {	result += chars[Math.round(Math.random() * (chars.length - 1))];}return result;}
		// Ищи новый способ, как нас заблокировать.
		AnyBalance.setCookie('my.velcom.by', '_ga', 'GA1.2.' + randomString(10) + '.' + randomString(10));

    var sid = getParam(html, null, null, /name="sid3" value="([^"]*)"/i);
    if(!sid){
		if(AnyBalance.getLastStatusCode() >= 400){
			var error = getParam(html, null, null, /<h1[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, html_entity_decode);
			if(error)
				throw new AnyBalance.Error(error);
			throw new AnyBalance.Error('Сайт временно недоступен. Пожалуйста, попробуйте ещё раз позднее.');
		}
		AnyBalance.trace(html);
		throw new AnyBalance.Error(velcomOddPeople);
    }
    
    var form = getParam(html, null, null, /(<form[^>]*name="mainForm"[^>]*>[\s\S]*?<\/form>)/i);
    if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа, похоже, velcom её спрятал. Обратитесь к автору провайдера.');
    }
	
	var params = createFormParams(form, function(params, str, name, value) {
		var id=getParam(str, null, null, /\bid="([^"]*)/i, null, html_entity_decode);
		if(id){
			if(/PRE/i.test(id)){ //Это префикс
				value = prefix;
			}else if(/NUMBER|MSISDN/i.test(id)){ //Это номер
				value = phone;
			}else if(/PWD/i.test(id)){ //Это пароль
				value = prefs.password.substr(0, 10);  //Велкам уже принимает 10 символов пароля
			}
		}
		if(!name)
			return;
		if(name == 'user_input_0')
			value = '_next';
		if(name == 'user_input_timestamp')
			value = new Date().getTime();
		if(/^user_input_\d+8$/.test(name))
			value = '5';
		if(/^user_input_\d+9$/.test(name))
			value = '2';
		if(/^user_input_\d+10$/.test(name))
			value = '0';
		return value || '';
    });
    params.user_submit = undefined;

	try {
		html = requestPostMultipart(baseurl + 'work.html', params, addHeaders({Referer: baseurl}));
	} catch(e) {
		AnyBalance.trace('Error executing multipart request: ' + e.message);
		if(/Read error|failed to respond/i.test(e.message)){
			AnyBalance.trace(html);
			throw new AnyBalance.Error(velcomOddPeople + '!');
		}else{
			throw new AnyBalance.Error(e.message);
		}
	}
	
	if(AnyBalance.getLastStatusCode() >= 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error(velcomOddPeople + '!!');
	}

    var kabinetType, personalInfo;
	if(/_root\/PERSONAL_INFO_ABONENT/i.test(html)) {
        personalInfo = '_root/PERSONAL_INFO_ABONENT';
        kabinetType = 3;		
	} else if(/_root\/PERSONAL_INFO/i.test(html)){
        personalInfo = '_root/PERSONAL_INFO';
        kabinetType = 2;
    }else if(/_root\/USER_INFO/i.test(html)){
        personalInfo = '_root/USER_INFO';
        kabinetType = 1;
    }
	
	AnyBalance.trace('Cabinet type: ' + kabinetType);
	
	if(!kabinetType){
        var error = sumParam(html, null, null, /<td[^>]+class="INFO(?:_Error|_caption)?"[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, html_entity_decode, create_aggregate_join(' '))
		|| sumParam(html, null, null, /<span[^>]+style="color:\s*red[^>]*>[\s\S]*?<\/span>/ig, replaceTagsAndSpaces, html_entity_decode, create_aggregate_join(' '))
	        || getParam(html, null, null, /<td[^>]+class="info_caption"[^>]*>[\s\S]*?<\/td>/ig, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /Неверный пароль или номер телефона|Пароль должен состоять из 8 цифр|Если вы забыли пароль/i.test(error));
        if(/Сервис временно недоступен/i.test(html))
            throw new AnyBalance.Error('ИССА Velcom временно недоступна. Пожалуйста, попробуйте позже.');
        
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
	// Иногда сервис недоступен, дальше идти нет смысла
	if (/По техническим причинам работа с сервисами ограничена|Сервис временно недоступен/i.test(html)) {
		var message = getParam(html, null, null, /<div class="BREAK">([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		if(message) {
			AnyBalance.trace('Сайт ответил: ' + message);
			throw new AnyBalance.Error('ИССА Velcom временно недоступна.\n ' + message);
		}
		
		throw new AnyBalance.Error('ИССА Velcom временно недоступна. Пожалуйста, попробуйте позже.');
	}	
	
    var result = {success: true};
	
	//Персональная информация
    html = requestPostMultipart(baseurl + 'work.html', {
        sid3: sid,
        user_input_timestamp: new Date().getTime(),
        user_input_0: personalInfo,
        last_id: ''
    }, g_headers);
	
	getParam(html, result, 'userName', /(?:Абонент:|ФИО)(?: \(название абонента\))?:?[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'userNum', /(?:Номер):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //Хитрецы несколько строчек начисления абонента делают, одна при этом пустая
    sumParam(html, result, 'balance', /(?:Баланс основного счета|Баланс лицевого счета|Баланс|Начисления абонента):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    sumParam(html, result, 'balanceBonus', /(?:Баланс бонусного счета(?: \d)?):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    getParam(html, result, 'status', /(?:Текущий статус абонента|Статус абонента):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	sumParam(html, result, 'min', /Остаток исходящего бонуса:[\s\S]*?<td[^>]*>([\s\S]*?мин)/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    getParam(html, result, 'call_barring', /Запрет исходящих с:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateWord);
//    getParam(html, result, 'traffic', /<td[^>]+id="DISCOUNT"[^>]*>([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /^\D+/, ''], parseTraffic);

    var counters = getParam(html, null, null, /(?:Остаток трафика|Остаток минут, SMS, MMS, (?:МБ|GPRS), включенных в абонплату):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);
    if(counters){
	    sumParam(counters, result, 'sms', /(-?\d[\d,\.]*)\s*SMS/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	    sumParam(counters, result, 'mms', /(-?\d[\d,\.]*)\s*MMS/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	    counters = sumParam(counters, result, 'min_fn', /(-?\d[\d,\.]*)\s*мин(?:ут[аы]?)? на ЛН/i, replaceTagsAndSpaces, parseBalance, true, aggregate_sum);
        counters = sumParam(counters, result, 'min_velcom', /(-?\d[\d,\.]*)\s*мин(?:ут[аы]?)? на velcom/i, replaceTagsAndSpaces, parseBalance, true, aggregate_sum);
        getParam(counters, result, 'traffic', /(-?\d[\d,\.]*)\s*Мб/i, replaceTagsAndSpaces, parseBalance);
		getParam(counters, result, 'traffic_night', /([\s\d.]+[М|M][B|Б]\s+ночь)/i, replaceTagsAndSpaces, parseTraffic);
        sumParam(counters, result, 'min', /(-?\d[\d,\.]*)\s*мин/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    }else{
		AnyBalance.trace(html);
		AnyBalance.trace('Не удалось найти остатки трафика, минут и ммс, сайт изменен?');
    }
	
	if(AnyBalance.isAvailable('loan_balance', 'loan_left', 'loan_end')) {
		html = requestPostMultipart(baseurl + 'work.html', {
			sid3: sid,
			user_input_timestamp: new Date().getTime(),
			user_input_0: '_root/FINANCE_INFO/INSTALLMENT',
			user_input_1: '',
			last_id: ''
		}, g_headers);
		
		//Ежемес. платеж 659000 руб. Остаток 7249000 руб. Погашение 01.07.2015.			
		getParam(html, result, 'loan_balance', /Ежемес. платеж ([0-9]+) руб./i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'loan_left', /Остаток ([0-9]+) руб./i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'loan_end', /Погашение ([0-9.]+)./i, replaceTagsAndSpaces, parseDate);
	}
	/*
    if(AnyBalance.isAvailable('traffic')){
        html = requestPostMultipart(baseurl + 'work.html', {
            sid3: sid,
            user_input_timestamp: new Date().getTime(),
            user_input_0: '_root/TPLAN/PACKETS',
            last_id: '',
            user_input_1: -1
        }, g_headers);

        var packetMb = getParam(html, null, null, /Остаток интернет-трафика:[^<]*?(\d+)\s*Мб/i, replaceFloat, parseFloat) || 0;
        var packetKb = getParam(html, null, null, /Остаток интернет-трафика:[^<]*?(\d+)\s*Кб/i, replaceFloat, parseFloat) || 0;

        result.traffic = traffic + packetMb + packetKb/1000;
    }*/ 
	try{
	    // Выходим из кабинета, чтобы снизить нагрузку на сервер
		AnyBalance.trace('Выходим из кабинета, чтобы снизить нагрузку на сервер');
		html = requestPostMultipart(baseurl + 'work.html', {
			sid3: sid,
			user_input_timestamp: new Date().getTime(),
			user_input_0: '_exit',
			user_input_1: '',
			last_id: ''
		}, g_headers);
	} catch(e) {
		AnyBalance.trace('Ошибка при выходе из кабинета: ' + e.message);
	}
	
    AnyBalance.setResult(result);
}

function safeEval(window, script){
   try{
       var result = new Function('window', 'document', 'self', 'location', 'AnyBalance', 'g_AnyBalanceApiParams', '_AnyBalanceApi', script).call(window, window, window.document, window, window.location);
       return result;
   }catch(e){
       AnyBalance.trace('Bad javascript (' + e.message + '): ' + script);
       throw new AnyBalance.Error(velcomOddPeople);
   }
}