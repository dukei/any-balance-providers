function main(){
		
		AnyBalance.setDefaultCharset('utf-8');
		
		AnyBalance.trace('Connecting...');
		
		var result = {success: true};


		var prefs = AnyBalance.getPreferences();
		var usr_log = prefs.usr_log; // Логин
		var usr_pass = prefs.usr_pass; // Пароль
		
		var info = AnyBalance.requestPost('http://copypaster.org/magnus/ab_api.php', {
				username:usr_log,
				password:usr_pass,
		});
		
		var xmlDoc = $.parseXML(info),
		  $xml = $(xmlDoc);
		
		AnyBalance.trace('Checking error...');
		
		//Проверим, нет ли ошибки
		var $error = $xml.find('info>error').each(function(){ 
				throw new AnyBalance.Error($(this).text());
		});
		
		
		AnyBalance.trace('Looking for information...');
        
        var $info = $xml.find('info>user');
        if(!$info.size())
        throw new AnyBalance.Error("Error: no info");
		
		
		AnyBalance.trace('Getting counters...');
		
		if(AnyBalance.isAvailable('mlog')){
				result.mlog = $info.find('mlog').text(); // Логин
		}

		if(AnyBalance.isAvailable('mid')){
				result.mid = $info.find('mid').text(); // ID
		}

		if(AnyBalance.isAvailable('mbal')){
				result.mbal = $info.find('mbal').text(); // Баланс
		}

		if(AnyBalance.isAvailable('mtar')){
				result.mtar = $info.find('mtar').text(); // Тарифный план
		}

		if(AnyBalance.isAvailable('mfio')){
				result.mfio = $info.find('mfio').text(); // ФИО
		}

		if(AnyBalance.isAvailable('madr')){
				result.madr = $info.find('madr').text(); // Адрес
		}

		if(AnyBalance.isAvailable('mip')){
				result.mip = $info.find('mip').text(); // Real-IP
		}

		if(AnyBalance.isAvailable('mmac')){
				result.mmac = $info.find('mmac').text(); // MAC-адрес
		}

		if(AnyBalance.isAvailable('mtel')){
				result.mtel = $info.find('mtel').text(); // Домашний телефон
		}

		if(AnyBalance.isAvailable('mmob')){
				result.mmob = $info.find('mmob').text(); // Мобильный телефон
		}

		if(AnyBalance.isAvailable('mstat')){
				result.mstat = $info.find('mstat').text(); // Статус
		}

		if(AnyBalance.isAvailable('mreg')){
				result.mreg = $info.find('mreg').text(); // Дата регистрации
		}

		AnyBalance.setResult(result);
}