/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Провайдер Марьино.NET 
Сайт оператора: http://maryno.net/
Личный кабинет: https://my.maryno.net/
1.0.11- Обновления на сайте.
1.0.10- Обновления на сайте.
1.0.9 - Округление трафика до мегабайтов.
1.0.8 - добавлена информация по текущему трафикуи трафику за прошлый месяц
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

	var res=/<\/script>(<table.*<\/table>)<br><table/.exec(html);
	var tmp=res[1];
        res=tmp.replace(/<.*?>/g,'-');
	res=res.replace(/--+/g,'=');
	var tmp=res;

	if(AnyBalance.isAvailable('number')){
    regexp=/=Номер договорной записи=(.*?)=/;
		if (res=regexp.exec(tmp)){result.number=res[1];}
	}
	if(AnyBalance.isAvailable('dogovor')){
    regexp=/=Договор=(.*?)=/;
		if (res=regexp.exec(tmp)){result.dogovor=res[1];}
	}
	if(AnyBalance.isAvailable('FIO')){
    regexp=/=Фамилия И.О.=(.*?)=/;
		if (res=regexp.exec(tmp)){result.FIO=res[1];}
	}
	if(AnyBalance.isAvailable('adress')){
    regexp=/=Адрес=(.*?)=/;
		if (res=regexp.exec(tmp)){result.adress=res[1];}
	}
	if(AnyBalance.isAvailable('Home_Phone')){
    regexp=/=Телефон домашний=(.*?)=/;
		if (res=regexp.exec(tmp)){result.Home_Phone=res[1]}
	}
	if(AnyBalance.isAvailable('Phone')){
    regexp=/=Телефон мобильный=(.*?)=/;
		if (res=regexp.exec(tmp)){result.Phone=res[1];}
	}
	if(AnyBalance.isAvailable('email')){
    regexp=/=E-Mail=(.*?)=/;
		if (res=regexp.exec(tmp)){result.email=res[1];}
	}
	if(AnyBalance.isAvailable('start_day')){
    regexp=/=Дата открытия=(.*?)=/;
		if (res=regexp.exec(tmp)){result.start_day=res[1];}
	}
    regexp=/=Актуальный баланс, руб.=(.*?)=/;
		if (res=regexp.exec(tmp)){result.balance=Math.floor(res[1]*100)/100;}
	if(AnyBalance.isAvailable('bonus_balance')){
    regexp=/=Бонусный баланс, руб.=(.*?)=/;
		if (res=regexp.exec(tmp)){result.bonus_balance=res[1];}
	}

	if(AnyBalance.isAvailable('unconfirmed')){
    regexp=/=Неподтвержденные платежи, руб.>(.*?)=/;
		if (res=regexp.exec(tmp)){result.unconfirmed=res[1];}
	}
	if(AnyBalance.isAvailable('credit')){
    regexp=/=Кредитование, руб.=(.*?)=/;
		if (res=regexp.exec(tmp)){result.credit=res[1];}
	}
	if(AnyBalance.isAvailable('status')){
    regexp=/=Статус счета=(.*?)=/;
		if (res=regexp.exec(tmp)){result.status=res[1];}
	}

  regexp=/=Тарифный план=(.*?)=/;
  if (res=regexp.exec(tmp)){
    result.__tariff=res[1];
    if(AnyBalance.isAvailable('tariff')){result.tariff=res[1];}
	}        
	if(AnyBalance.isAvailable('included')){
    regexp=/=Остаток оплаченного включенного трафика, Мб=(.*?)=/;
		if (res=regexp.exec(tmp)){result.included=res[1];}
	}
	if(AnyBalance.isAvailable('unpaid')){
    regexp=/=Остаток неоплаченного включенного трафика, Мб=(.*?)=/;
		if (res=regexp.exec(tmp)){result.unpaid=res[1];}
	}
	if(AnyBalance.isAvailable('transfer')){
    regexp=/=Перенесенный трафик, Мб=(.*?)=/;
		if (res=regexp.exec(tmp)){result.transfer=res[1];}
	}
	if(AnyBalance.isAvailable('bonus')){
    regexp=/=Бонусный трафик, Мб=(.*?)=/;
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