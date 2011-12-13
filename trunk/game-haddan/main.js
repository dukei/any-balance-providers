function main(){
	AnyBalance.trace('Connecting to haddan...');
	
	var result = {success: true};

	var prefs = AnyBalance.getPreferences();
	var userid = prefs.userid; //ID персонажа
	var pass = hex_md5(prefs.pass); //Пароль в md5
	
	AnyBalance.trace(hex_md5('русский текст'));
	
	var info = AnyBalance.requestPost('http://haddan.ru/inner/api.php', {
		op: 'user',
		id: userid,
		pass: pass,
		fields: 'cash,gold,diamond'
	});
	
	var xmlDoc = $.parseXML(info),
	  $xml = $(xmlDoc);
	
	AnyBalance.trace('Checking error...');
	
	//Проверим, нет ли ошибки
	var $error = $xml.find('haddan>error').each(function(){ 
		throw new AnyBalance.Error($(this).text());
	});
	
	AnyBalance.trace('Getting counters...');
	
	if(AnyBalance.isAvailable('cash')){
		result.cash = parseInt($xml.find('haddan>cash').text());
	}
		
	if(AnyBalance.isAvailable('diamond')){
		result.diamond = parseInt($xml.find('haddan>diamond').text())/100; // Потому что они в сотых долях
	}
		
	if(AnyBalance.isAvailable('gold')){
		result.gold = parseInt($xml.find('haddan>gold').text())/100; // Потому что они в сотых долях
	}
		
	
	AnyBalance.setResult(result);
		
}
