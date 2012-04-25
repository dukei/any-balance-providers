/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает курсы валют в белорусских банках с сайта http://select.by/kurs

Сайт: http://select.by
Личный кабинет: http://select.by/kurs/
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value = regexp.exec (html);
	if (value) {
		value = value[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
    else
      return value
	}
}

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
	var info = AnyBalance.requestGet('http://select.by/kurs/');
	var bank = prefs.bank;
	
	var result = {success: true};

        var table = getParam(info, null, null, /(<table[^>]*id="curr_table"[^>]*>[\s\S]*?<\/table>)/i);
	if(!table)
		throw new AnyBalance.Error('Не удаётся найти таблицу курсов!');

	var $table = $(table);

        var $row;
	if(bank){
		bank = bank.toUpperCase();
		$row = $table.find('tr>td:nth-child(2)>a').filter(
			function(){
				return $.trim($(this).text().toUpperCase()) == bank
			}
		).parent().parent();
	}else{
		$row = $table.find('tr>th:nth-child(2):contains("Лучшие курсы")').parent();
	}

	if($row.size() == 0)
		throw new AnyBalance.Error('Не удаётся найти строку ' + prefs.bank);

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

	AnyBalance.setResult(result);
}
