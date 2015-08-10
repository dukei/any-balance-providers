function main(){
	var prefs = AnyBalance.getPreferences();
	var login = prefs.login;
	var info = AnyBalance.requestPost('http://lk.multima.ru/ext/get_balance_by_client_ext_ident', {
		ext_ident:login,
		submit:'Проверить'
	});


	if(info.search('Лицевой счет не найден') != -1){
		throw new AnyBalance.Error('Лицевой счет не найден');
	};


	var result = {success: true};
	var regexp = new RegExp('Баланс[^\\-\\d]*(\\-?\\d*\\.?\\d*)');
        var matches;

	if(matches = info.match(regexp)){
		if(AnyBalance.isAvailable('balance'))
			result.balance = parseFloat(matches[1]);
	};


	AnyBalance.setResult(result);
}
