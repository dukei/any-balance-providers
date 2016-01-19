/**
Тест для library.js
*/

function main() {
    var result = {success: true};
	
	AnyBalance.trace(capitalFirstLetters('ИвАНоВ и. иваНОВИЧ'));
	
	AnyBalance.setCookie('ya.ru', 'somecookie', 'val', {path: 'some/path'});
	requestPostMultipart('http://ya.ru/some/path', {}, '');

	var val = AnyBalance.getCookie('somecookie')
    AnyBalance.trace(val == val ? 'Проверяем setCookie и getCookie... все работает нормально!' : '_________________________________________________Что-то не работает, надо проверить код! ' + val);
	
    // Тестируем декод
    getParam('<title>&#1057;&#1080;&#1089;&#1090;&#1077;&#1084;&#1072; &#1089;&#1072;&#1084;&#1086;&#1086;&#1073;&#1089;&#1083;&#1091;&#1078;&#1080;&#1074;&#1072;&#1085;&#1080;&#1103;</title>', result, 'title', /<title>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    AnyBalance.trace(result.title == 'Система самообслуживания' ? 'Проверяем функцию декода... все работает нормально!' : 'Что-то не работает, надо проверить код! ' + result.title);
    // Тестируем парсинг баланса
    getParam('Текущий баланс: <b>1,000,555,48</b>', result, 'balance', /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
    AnyBalance.trace(result.balance == 1000555.48 ? 'Проверяем функцию parseBalance... все работает нормально!' : '_________________________________________________Что-то не работает, надо проверить код! ' + result.balance);
    
	getParam('Текущий баланс: <b>.48</b>', result, 'balance_bad', /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
    AnyBalance.trace(result.balance_bad == 0.48 ? 'Проверяем функцию parseBalance с противными значениями типа (.48)... все работает нормально!' : '_________________________________________________Что-то не работает, надо проверить код! ' + result.balance_bad);
    
	getParam('Текущий баланс: <b>-.38</b>', result, 'balance_bad2', /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
    AnyBalance.trace(result.balance_bad2 == -0.38 ? 'Проверяем функцию parseBalance с противными значениями типа (-.38)... все работает нормально!' : '_________________________________________________Что-то не работает, надо проверить код! ' + result.balance_bad2);
    
	getParam('Текущий баланс: <b>,48</b>', result, 'balance_bad3', /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
    AnyBalance.trace(result.balance_bad3 == 0.48 ? 'Проверяем функцию parseBalance с противными значениями типа (,48)... все работает нормально!' : '_________________________________________________Что-то не работает, надо проверить код! ' + result.balance_bad3);
    
	getParam('Текущий баланс: <b>–,48</b>', result, 'balance_bad4', /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
    AnyBalance.trace(result.balance_bad4 == -0.48 ? 'Проверяем функцию parseBalance с противными значениями типа (–,48)... все работает нормально!' : '_________________________________________________Что-то не работает, надо проверить код! ' + result.balance_bad4);

	getParam('Текущий баланс: <b>-238,20 руб.</b>', result, 'balance_bad5', /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
    AnyBalance.trace(result.balance_bad5 == -238.20 ? 'Проверяем функцию parseBalance с противными значениями типа (-238,20 руб.)... все работает нормально!' : '_________________________________________________Что-то не работает, надо проверить код! ' + result.balance_bad5);
    
    
	getParam("Текущий баланс: <b>1'131,00</b>", result, 'balance', /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
    AnyBalance.trace(result.balance == 1131 ? 'Проверяем функцию parseBalance... все работает нормально!' : '_________________________________________________Что-то не работает, надо проверить код! ' + result.balance);
    // Суммируем
	sumParam('Текущий баланс: <b>1,000,000,00</b>Текущий баланс: <b>1,000,000,00</b>Текущий баланс: <b>1,000,000,00</b>', result, 'balance_sum', /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	AnyBalance.trace(result.balance_sum == 3000000.00 ? 'Проверяем функцию sumParam и aggregate_sum... все работает нормально!' : 'Что-то не работает, надо проверить код! ' + result.balance_sum);
	// Выбираем минимальное
	sumParam('Текущий баланс: <b>1,00</b>Текущий баланс: <b>2,00</b>Текущий баланс: <b>3,00</b>', result, 'balance_min', /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/ig, replaceTagsAndSpaces, parseBalance, aggregate_min);
	AnyBalance.trace(result.balance_min == 1.00 ? 'Проверяем функцию sumParam и aggregate_min... все работает нормально!' : 'Что-то не работает, надо проверить код! ' + result.balance_min);
	// Тестируем трафик
	getParam('Остаток трафика: <b>24 гб</b>', result, 'traf_gb', /Остаток трафика:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseTraffic);
	AnyBalance.trace(result.traf_gb == 24*1024 ? 'Проверяем функцию parseTraffic в гигабайтах... все работает нормально!' : 'Что-то не работает, надо проверить код! ' + result.traf_gb);
	getParam('Остаток трафика: <b>1 024 мб</b>', result, 'traf_mb', /Остаток трафика:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseTraffic);
	AnyBalance.trace(result.traf_mb == 1024 ? 'Проверяем функцию parseTraffic в мегабайтах... все работает нормально!' : 'Что-то не работает, надо проверить код! ' + result.traf_mb);
	getParam('Остаток трафика: <b>2 048 кб</b>', result, 'traf_kb', /Остаток трафика:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseTraffic);
	AnyBalance.trace(result.traf_kb == 2 ? 'Проверяем функцию parseTraffic в килобайтах... все работает нормально!' : 'Что-то не работает, надо проверить код! ' + result.traf_kb);
	// Тестируем parseDateWord
	AnyBalance.trace('Проверяем функцию parseDateWord... проверьте правильность парсинга дат!');
	var months = ['янв', 'jan', 'январь', 'января', 'февраль', 'февраля','март', 'марта','апрель', 'апреля','май', 'мая','июнь', 'июня','июль', 'июля','август', 'августа','сентября', 'сентябрь','октября', 'октябрь','ноября', 'ноябрь','декабря', 'декабрь'];
	for (i = 0; i < months.length; i++) {
		var date = parseDateWord('11 ' + months[i] + ' 2013');
	}
	AnyBalance.trace('Проверяем функцию parseDateWord... Парсим дату без года');
	for (i = 0; i < months.length; i++) {
		var date = parseDateWord('14 ' + months[i]);
	}
	
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.trace('Проверяем функцию createFormParams...');
	var params = createFormParams(sample.form, function(params, str, name, value) {
		if (name == 'ULOGIN') 
			return 'TEST_LOGIN';

		return value;
	});	
	if(params.CHANNEL == 'WWW' && params.CHANNELTYPE == 'COMMON' && params.PREFIX == '' && params.P_ISOC_ID == '' && params.SESSION_ID == '' && params.ULOGIN == 'TEST_LOGIN')
		AnyBalance.trace('createFormParams все сделала правильно, она молодец :)');
	else 
		AnyBalance.trace('createFormParams что-то не правильно разобрала, проверьте код! ' + JSON.stringify(params));
	
	AnyBalance.trace('Проверяем parseMinutes...');
	// в array четные (начиная с 0) это что парсить, не четные результат для сравнения
	var times = [
		// отдельно часы, минуты, секунды
		'1 ч', '3600',
		'2 h', '7200',
		'3 часа', '10800',
		'4 hour', '14400',
		// минуты
		'1 м', '60',
		'2 m', '120',
		'3 минуты', '180',
		'4 minutes', '240',
		// секунды
		'1 с', '1',
		'2 s', '2',
		'3 секунды', '3',
		'4 seconds', '4',
		'2 340,00 сек.', '2340',
		// Минуты и секунды
		'1 м 2 с', '62',
		'28мин.40сек', '1720',
		// Часы и минуты
		'1 ч 2 м', '3720',
		'2 h 3 m', '7380',
		'3 часа 4 минуты', '11040',
		'4 hours 5 minutes', '14700',
		// через двоеточие
		'01:02', '62',
		'02:03', '123',
		'03:04', '184',
		'04:05', '245',
		// часы минуты и секунды
		'1 ч 2 м 3 c', '3723',
		'2 h 3 m 4 s', '7384',
		'3 часа 4 минуты 5 секунд', '11045',
		'4 hours 5 minutes 6 seconds', '14706',
		// через двоеточие
		'01:02:03', '3723',
		'02:03:04', '7384',
		'03:04:05', '11045',
		'04:05:06', '14706',
		// Просто число
		'1', '60',
		'2', '120',
		// Извращения
		'5:01&#65533мин', '301',
		'300 &#65533;мин ', '18000',
		'295:40 мин', '17740',
		'49.25', '2955',
		'454.29', '27257.4',
		'2 340,00 сек', '2340'		
	];
	var temp = 0;
	for (var i = 0; i < times.length; i++) {
		AnyBalance.trace('Parsing item ' + (temp+1) + ': ' + times[i]);
		var parsed = parseMinutes(html_entity_decode(times[i]));
		var res = times[++i];
		
		if(res == parsed) {
			AnyBalance.trace('Item ' + (temp++) + ' parsed ok');
		} else {
			AnyBalance.trace('!!!____________________________________________________________Item ' + (temp++) + ' parsing failed: should be ' + res + ', parsed ' + parsed + '!!!');
		}
	}

	var html = '<span sl> <div class="test"> parsed <div class="test"></div> <span sdflj> it </span> <div askdfj> ok </div>!</div> test </div>';
	var str = getElement(html, /<\w+[^>]+class="test"[^>]*>/i, replaceTagsAndSpaces);
	var res = /^parsed\sit\sok\s!$/i;
	if(res.test(str))
		AnyBalance.trace('getElement is ok');
	else
		AnyBalance.trace('!!!____________________________________________________________getElement test is failed: should be ' + res.source + ', parsed ' + str + '!!!');

	var html = '<div class="accountDetailTextBlock">\
									<div class="accountTitle totalAccountUp">\
										ИТОГО\
									</div><div class="accountTitle">\
										собственные средства\
									</div><div class="accountTitle">\
										кредитные средства\
									</div>\
								</div>';
	var a = getElements(html, /<div[^>]*>/ig);
	if(a.length == 1)
		AnyBalance.trace('getElements is ok');
	else
		AnyBalance.trace('!!!____________________________________________________________getElements test is failed: should be ' + 1 + ', parsed ' + a.length + '!!!');
	
	var a = getElements(html.substr(1), /<div[^>]*>/ig);
	if(a.length == 3)
		AnyBalance.trace('getElements is ok');
	else
		AnyBalance.trace('!!!____________________________________________________________getElements test is failed: should be ' + 3 + ', parsed ' + a.length + '!!!');


	var str = getJsonObject(sample.js, /var\s+super\s*=(?=\s*\{)/);
	if(str && str.i == 1)
		AnyBalance.trace('getJsonObject (part1) is ok');
	else
		AnyBalance.trace('!!!____________________________________________________________getJsonObject (part1) test is failed!!!');
	
	var js = getJsonObject(sample.mgts, /mgts.data.widgets =/);
	if(js.length == 7)
		AnyBalance.trace('getJsonObject (part2) is ok');
	else
		AnyBalance.trace('!!!____________________________________________________________getJsonObject (part2) test is failed!!!');
	
		
	//checkEmpty(prefs.s, 'checkEmpty работает нормально!');

	/*getParam(html, result, 'fio', /Имя абонента:(?:[\s\S]*?<b[^>]*>){1}([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'phone', /Номер:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'deadline', /Действителен до:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, ['currency', 'balance'], /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'status', /Статус:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);*/

	getParam(undefined, result, 'status', /Статус:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	
	// Тестируем форматирование дат
	var dates = [{
			format: 'DD/MM/YYYY',
			offsetDay: 0,
			offsetMonth: 0,
			offsetYear: 5,
			// То, что на входе, дата
			inputDate: '01.01.2015',
			// Что на выходе
			expectedOutput: '01/01/2010'
		}, {
			format: 'D/M/YY',
			offsetDay: 0,
			offsetMonth: 0,
			offsetYear: 5,
			// То, что на входе, дата
			inputDate: '01.01.2015',
			// Что на выходе
			expectedOutput: '1/1/10'
		},
	];
	
	for(var i = 0; i < dates.length; i++) {
		var obj = dates[i];
		
		var dt = new Date(obj.inputDate);
		var res = getFormattedDate(obj, dt);
		
		if(res === obj.expectedOutput)
			AnyBalance.trace('getFormattedDate is ok');
		else
			AnyBalance.trace('!!!____________________________________________________________getFormattedDate test is failed!!!');
	}
	
	AnyBalance.setResult(result);
}
