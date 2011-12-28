function main(){
	AnyBalance.trace('Connecting to dgame...');
	
	var result = {success: true};

	var prefs = AnyBalance.getPreferences();
	var userid = prefs.userid; //ID персонажа
	var apikey = prefs.apikey; //Ключ API
	
	var info = AnyBalance.requestPost('http://dgame.ru/api.php', {
		selfid: userid,
		key: apikey,
		type: 'person',
		id: userid
	});
	
	var xmlDoc = $.parseXML(info),
	  $xml = $(xmlDoc);
	
	AnyBalance.trace('Checking error...');
	
	//Проверим, нет ли ошибки
	var $error = $xml.find('maoli>error').each(function(){ 
		throw new AnyBalance.Error($(this).text());
	});
	
	AnyBalance.trace('Looking for leader...');
	
	var $leader = $xml.find('maoli>team>disciples>d[leader="1"]');
	if(!$leader.size())
		throw new AnyBalance.Error("Ошибка: не найден лидер команды!");
	
	AnyBalance.trace('Getting counters...');
	
	if(AnyBalance.isAvailable('cash')){
		result.cash = parseInt($leader.find('cash').text())/10000; //Сводим к золоту
	}
		
	if(AnyBalance.isAvailable('diamond')){
		result.diamond = parseInt($leader.find('diamond').text())/100; // Потому что они в сотых долях
	}

	if(AnyBalance.isAvailable('cr_fire')){
		result.cr_fire = parseInt($leader.find('cr_fire').text()); //А кристаллы как есть записываются
	}

	if(AnyBalance.isAvailable('cr_water')){
		result.cr_water = parseInt($leader.find('cr_water').text()); //А кристаллы как есть записываются
	}

	if(AnyBalance.isAvailable('cr_sky')){
		result.cr_sky = parseInt($leader.find('cr_sky').text()); //А кристаллы как есть записываются
	}
	
	AnyBalance.setResult(result);
}
