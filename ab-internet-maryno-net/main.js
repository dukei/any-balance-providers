/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Провайдер Марьино.NET 
Сайт оператора: http://maryno.net/
Личный кабинет: https://my.maryno.net/
1.0.8 - добавлена информация по текущему трафикуи трафику за прошлый месяц
1.0.9 - Округление трафика до мегабайтов.
*/

function main(){
	AnyBalance.trace('Connecting...');
	
	var data = AnyBalance.getPreferences();

	AnyBalance.setAuthentication(data.login,data.password);
	
	var url='https://my.maryno.net/ls.php?ls=' + data.login;
	
	var html = AnyBalance.requestGet(url);

	regexp = /Личный кабинет/;
	if (regexp.exec(html)){
      		AnyBalance.trace ('Authorization Ok!');
	} else {
      		AnyBalance.trace ('Authorization Required.');
		throw new AnyBalance.Error ('Ошибка авторизации.');
	}
	var result = {success: true};
	AnyBalance.trace ('Start parsing...');

  var res=/Общие<\/font>.*<\/table><br>(<table.*<\/table>)<br><table/.exec(html);
	var tmp=res[1];
	res=tmp.replace(/<tr><td bgcolor=#f1f3f7><b>/g,'<1>');
	res=res.replace(/<\/b><\/td><td bgcolor=#ffffff>/g,'<2>');
  res=res.replace(/<\/td><td bgcolor=#ffffff><\/td><\/tr>/g,'<3>');
	res=res.replace(/.*pt.>/,'');
	res=res.replace(/<\/td>.*<\/tr>/,'<3>');
	var tmp=res.replace(/<.table>/,'');

	if(AnyBalance.isAvailable('number')){
    regexp=/<1>Номер договорной записи<2>(.*?)<3><1>Договор/;
		if (res=regexp.exec(tmp)){result.number=res[1];}
	}
	if(AnyBalance.isAvailable('dogovor')){
    regexp=/<1>Договор<2>(.*?)<3>/;
		if (res=regexp.exec(tmp)){result.dogovor=res[1];}
	}
	if(AnyBalance.isAvailable('FIO')){
    regexp=/<1>Фамилия И.О.<2>(.*?)<3>/;
		if (res=regexp.exec(tmp)){result.FIO=res[1];}
	}
	if(AnyBalance.isAvailable('adress')){
    regexp=/<1>Адрес<2>(.*?)<3>/;
		if (res=regexp.exec(tmp)){result.adress=res[1];}
	}
	if(AnyBalance.isAvailable('Home_Phone')){
    regexp=/<1>Телефон домашний<2>(.*?)<3>/;
		if (res=regexp.exec(tmp)){result.Home_Phone=res[1]}
	}
	if(AnyBalance.isAvailable('Phone')){
    regexp=/<1>Телефон мобильный<2>(.*?)<3>/;
		if (res=regexp.exec(tmp)){result.Phone=res[1];}
	}
	if(AnyBalance.isAvailable('email')){
    regexp=/<1>E-Mail<2>(.*?)<3>/;
		if (res=regexp.exec(tmp)){result.email=res[1];}
	}
	if(AnyBalance.isAvailable('start_day')){
    regexp=/<1>Дата открытия<2>(.*?)<3>/;
		if (res=regexp.exec(tmp)){result.start_day=res[1];}
	}
    regexp=/<1>Актуальный баланс, руб.<2>(.*?)<3>/;
		if (res=regexp.exec(tmp)){result.balance=Math.floor(res[1]*100)/100;}
	if(AnyBalance.isAvailable('bonus_balance')){
    regexp=/<1>Бонусный баланс, руб.<2>(.*?)<3>/;
		if (res=regexp.exec(tmp)){result.bonus_balance=res[1];}
	}
	if(AnyBalance.isAvailable('unconfirmed')){
    regexp=/<1>Неподтвержденные платежи, руб.>(.*?)<3>/;
		if (res=regexp.exec(tmp)){result.unconfirmed=res[1];}
	}
	if(AnyBalance.isAvailable('credit')){
    regexp=/<1>Кредитование, руб.<2>(.*?)<3>/;
		if (res=regexp.exec(tmp)){result.credit=res[1];}
	}
	if(AnyBalance.isAvailable('status')){
    regexp=/<1>Статус счета<2>(.*?)<3>/;
		if (res=regexp.exec(tmp)){result.status=res[1];}
	}
  regexp=/<1>Тарифный план<2>(.*?)<3>/;
  if (res=regexp.exec(tmp)){
    result.__tariff=res[1];
    if(AnyBalance.isAvailable('tariff')){result.tariff=res[1];}
	}        
	if(AnyBalance.isAvailable('included')){
    regexp=/<1>Остаток оплаченного включенного трафика, Мб<2>(.*?)<3>/;
		if (res=regexp.exec(tmp)){result.included=res[1];}
	}
	if(AnyBalance.isAvailable('unpaid')){
    regexp=/<1>Остаток неоплаченного включенного трафика, Мб<2>(.*?)<3>/;
		if (res=regexp.exec(tmp)){result.unpaid=res[1];}
	}
	if(AnyBalance.isAvailable('transfer')){
    regexp=/<1>Перенесенный трафик, Мб<2>(.*?)<3>/;
		if (res=regexp.exec(tmp)){result.transfer=res[1];}
	}
	if(AnyBalance.isAvailable('bonus')){
    regexp=/<1>Бонусный трафик, Мб<2>(.*?)<3>/;
		if (res=regexp.exec(tmp)){result.bonus=res[1];}
	}
	if(AnyBalance.isAvailable('traffic_month_in')||
	   AnyBalance.isAvailable('traffic_month_out')){
		url="https://my.maryno.net/stat.php?act=det_mon&ls="+data.login;
		html = AnyBalance.requestGet(url);
		res =/<td>Итого за месяц<.*?><.*?>(.*?) .*?<.*?><.*?>(.*?) .*?<.*?>/.exec(html);
		result.traffic_month_in=Math.floor(res[1]);
		result.traffic_month_out=Math.floor(res[2]);
	}
	if(AnyBalance.isAvailable('traffic_last_month_in')||
	   AnyBalance.isAvailable('traffic_last_month_out')){
        	var date = new Date ();
		var year=date.getFullYear();
		var month=date.getMonth();
		if (month == 0 ){
			year=year-1;
			month=12;
		}
    url="https://my.maryno.net/stat.php?act=det_mon&ls="+data.login+"&ip=&month="+month+"&year="+year;
		html = AnyBalance.requestGet(url);
		res =/<td>Итого за месяц<.*?><.*?>(.*?) .*?<.*?><.*?>(.*?) .*?<.*?>/.exec(html);
		result.traffic_last_month_in=Math.floor(res[1]);
		result.traffic_last_month_out=Math.floor(res[2]);
	}



	AnyBalance.trace ('End parsing...');	
	AnyBalance.setResult(result);

}