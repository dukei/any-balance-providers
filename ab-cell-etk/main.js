function main(){
	var prefs = AnyBalance.getPreferences();
	var login = prefs.login;
	var password = prefs.password;
	var Postinfo = AnyBalance.requestPost('https://issa.etk.ru/cgi-bin/cgi.exe?function=is_login', {
		Lang:2,
		mobnum:login,
		Password:password,
		x:35,
		y:6
	});

	var info = AnyBalance.requestGet('https://issa.etk.ru/cgi-bin/cgi.exe?function=is_account');

	if(Postinfo.search('Ошибка аутентификации') != -1){
		throw new AnyBalance.Error('Введен неверный номер или пароль, либо этот номер заблокирован');
	};

	var result = {success: true};

	var regexp1 = new RegExp('Актуальный баланс:[^&]*&nbsp;(\\-?\\d*\\.?\\d*)');
        var matches1;

	var regexp2 = new RegExp('Средняя скорость расходования средств по лицевому счету в день:[^&]*&nbsp;(\\-?\\d*\\.?\\d*)');
        var matches2;

	if(matches1 = info.match(regexp1)){
		if(AnyBalance.isAvailable('ActualBalance'))
			result.ActualBalance = parseFloat(matches1[1]);
	};

	if(matches2 = info.match(regexp2)){
		if(AnyBalance.isAvailable('DayRashod'))
			result.DayRashod = parseFloat(matches2[1]);
	};


	AnyBalance.setResult(result);
}
