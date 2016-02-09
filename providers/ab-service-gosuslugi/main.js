/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	'fio': 'profile.fio',
	'mails': 'profile.mails',
	// Штрафы
	'gibdd_balance': 'fines.ammount',
	'gibdd_balance': 'fines.break',
}

function shouldProcess(counter, info) {
	return true;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
    var adapter = new NAdapter(g_countersTable, shouldProcess);
	
    adapter.processProfile = adapter.envelope(processProfile);
	
	var result = {success: true};
	
	var html = login(prefs);
	
	adapter.processProfile(html, result);
	
	// Штрафы
	processFines(result, prefs);
	var gibdd_balance = 0;
	var gibdd_info = '';
	// Создадим сводку
	for(var i = 0; i < result.fines.length; i++) {
		var fine = result.fines[i];
		var feeSum = fine['ammount'];

		gibdd_balance += feeSum;
		gibdd_info += fine['__name'] + ' (' + fine['break'] + '): ' + feeSum + ' р - <b>Не оплачен</b><br/><br/>';
	}
	// Конвертер
	result = adapter.convert(result);
		// Сводка по штрафам
	getParam(gibdd_info, result, 'gibdd_info', null, g_replaceSpacesAndBrs);
	getParam(gibdd_balance, result, 'gibdd_balance');
	
	// Налоги получаем по-старому
    if (prefs.inn) {
    	try {
    		AnyBalance.trace('Указан ИНН, значит надо получать данные по налогам...');
			
			var inns = prefs.inn.split(';');
			AnyBalance.trace('Указано ИНН: ' + inns.length);
			var len = Math.min(inns.length, g_max_inns_num);
			for(var i = 0; i < len; i++) {
				var current = inns[i];
				if(current) {
					AnyBalance.trace('Получаем данные по ИНН: ' + current);
					processNalogiBeta(result, html, current);
				}
			}
    	} catch (e) {
    		AnyBalance.trace('Не удалось получить данные по налогам из-за ошибки: ' + e.message);
			if(e.fatal)
				throw e;
    	}
    }
	
	AnyBalance.setResult(result);
}