/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Провайдер NCC (Республика Татарстан, Нижегородский филиал)
Сайт оператора: http://ncc-volga.ru/
Личный кабинет: https://iserve.ncc-volga.ru/
**/

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://iserve.ncc-volga.ru/';
	AnyBalance.setDefaultCharset('koi8-r');
	// Заходим на главную страницу
	var info = AnyBalance.requestPost(baseurl ,{
		path:'iserv',
		userv:prefs.userv,
		passv:prefs.passv
	});
	// Проверяем успешный ли вход
	if(!/path=exit/i.test(info)){
		var error = getParam(info, null, null, /<div class="tech">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	        if(error)
        		throw new AnyBalance.Error(error);
		error = getParam(info, null, null, /<div[^>]*class="info_block_right"[^>]*>[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	        if(error)
        		throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	getParam(info, result, 'balance', /<dd[^>]*>Баланс:<\/dd>\s*<dd[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'bonus', /<dd[^>]*>Бонус:<\/dd>\s*<dd[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'filial', /<dd[^>]*>Филиал:<\/dd>\s*<dd[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'phone', /<dd[^>]*>Номер:<\/dd>\s*<dd[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	// Теперь аккумуляторы
	if(isAvailable(['accum_trafic', 'accum_mins', 'accum_sms', 'accum_rub'])) {
		AnyBalance.trace('Requesting accumulators info...');
		info = AnyBalance.requestGet(baseurl + '?path=services');
		
		var table = getParam(info, null, null, /Аккумуляторы[\s\S]*?(<table[\s\S]*?<\/table>)/i, null, html_entity_decode);
		if(table){
			// Получаем все ряды из таблицы, там и смс и интернет..
			var Rows = sumParam(table, null, null, /(<tr>\s*<td[^>]*[\s\S]*?\/tr>)/ig, null, html_entity_decode, null);
			for (i = 0; i < Rows.length; i++){
				var row = Rows[i];
				// Это трафик не знаю надо ли его суммировать? пока не будем, если попросят потом сделаем
				if(/мб/i.test(row))
					getParam(row, result, 'accum_trafic', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, null, parseTraffic);
				else if(/мин/i.test(row))
					getParam(row, result, 'accum_mins', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, null, parseBalance);
				else if(/смс|sms/i.test(row))
					getParam(row, result, 'accum_sms', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, null, parseBalance);
				else if(/руб/i.test(row))
					getParam(row, result, 'accum_rub', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, null, parseBalance);
			}
		}
		else
			AnyBalance.trace('Не удалось найти таблицу с аккумуляторами. Сайт изменен?');
	}
	info = AnyBalance.requestGet(baseurl + '?path=allbills');
	getParam(info, result, '__tariff', /Тарифный план(?:[\s\S]*?<td[^>]*>){3}\s*([\s\S]*?)\s*<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'acc_num', /Тарифный план(?:[\s\S]*?<td[^>]*>){1}\s*([\s\S]*?)\s*<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

	if(isAvailable('trafic')){
		AnyBalance.trace('Fetching trafic info...');
		var table = getParam(info, null, null, /Трафик за текущий месяц[\s\S]*?(<table[\s\S]*?<\/table>)/i, null, html_entity_decode);
		if(table){
			// Получаем все ряды из таблицы, там и смс  и ммс и интернет..
			var trafRows = sumParam(table, null, null, /(<tr>\s*<td[^>]*class="normal"[\s\S]*?<\/tr>)/ig, null, html_entity_decode, null);
			for (i = 0; i < trafRows.length; i++){
				var row = trafRows[i];
				// Это трафик
				if(/кбайт/i.test(row))
					sumParam(row, result, 'trafic', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig, null, parseTraffic, aggregate_sum);
			}
		}
		else
			AnyBalance.trace('Не удалось найти таблицу с трафиком. Сайт изменен?');
	}
	AnyBalance.setResult(result);
};