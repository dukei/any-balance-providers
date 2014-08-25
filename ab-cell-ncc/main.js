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
        var error = getParam(info, null, null, /<div[^>]*class="info_block_right"[^>]*>[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
	var result = {success: true};
	// Зачем?!
	// Татарстан
	/*if(prefs.region == '1'){
		if(AnyBalance.isAvailable('balance')){
			if(matches = info.match(/<dd.*?>Баланс:<\/dd>\s*<dd.*?>(.*?) руб.<\/dd>/i)){
				result.balance = parseFloat(matches[1].replace(',','.'));
			}
			else{
				throw new AnyBalance.Error("Error");
			}
		}
		if(AnyBalance.isAvailable('bonus')){
			if(matches = info.match(/<dd.*?>Бонус:<\/dd>\s*<dd.*?>(.*?) руб.<\/dd>/i)){
				result.bonus = parseFloat(matches[1].replace(',','.'));
			}
		}
	}
	else if(prefs.region == "2"){	// Нижегородский
		if(AnyBalance.isAvailable('balance')){
			if(matches = info.match(/<dd.*?>Баланс:<\/dd><dd.*?>(.*?) руб.<\/dd><\/dl>/i)){
				result.balance = parseFloat(matches[1].replace(',','.'));
			}
			else{
				throw new AnyBalance.Error("Error");
			}
		}
		if(AnyBalance.isAvailable('bonus')){
			if(matches = info.match(/<dd.*?>Бонус:<\/dd><dd.*?>(.*?) руб.<\/dd>/i)){
				result.bonus = parseFloat(matches[1].replace(',','.'));
			}
		}
	}*/
	getParam(info, result, 'balance', /<dd[^>]*>Баланс:<\/dd>\s*<dd[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'bonus', /<dd[^>]*>Бонус:<\/dd>\s*<dd[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'filial', /<dd[^>]*>Филиал:<\/dd>\s*<dd[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'phone', /<dd[^>]*>Номер:<\/dd>\s*<dd[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	// Теперь аккумуляторы
	if(isAvailable(['accum_trafic', 'accum_mins', 'accum_sms'])) {
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
			}
		}
		else
			AnyBalance.trace('Не удалось найти таблицу с аккумуляторами. Сайт изменен?');
	}
	info = AnyBalance.requestGet(baseurl + '?path=allbills');
	getParam(info, result, '__tariff', /Тарифный план(?:[\s\S]*?<td[^>]*>){3}\s*([\s\S]*?)\s*<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'acc_num', /Тарифный план(?:[\s\S]*?<td[^>]*>){1}\s*([\s\S]*?)\s*<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

	if(isAvailable('trafic'/*, 'traf1', 'traf2', 'traf3'*/)){
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
		/*if(matches = info.match(/Трафик за текущий месяц[\s\S]*?Использовано([\s\S]*?)<\/table>/))
		{
			AnyBalance.trace("Fetching trafic info...");
			var trafinfo = matches[1];

			if(matches = trafinfo.match(/<tr>([\s\S]*?)<\/tr>/g))
			{
				/* всё равно закомментарено в манифесте 
				result.traf1 = 0;
				result.traf2 = 0;
				result.traf3 = 0;
				*
				var globaltraf = 0;

				for (i=0; i<matches.length; i++){
	                		if(matches_line = matches[i].match(/<td.*?>(?:\s*)(.*?)<\/td>[\s\S]*?<td.*?>(?:\s*)(.*?) Кбайт<\/td>/)){
						type = matches_line[1].toLowerCase();
						var traf = parseFloat(matches_line[2].replace(',','.'))/1024;

						/* всё равно закомментарено в манифесте 
						if(type.indexOf("internet")>=0)
							result.traf1 = result.traf1 + traf;
						else
						if(type.indexOf("wi-fi")>=0)
							result.traf2 = result.traf2 + traf;
						else
						if(type.indexOf("wap")>=0)
							result.traf3 = result.traf3 + traf;
				                *
						// Можно писать так globaltraf += traf;
						globaltraf = globaltraf + traf;
					}
				}
				/* всё равно закомментарено в манифесте 
				result.traf1 = result.traf1.toFixed(3);
				result.traf2 = result.traf2.toFixed(3);
				result.traf3 = result.traf3.toFixed(3);*
 				
				// Опять же зачем? isAvailable('trafic') == true в данном случае всегда!
				//if(AnyBalance.isAvailable('trafic'))
				result.trafic = globaltraf.toFixed(3);
			}
		}*/
	}
	AnyBalance.setResult(result);
};