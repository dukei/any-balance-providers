/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	'fio': 'profile.fio',
	'__tariff': 'profile.fio',
	'mails': 'profile.mails',
	// Штрафы
	'__1': 'fines.ammount',
	'__2': 'fines.break',
	'__3': 'fines.time',
	'__4': 'fines.carNumber',
	'gibdd_balance': 'fines_unpaid',
	'gibdd_balance_full': 'fines_unpaid_full',
	'nalog_balance': 'nalog.debt',
	'nalog_info': 'nalog.info'
}

function shouldProcess(counter, info) {
	return true;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
    var adapter = new NAdapter(g_countersTable, shouldProcess, {shouldProcessMultipleCalls: true});
	
    adapter.processProfile = adapter.envelope(processProfile);
    adapter.processFinesBeta = adapter.envelope(processFinesBeta);
    adapter.processFinesBetaVehicles = adapter.envelope(processFinesBetaVehicles);
    adapter.processNalogiBeta = adapter.envelope(processNalogiBeta);
	
	var result = {success: true};
	
	var html = login(prefs);
	
	adapter.processProfile(result);
	var profile = result.profile || {};
	
	// Штрафы
	if(prefs.gosnumber){
		AnyBalance.trace('Получаем штрафы для указанных в настройках автомобилей');
		adapter.processFinesBeta(result, prefs);
	}else{
		AnyBalance.trace('Получаем штрафы для сохраненных в кабинете автомобилей');
		adapter.processFinesBetaVehicles(result, profile.vehicles, profile.license_number);
	}
		
	if(result.fines) {
		var gibdd_info = '';
		// Создадим сводку
		for(var i = 0; i < result.fines.length; i++) {
			var fine = result.fines[i];
			if(!isset(fine['break']) || !isset(fine['ammount']) || !fine['carNumber']) {
				AnyBalance.trace('Не хватает данных для формирования сводки...');
				continue;
			}
			
			var date = fmtDate(new Date(fine['time']), '/');
			gibdd_info += fine['carNumber'].toUpperCase() + ' '+ date + ': ' + fine['__id'] + ' - <b>' + fine['ammount'] + ' р</b><br/>' + fine['break'] + '<br/><br/>';
		}
		// Сводка по штрафам
		if(gibdd_info)
			getParam(gibdd_info, result, 'gibdd_info', null, g_replaceSpacesAndBrs);
	}
	// Налоги получаем по-старому

	if (!prefs.inn && profile.inn){ //Если инн не указан, получаем его из профайла
		AnyBalance.trace('Получаем налоги для указанного в кабинете ИНН');
		prefs.inn = profile.inn;
	}

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
					adapter.processNalogiBeta(result, html, current);
				}
			}
    	} catch (e) {
    		AnyBalance.trace('Не удалось получить данные по налогам из-за ошибки: ' + e.message);
			if(e.fatal)
				throw e;
    	}
    }
	
	// Конвертер
	result = adapter.convert(result);
	AnyBalance.setResult(result);
}