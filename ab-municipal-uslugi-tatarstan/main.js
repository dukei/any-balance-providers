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
	var baseurl = 'https://uslugi.tatarstan.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'user/login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'user_login_form_model[phone_number]') 
			return prefs.login;
		else if (name == 'user_login_form_model[password]')
			return prefs.password;

		return value;
	});
    
	html = AnyBalance.requestPost(baseurl + 'user/login', params, addHeaders({Referer: baseurl}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /error_explanation[^>]*>[\s\S]*?([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
    // получаем данные пользователя из личного кабинета
    html = AnyBalance.requestGet(baseurl + 'user', g_headers);
    
	var result = {success: true};
    
    var lastname = getParam(html, null, null, /Фамилия(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    var firstname = getParam(html, null, null, /Имя(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    // var snils = getParam(html, null, null, /СНИЛС(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    var inn = getParam(html, null, null, /ИНН(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    
    getParam(html, result, 'fio', /information[\s\S]*?<span>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    
	// Определяем что нам нужно получать
	processGibdd(html, baseurl, prefs, result);
	// Запросим налолги
	processNalog(html, baseurl, prefs, result, lastname, firstname, inn);
	// Запросим ЖКХ
	processGKH(html, baseurl, prefs, result);
	// Запросим детсад
	processCei(html, baseurl, prefs, result);
	
	AnyBalance.setResult(result);
}

function processCei(html, baseurl, prefs, result) {
	if(isAvailable(['cei_balance', 'cei_info'])) {
		var html = AnyBalance.requestGet(baseurl, g_headers);
		
		var informers = sumParam(html, null, null, /<li[^>]*class="cei_pay"(?:[^>]*>){18,22}\s*<\/li>/ig);
		AnyBalance.trace('Found informers: ' + informers.length);
		
		if(!informers.length)
			return;
		
		var info = '';
		for(var i=0; i< informers.length; i++) {
			var curr = informers[i];
			var name = getParam(curr, null, null, /<b[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);
			var sum = sumParam(curr, null, null, />([^<]*услуги:\s*[-\d.,]+)/ig, replaceTagsAndSpaces, null, aggregate_join);
			
			info += '<b>' + name + '</b>: ' + sum + '<br/><br/>';
			sumParam(curr, result, 'cei_balance',  />([^<]*услуги:\s*[-\d.,]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
		}
		getParam(info, result, 'cei_info', null, [/<br\/><br\/>$/i, '']);
    }
}

function processGKH(html, baseurl, prefs, result) {
	if(isAvailable(['house_info', 'house_balance'])) {
		var html = AnyBalance.requestGet(baseurl, g_headers);
		
		var informers = sumParam(html, null, null, /<li[^>]*class="house"(?:[^>]*>){10,11}\s*<\/li>/ig);
		AnyBalance.trace('Found informers: ' + informers.length);
		
		if(!informers.length)
			return;
		
		var house_info = '';
		for(var i=0; i< informers.length; i++) {
			var curr = informers[i];
			var name = getParam(curr, null, null, /<b>([\s\S]*?)<\/b>/i);
			var sum = getParam(curr, null, null, [/Начислено(?:[^>]*>){2}\s*([-\d.,]+)/i, /Начислено:?\s*([-\d.,]+)/i]);
			
			house_info += '<b>' + name + '</b>: ' + sum + '<br/><br/>';
			sumParam(sum, result, 'house_balance', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
		}
		getParam(house_info, result, 'house_info', null, [/<br\/><br\/>$/i, '']);
    }
}

function processNalog(html, baseurl, prefs, result, lastname, firstname, inn) {
	if(isAvailable('nalog_info')) {
		// получаем данные о налоговой задолженности
		var html = AnyBalance.requestGet(baseurl + 'taxes/index', g_headers);
		params = createFormParams(html, function(params, str, name, value) {
			if (name == 'inn')
				return prefs.inn || inn;
			else if (name == 'lastname')
				return lastname;
			else if (name == 'firstname')
				return firstname;

			return value;
		});
		
		html = AnyBalance.requestPost(baseurl + 'taxes/index', params, addHeaders({Referer: baseurl}));
		html = AnyBalance.requestGet(baseurl + 'taxes/debt', g_headers);
		
		var debt_table = getParam(html, null, null, /Налоговые\sзадолженности[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i);
		var array = sumParam(debt_table, null, null, /<tr>[\s\S]*?<\/tr>/ig);
		var html_response = '';
		
		for(var i = 0; i < array.length; i++) {
			var current = array[i];
			
			var type = getParam(current, null, null, /<td(?:[^>]*>){4}([^<]+)/i, replaceTagsAndSpaces) || 'Неизвестный тип налога'; // Транспортный налог
			var agency = getParam(current, null, null, /<td(?:[^>]*>){7}([^<]+)/i, replaceTagsAndSpaces) || 'Неизвестно'; // УПРАВЛЕНИЕ ФЕДЕРАЛЬНОГО КАЗНАЧЕЙСТВА ПО МОСКОВСКОЙ ОБЛАСТИ (Межрайонная ИФНС России № 3 по Московской области)
			var sum = getParam(current, null, null, /налог:(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces) || 0; // Сумма налога
			var fine = getParam(current, null, null, /пеня:(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces) || 0; // Пени
			//var date = getParam(current, null, null, /(По состоянию на:[^>]*>[^<]+)/i, replaceTagsAndSpaces) || 'Неизвестная дата'; // На дату
			// Формируем html
			html_response += agency + ':<br/>' + type + ': ' + ' <b>Налог: ' + sum + ' Пеня: ' + fine + '</b>' + '<br/><br/>';
			
			sumParam(sum, result, 'nalog_balance', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			sumParam(fine, result, 'nalog_balance', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
		}
		getParam(html_response, result, 'nalog_info', null, [/<br\/><br\/>$/i, '']);
    }	
}

function processGibdd(html, baseurl, prefs, result) {
	if(isAvailable(['gibdd_balance', 'gibdd_all'])) {
		var plates = [];
		
		if(isset(prefs.plate) && isset(prefs.sr)) {
			AnyBalance.trace('Указаны данные по автомобилям в настройках, получаем данные по заданным автомобилям...');
			
			var prefs_plates = prefs.plate.split(',');
			var prefs_srs = prefs.sr.split(',');
			
			for(var i = 0; i < prefs_plates.length; i++) {
				plates.push([prefs_plates[i], prefs_srs[i]]);
				AnyBalance.trace('Нашли автомобиль в настройках: ' + prefs_plates[i] + ': ' + prefs_srs[i]);
			}
		} else {
			AnyBalance.trace('Не указаны автомобили в настройках, получим данные из информеров...');
			
			var cars = sumParam(html, null, null, /Автомобиль(?:[^>]*>){19}\s*<\/div>/ig);
			for(var i = 0; i < cars.length; i++) {
				var plate = getParam(cars[i], null, null, /Гос номер ТС(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces) || '';
				var reg = getParam(cars[i], null, null, /Регион ТС(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces) || '';
				var sr = getParam(cars[i], null, null, /Номер свидетельства о регистрации ТС(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces) || '';
				
				plates.push([plate + reg, sr]);
				AnyBalance.trace('Нашли автомобиль: ' + plate + reg + ': ' + sr);
			}
		}
		
		for(var i = 0; i < plates.length; i++)  {
			var values = plates[i];
			getGibddAPI(baseurl, i, result, values[0], values[1]);
		}
	}
}

function getGibddAPI(baseurl, count, result, plate, sr) {
	AnyBalance.trace('Ищем штрафы с данными: '+ plate + ' (' + sr + ')');
	var isAuto = /^\D/.test(plate);
	var number = getParam(plate, null, null, /^.\d\d\d../);
	var region = getParam(plate, null, null, /(\d+)$/);

	var html = AnyBalance.requestPost(baseurl + 'gibdd/fines/getFromApi', {
		findType:'car',
		type_ts:isAuto ? 'auto' : 'moto',
		number:number,
		region:region,
		doc_nm:sr,
		find_protocol_region:'',
		find_protocol_series:'',
		find_protocol_number:'',
		find_protocol_date:''
	}, addHeaders({'x-requested-with':'XMLHttpRequest'}));
		
	var json = getJson(html);
	
	for(var i = 0; i < 10; i++) {
		AnyBalance.sleep(1000);
		
		html = AnyBalance.requestGet(baseurl + 'gibdd/fines/getBy/message_id/' + (json.message_id || json.id), g_headers);
		json = getJson(html);
		
		if(json.status != 'in_processing') {
			AnyBalance.trace('Данные успешно обновлены за ' + (i+1) + ' сек.');
			break;
		}
	}
	
	if(!json.response || !isset(json.response.fines) || json.response.fines.length == 0) {
		AnyBalance.trace('Не найдено штрафов..');
		sumParam('0', result, 'gibdd_balance', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	} else {
		for(var z = 0; z < json.response.fines.length; z++) {
			var current = json.response.fines[z];
			
			sumParam(current.amount + '', result, 'gibdd_balance', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			//sumParam(current.date+'', result, 'gibdd_lastdate', null, replaceTagsAndSpaces, parseDate, aggregate_max);
		}
	}
	
}