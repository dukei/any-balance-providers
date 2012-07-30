function main(){
	var prefs = AnyBalance.getPreferences();
	var login = prefs.login;
	var password = prefs.password;
	var Postinfo = AnyBalance.requestPost('https://issa.volgogsm.ru/cgi-bin/cgi.exe?function=is_login', {
		Lang:2,
		mobnum:login,
		Password:password,
		x:27,
		y:13
	});
	var info = AnyBalance.requestGet('https://issa.volgogsm.ru/cgi-bin/cgi.exe?function=is_account');
	if(Postinfo.search('Ошибка аутентификации') != -1){
		throw new AnyBalance.Error('Введен неверный номер или пароль, либо этот номер заблокирован');
	};
	var result = {success: true};
	var regexp1 = new RegExp('Актуальный баланс:[^&]*&nbsp;(\\-?\\d*\\.?\\d*)');
        var matches1;
	var regexp2 = new RegExp('Средняя скорость расходования средств по лицевому счету в день:[^&]*&nbsp;(\\-?\\d*\\.?\\d*)');
        var matches2;
	var regexp3 = new RegExp('Количество бонусных баллов на счету:[^&]*&nbsp;(\\-?\\d*\\.?\\d*)');
        var matches3;
	var regexp4 = new RegExp('Предположительная дата отключения без поступления средств менее, чем через:[^&]*&nbsp;(\\-?\\d*\\.?\\d*)');
        var matches4;
	var regexp5 = new RegExp('Минимальный баланс для подключения:[^&]*&nbsp;(\\-?\\d*\\.?\\d*)');
        var matches5;
		
	if(matches1 = info.match(regexp1)){
		if(AnyBalance.isAvailable('ActualBalance'))
			result.ActualBalance = parseFloat(matches1[1]);
	};
	if(matches2 = info.match(regexp2)){
		if(AnyBalance.isAvailable('DayRashod'))
			result.DayRashod = parseFloat(matches2[1]);
	};
	if(matches3 = info.match(regexp3)){
		if(AnyBalance.isAvailable('BonusBalance'))
			result.BonusBalance = parseFloat(matches3[1]);
	};
	if(matches4 = info.match(regexp4)){
		if(AnyBalance.isAvailable('DateOff'))
			result.DateOff = parseFloat(matches4[1]);
	};
	if(matches5 = info.match(regexp5)){
		if(AnyBalance.isAvailable('MinBalabce'))
			result.MinBalabce = parseFloat(matches5[1]);
	};
	AnyBalance.setResult(result);
}