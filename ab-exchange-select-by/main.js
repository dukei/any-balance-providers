/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает курсы валют в белорусских банках с сайта http://select.by/kurs

Сайт: http://select.by
Личный кабинет: http://select.by/kurs/
*/

function getKurs($row, result, counter, idx, bank){
	if(AnyBalance.isAvailable(counter)){
		var text = $row.find(bank ? 'td:nth-child('+idx+')' : 'th:nth-child('+idx+')>b').text();
		if(text){
			var price = parseFloat(text);
			result[counter] = price;
			return price;
		}
	}
}

function getNBKurs($table, result, counter, curr){
	if(AnyBalance.isAvailable(counter)){
		var text = $table.find('tr:contains("'+curr+'")>td:nth-child(3)').text();
		if(text){
			var price = parseFloat(text);
			result[counter] = price;
			return price;
		}
	}
}

function getText($row, result, counter, idx, bank){
	if(AnyBalance.isAvailable(counter)){
		var text = $row.find(bank ? 'td:nth-child('+idx+')' : 'th:nth-child('+idx+')>b').text();
		result[counter] = text;
		return text;
	}
}


function main(){
	AnyBalance.trace('Connecting to select.by...');
	var prefs = AnyBalance.getPreferences();
    var city = prefs.city || '';
	var info = AnyBalance.requestGet('http://select.by/kurs/' + city + '/');
	var bank = prefs.bank, table;
	
	var result = {success: true};

        if(bank != 'nbrb'){
            table = getParam(info, null, null, /(<table[^>]*class="tablesorter"[^>]*>[\s\S]*?<\/table>)/i);
		if(!table){
		    AnyBalance.trace(info);
			throw new AnyBalance.Error('Не удаётся найти таблицу курсов!');
		}
	    
		var $table = $(table);
        var $row;
	    
		if(bank){
			bank = bank.toUpperCase();
			$row = $table.find('tr>td>a').filter(
				function(){
					return $(this).text().toUpperCase().indexOf(bank) >= 0;
				}
			).parent().parent();

			}else{
				$row = $table.find('tr>th:contains("Лучшие курсы")').parent();
			}
	                   
            
			if($row.size() == 0){
			    AnyBalance.trace(info);
				throw new AnyBalance.Error('Не удаётся найти строку ' + prefs.bank);
			}
	        
            getKurs($row, result, 'usdpok', 3, bank);
            getKurs($row, result, 'usdprod', 4, bank);
            getKurs($row, result, 'eurpok', 5, bank);
            getKurs($row, result, 'eurprod', 6, bank);
            getKurs($row, result, 'rurpok', 7, bank);
            getKurs($row, result, 'rurprod', 8, bank);
            getKurs($row, result, 'uepok', 9, bank);
            getKurs($row, result, 'ueprod', 10, bank);
            getText($row, result, 'tel', 11, bank);
            
			if(AnyBalance.isAvailable('bank'))
				result.bank = prefs.bank || 'Лучшие курсы';
		    
			result.__tariff = prefs.bank || 'Лучшие курсы';
        }else{
            var table = getParam(info, null, null, /Курсы валют НБ РБ[\s\S]*?(<table[^>]*>[\s\S]*?<\/table>)/i);
			if(!table){
		        AnyBalance.trace(info);
				throw new AnyBalance.Error('Не удаётся найти таблицу НБ РБ!');
			}
			var $table = $(table);
                    var date = $table.find('tr:nth-child(1)>td:nth-child(3)').text();
			result.__tariff = 'НБ РБ на ' + date;
			if(AnyBalance.isAvailable('bank'))
				result.bank = result.__tariff;

            getNBKurs($table, result, 'usdpok', 'USD');
            getNBKurs($table, result, 'usdprod', 'USD');
            getNBKurs($table, result, 'eurpok', 'EUR');
            getNBKurs($table, result, 'eurprod', 'EUR');
            getNBKurs($table, result, 'rurpok', 'RUB');
            getNBKurs($table, result, 'rurprod', 'RUB');
            if(AnyBalance.isAvailable('tel'))
                result.tel = date; //В случае нац. банка вместо телефона кладем дату курса
        }

	AnyBalance.setResult(result);
}
