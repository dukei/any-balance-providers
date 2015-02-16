/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.111 Safari/537.36',
};

function parseTrafficMb(str){
    var val = parseBalance(str);
    if(isset(val))
        val = Math.round(val/1024*100)/100;
    return val;
}

function parseTime (str) {
    var t = parseFloat(str);
    if(!str || !t)
    return;

    return 60 * parseFloat(str)
    }

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://ihelper-prp.mts.com.ua/SelfCareUA/';
	AnyBalance.setDefaultCharset('utf-8');
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	var html = AnyBalance.requestGet(baseurl + 'Logon', g_headers);
	var captchaa;
	if (AnyBalance.getLevel() >= 7) {
		AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet(baseurl + 'Captcha/ShowForLogon');
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha, {time: 120000});
		AnyBalance.trace('Капча получена: ' + captchaa);
	} else {
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}

	html = AnyBalance.requestPost(baseurl + 'Logon', {
		Captcha:captchaa,
		PhoneNumber: prefs.login,
		Password: prefs.password
	}, addHeaders({Referer: baseurl + 'Logon'}));

	if (!/logOff/i.test(html)) {
		if(/InvalidCaptcha/i.test(html))
			throw new AnyBalance.Error('Не верно введены символы с картинки!');

		var error = getParam(html, null, null, /(?:ОШИБКА<\/div>\s+<\/div>\s+<div[^>]*>\s+<div[^>]*>|Error.[\s\S]*text":")([\s\S]*?)(?:<\/div>|","isError)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Невірний пароль/i.test(error));

		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};
	//Тариф и денежные балансы
	getParam (html, result, '__tariff', /Тариф<\/span>\s+<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Баланс<\/span>\s+<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus_balance', /Денежный бонусный счет: осталось\s*([\s\S]*?)\s*грн/i, replaceTagsAndSpaces, parseBalance);
	getParam (html, result, 'bonus_balance_termin', />Денежный бонусный счет: осталось [\s\S]* грн. Срок действия до([^<]*)<\/span>/i, replaceTagsAndSpaces, parseDate);

	//Секция бонусов
	getParam(html, result, 'bonusy', /ВАШ БОНУСН(?:И|Ы)Й (?:РАХУНОК|СЧЕТ)<\/div>\s+<div[^>]*>\s+<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonusy_burn', /буд(?:е|ет) списано\s*(\d+)\s*бонус(?:і|о)в/i, replaceTagsAndSpaces, parseBalance);
	getParam (html, result, 'bonusy_burn_termin', />([^<]*) буд(?:е|ет) списано/i, replaceTagsAndSpaces, parseDate);

        //Минуты
	//Минуты в сети МТС которые действуют в регионе
	sumParam (html, result, 'hvylyny_net1', /минут в день для внутрисетевых звонков: осталось\s*(\d+)\s*бесплатных секунд/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam (html, result, 'hvylyny_net1', />Безкоштовні хвилини на добу в рамках "Супер без поповнення", залишилось\s*([\d\.,]+)\s*безкоштовних хвилин<\/span>/ig, parseBalance, parseTime, aggregate_sum);

	//Минуты в сети МТС которые действуют вне региона
	getParam (html, result, 'hvylyny_net2', /минут в день вне региона, осталось\s*([\d\.,]+)\s*минут<\/span>/i, parseBalance, parseTime);

	//Пакетные минуты в сети МТС общенациональные
	sumParam (html, result, 'hvylyny_net3', /минут внутри сети, осталось\s*(\d+)\s*бесплатных секунд/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam (html, result, 'hvylyny_net3', /(?:15|30)00 минут на МТС для (?:MAX Energy Allo|MAX Energy), осталось\s*(\d+)\s*бесплатных секунд/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);

	sumParam (html, result, 'hvylyny_net3_termin', /минут внутри сети, осталось \d+ бесплатных секунд до\s*([^<]*)\s*<\/span>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);

	//Минуты по Украине
	sumParam (html, result, 'hvylyny_all1', /(?:50 хвилин на всi мережi|100 минут по Украине для MAX Energy Allo), осталось\s*(\d+)\s*(?:секунд на все сети|бесплатных секунд)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);

	//СМС и ММС
	sumParam (html, result, 'sms_used', />50 SMS по Украине для "Смартфона", израсходовано:(\d+)\s*смс.<\/span>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam (html, result, 'mms_used', />50 MMS по Украине для "Смартфона", израсходовано:(\d+)\s*mms.<\/span>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam (html, result, 'sms_net', />1500 (?:SMS|SMS и MMS) на МТС для (?:MAX Energy Allo|MAX Energy), осталось (\d+) (?:бесплатных SMS|смс)</ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam (html, result, 'mms_net', />1500 SMS и MMS на МТС для MAX Energy, осталось (\d+) ммс</ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);

	//Трафик
	//Пакет (интернет за копейку 1000 за 10, еще должны быть 1500 за 15 и 2000 за 20)
	sumParam (html, result, 'traffic1', /1000 МБ за 10 грн., осталось:\s*(\d+,?\d* *(Кб|kb|mb|gb|кб|мб|гб|байт|bytes)).<\/span>/ig, null, parseTrafficMb, aggregate_sum);
	//Ежедневный пакет? тут старое описание не работает, нужен номер с таким пакетом, что бы исправить
	getParam (html, result, 'traffic2', /Кб.<\/span>\s*<\/div>\s*<div[^>]*>\s*<span[^>]*>Осталось:\s*(\d+,?\d* *(Кб|kb|mb|gb|кб|мб|гб|байт|bytes)).<\/span>/i, null, parseTrafficMb);
	//Пакет на месяц в тарифе
	sumParam (html, result, 'traffic3', /(?:15|30)00 Mb GPRS Internet для (?:MAX Energy Allo|MAX Energy), осталось\s*(\d+)\s*(?:бесплатных Kб|kб).<\/span>/ig, null, parseTrafficMb, aggregate_sum);
	//Смарт.NET
	getParam (html, result, 'traffic4', /секунд<\/span>\s*<\/div>\s*<div[^>]*>\s*<span[^>]*>Осталось:\s*(\d+,?\d* *(Кб|kb|mb|gb|кб|мб|гб|байт|bytes)).<\/span>/i, null, parseTrafficMb);

	//Пример работы с масивом
//	sumParam (html, result, 'traffic', /Осталось:\s*(\d+,?\d* *(Кб|kb|mb|gb|кб|мб|гб|байт|bytes)).<\/span>/ig, null, parseTrafficMb);
//	for(var i=0; i<arr.length; ++i){
//          getParam(arr[i], result, 'counter' + i);
//      }

	//Особые параметры
	getParam (html, result, 'PZS_MB_opera', />OperaMini: ПЗС за первое событие для APN opera:\s*(\d+)<\/span>/ig, replaceTagsAndSpaces, parseBalance);
	getParam (html, result, 'PZS_first', />Снятие ПЗС за первое событие:\s*(\d+)<\/span>/ig, replaceTagsAndSpaces, parseBalance);
	getParam (html, result, 'PZS_first_out', />Единоразовое ПЗС за пределами региона \(Смартфон\):\s*(\d+)<\/span>/ig, replaceTagsAndSpaces, parseBalance);

	//Второстепенные параметры
	getParam(html, result, 'spent', /Витрачено за номером \+\d\d\d \d\d \d\d\d-\d\d-\d\d за період з \d\d.\d\d до \d\d.\d\d.\d\d\d\d \(з урахуванням ПДВ і збору до ПФ\)<\/span>\s*<div[^>]*><span>([\s\S]*?)\s*<small>грн/i, replaceTagsAndSpaces, parseBalance);
	getParam (html, result, 'phone', /Номер<\/span>\s+<span[^>]*>([^<]*)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

	//Подключенные пакеты
	//3G копейка
	html = AnyBalance.requestPost(baseurl + 'ActiveServices', addHeaders({Referer: baseurl + 'ActiveServices'}));

	if(/Извините, на данный момент, из-за технических причин сервис временно не доступен. Попробуйте повторить позже./i.test(html)){
		throw new AnyBalance.Error("Извините, на данный момент, из-за технических причин сервис временно не доступен. Попробуйте повторить позже.");
	}

	getParam (html, result, '3G_kopiyka_termin', /3G Копійка","DateFrom":"([^"]*)",/i, replaceTagsAndSpaces, parseDate);

	AnyBalance.setResult(result);
}