function main(){
	AnyBalance.trace('Connecting to haddan...');
	
	var result = {success: true};

	var prefs = AnyBalance.getPreferences();
	
	var info = AnyBalance.requestPost('http://haddan.ru/inner/api_bankcell.php', {
		cell: prefs.cellid,
		apikey: prefs.apikey,
		mode: 'json'
	});

	var res = new Function("return " + info)();
	
	if(typeof(res) != 'object'){
		throw new AnyBalance.Exception('Wrong answer: ' + res);
	}

	result.__tariff = prefs.cellid;

	if(res.error){
		throw new AnyBalance.Exception(res.error);
	}

	result.balance = res.mn;
	
	AnyBalance.setResult(result);
		
}
