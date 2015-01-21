/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru,en;q=0.8',
	'Connection': 'keep-alive',
	'Origin': 'https://internet.velcom.by',
	'Cache-Control': 'max-age=0',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1985.143 Safari/537.36',
};

//var velcomOddPeople = 'Velcom сознательно противодействует оперативному получению вами баланса через сторонние программы! Вот и снова они специально ввели изменения, которые сломали получение баланса. Пожалуйста, позвоните в службу поддержки Velcom (411 и 410 с мобильного телефона в сети velcom без взимания оплаты) и оставьте претензию, что вы не можете пользоваться любимой программой. Проявите активную позицию, они скрывают ваш баланс от вас же. Зачем, интересно? МТС и Life своих абонентов уважают значительно больше...';
var velcomOddPeople = 'Не удалось войти в личный кабинет. Сайт изменен?';

function main(){
    var prefs = AnyBalance.getPreferences();
	
    var baseurl = "https://internet.velcom.by/";
    AnyBalance.setDefaultCharset('utf-8');
	
    checkEmpty(prefs.login, 'Введите номер телефона в международном формате!');
    checkEmpty(prefs.password, 'Введите пароль к ИССА!');
	
    var matches;
    if(!(matches = /^\+(375\d\d)(\d{7})$/.exec(prefs.login)))
		throw new AnyBalance.Error('Неверный номер телефона. Необходимо ввести номер в международном формате без пробелов и разделителей!');
	
    var phone = matches[2];
    var prefix = matches[1];
    
    var html = AnyBalance.requestGet(baseurl, g_headers);

    //А провайдер некоммерческий с открытым исходным кодом, бесплатный (LGPL). Программа работает как браузер (по HTML, JavaScript стандартам). 
    //Используется именно вашими пользователями, для личных нужд, потому что только они знают свой логин-пароль.
    //Если дальше так пойдет, мы будем реальному браузеру всё отдавать и результат забирать. Так что капчу или OTP вводите или отстаньте.
    //Продекларируйте явно, что вы хотите усложнить пользователям доступ к их балансу.
    
    //Да вы и по выходным шпарите, я смотрю. Личная инициатива?
    //Без капчи или OTP не получится запретить. Тупо придется тратить ваши и наши усилия на гонку обфускации. Но зачем??? Страдают-то пользователи. Давайте жить дружно!
	
	//Ребят, а чего вы так сражаетесь-то со входом в кабинет? Боретесь со своими же пользователями?
	//Не хотите, чтобы они свой баланс видели? :)
	//Свяжитесь со мной (dco@mail.ru), объясните, что вам так не нравится-то? Может, какое совместное решение выработаем.
	/*
	var obfuscatedScript = sumParam(html, null, null, /<script(?:[^>](?!src\s*=))*>([\s\S]*?)<\/script>/ig, null, null, create_aggregate_join('\n'));
	if(obfuscatedScript) {
		var win = {document: {cookie: ''}, location: {href: baseurl}};
		safeEval(win, obfuscatedScript);

		var cookieName = getParam(win.document.cookie, null, null, /(.*?)=/);
		var cookieVal = getParam(win.document.cookie, null, null, /=(.*?)(?:;|$)/);
		if(!cookieName || !cookieVal)
			throw new AnyBalance.Error(velcomOddPeople);
		
		AnyBalance.setCookie('internet.velcom.by', cookieName, cookieVal);
		function randomString(length) {var result = '', chars = '0123456789';for (var i = length; i > 0; --i) {	result += chars[Math.round(Math.random() * (chars.length - 1))];}return result;}
		// Ищи новый способ, как нас заблокировать.
		AnyBalance.setCookie('internet.velcom.by', '_ga', 'GA1.2.' + randomString(10) + '.' + randomString(10));
		
		try {
			html = AnyBalance.requestGet(win.location.href, addHeaders({'Referer': 'https://internet.velcom.by/'}));
		} catch (e) {
			html = AnyBalance.requestGet('https://internet.velcom.by/');
		}
	}
	*/

		function randomString(length) {var result = '', chars = '0123456789';for (var i = length; i > 0; --i) {	result += chars[Math.round(Math.random() * (chars.length - 1))];}return result;}
		// Ищи новый способ, как нас заблокировать.
		AnyBalance.setCookie('internet.velcom.by', '_ga', 'GA1.2.' + randomString(10) + '.' + randomString(10));

    var sid = getParam(html, null, null, /name="sid3" value="([^"]*)"/i);
    if(!sid){
		if(AnyBalance.getLastStatusCode() >= 400){
			var error = getParam(html, null, null, /<h1[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, html_entity_decode);
			if(error)
				throw new AnyBalance.Error(error);
			throw new AnyBalance.Error('Сайт временно недоступен. Пожалуйста, попробуйте ещё раз позднее.');
		}
			
		throw new AnyBalance.Error(velcomOddPeople);
    }
    
    var form = getParam(html, null, null, /(<form[^>]*name="mainForm"[^>]*>[\s\S]*?<\/form>)/i);
    if(!form)
		throw new AnyBalance.Error('Не удалось найти форму входа, похоже, velcom её спрятал. Обратитесь к автору провайдера.');
	
	var params = createFormParams(form, function(params, str, name, value) {
		var id=getParam(str, null, null, /\bid="([^"]*)/i, null, html_entity_decode);
		if(id){
			if(/PRE/i.test(id)){ //Это префикс
				value = prefix;
			}else if(/NUMBER|MSISDN/i.test(id)){ //Это номер
				value = phone;
			}else if(/PWD/i.test(id)){ //Это пароль
				value = prefs.password.substr(0, 8);  //Велкам принимает только первые 8 символов всё равно.
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

    /*var required_headers = {
		'origin':'https://internet.velcom.by',
		'referer':'https://internet.velcom.by/',
		'user-agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1985.143 Safari/537.36'
    };*/
	
	try {
		html = requestPostMultipart(baseurl + 'work.html', params, addHeaders({Referer: baseurl}));
	} catch(e) {
		AnyBalance.trace('Error executing multipart request: ' + e.message);
		if(/Read error|failed to respond/i.test(e.message))
			throw new AnyBalance.Error(velcomOddPeople);
		else
			throw new AnyBalance.Error(e.message);
	}
	
	if(AnyBalance.getLastStatusCode() >= 400) {
		throw new AnyBalance.Error(velcomOddPeople);
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
        var error = sumParam(html, null, null, /<td[^>]+class="INFO(?:_Error|_caption)?"[^>]*>(.*?)<\/td>/ig, replaceTagsAndSpaces, html_entity_decode, create_aggregate_join(' '))
		|| sumParam(html, null, null, /<span[^>]+style="color:\s*red[^>]*>[\s\S]*?<\/span>/ig, replaceTagsAndSpaces, html_entity_decode, create_aggregate_join(' '))
	        || getParam(html, null, null, /<td[^>]+class="info_caption"[^>]*>[\s\S]*?<\/td>/ig, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /Неверный пароль или номер телефона|Пароль должен состоять из 8 цифр/i.test(error));
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
    //getParam(html, result, 'min', /Остаток минут, SMS, MMS, (?:МБ|GPRS), включенных в абонплату:[\s\S]*?<td[^>]*>(?:[\s\S](?!<\/td>))*?(-?\d[\d,\.]*) мин(?:ут)?(?:\s*во все сети)?(?:,|\s*<)/i, replaceTagsAndSpaces, parseBalance);
	sumParam(html, result, 'min', [/Остаток исходящего бонуса:[\s\S]*?<td[^>]*>([\s\S]*?мин)/i, /Остаток минут, SMS, MMS, (?:МБ|GPRS), включенных в абонплату:[\s\S]*?<td[^>]*>(?:[\s\S](?!<\/td>))*?(-?\d[\d,\.]*)\s*мин(?:ут)?(?:\s*во все сети)?/i], replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'sms', /Остаток минут, SMS, MMS, (?:МБ|GPRS), включенных в абонплату:[\s\S]*?<td[^>]*>(?:[\s\S](?!<\/td>))*?(-?\d[\d,\.]*)\s*SMS/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'mms', /Остаток минут, SMS, MMS, (?:МБ|GPRS), включенных в абонплату:[\s\S]*?<td[^>]*>(?:[\s\S](?!<\/td>))*?(-?\d[\d,\.]*)\s*MMS/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	getParam(html, result, 'min_fn', /Остаток минут, SMS, MMS, (?:МБ|GPRS), включенных в абонплату:[\s\S]*?<td[^>]*>(?:[\s\S](?!<\/td>))*?(-?\d[\d,\.]*) мин(?:ут)? на ЛН/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'min_velcom', /Остаток минут, SMS, MMS, (?:МБ|GPRS), включенных в абонплату:[\s\S]*?<td[^>]*>(?:[\s\S](?!<\/td>))*?(-?\d[\d,\.]*) мин(?:ут)? на velcom/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'traffic', /Остаток минут, SMS, MMS, (?:МБ|GPRS), включенных в абонплату:[\s\S]*?<td[^>]*>(?:[\s\S](?!<\/td>))*?(-?\d[\d,\.]*)\s*Мб/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'call_barring', /Запрет исходящих с:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateWord);
	
	// Изменилось отображение трафика и минут
	if(!isset(result.min_velcom) || !isset(result.min) || !isset(result.traffic) || !isset(result.mms)) {
		var str = getParam(html, null, null, /Остаток трафика:(?:[^>]*>){3}([\s\S]*?)<\//i);
		if(str) {
			sumParam(html, result, 'min_velcom', /([\s\d]+)мин(?:ут)? на velcom/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			sumParam(html, result, 'min', /([\s\d]+)мин(?!(?:ут)? на velcom)/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			sumParam(html, result, 'mms', /([\s\d]+)(?:MMS|ММС)/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			getParam(html, result, 'traffic', /([\s\d]+[М|M][B|Б])/i, replaceTagsAndSpaces, parseTraffic);
			getParam(html, result, 'traffic_night', /([\s\d]+[М|M][B|Б]\s+ночь)/i, replaceTagsAndSpaces, parseTraffic);
		} else if(/<td[^>]+id="DISCOUNT"/i.test(html)){
			//<tr class="uneven">
            //                     <td class="info_caption"><span>Скидки:</span></td>
            //                     <td class="info" id="DISCOUNT" colspan="2"><span>У вас осталось 949776 Кб 1 Кб </span></td>
            //                  </tr>
			getParam(html, result, 'traffic', /<td[^>]+id="DISCOUNT"[^>]*>([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /^\D+/, ''], parseTraffic);
		}else{
			AnyBalance.trace(html);
			AnyBalance.trace('Не удалось найти остатки трафика, минут и ммс, сайт изменен?');
		}
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