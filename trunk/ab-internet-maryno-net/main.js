/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Провайдер Марьино.NET 
Сайт оператора: http://maryno.net/
Личный кабинет: https://my.maryno.net/
1.0.12- Полностью изменен личный кабинет
1.0.11- Обновления на сайте.
1.0.10- Обновления на сайте.
1.0.9 - Округление трафика до мегабайтов.
1.0.8 - добавлена информация по текущему трафикуи трафику за прошлый месяц
*/

function main(){
	AnyBalance.trace('Connecting...');
	
	var data = AnyBalance.getPreferences();

	AnyBalance.setAuthentication(data.login,data.password);
	
	var url='https://lk.maryno.net/login';

	var html = AnyBalance.requestPost('https://lk.maryno.net/login',{
		username:data.login,
		password:data.password
	});
	html=AnyBalance.requestGet('https://lk.maryno.net/api/user/contract');
	if (res=/contract_id\":(.*?),/.exec(html)){var contract_id=res[1];}
        html = AnyBalance.requestPost('https://lk.maryno.net/api/user/contract/'+contract_id);
        html = AnyBalance.requestGet('https://lk.maryno.net/api/user/subscriber');
	if (res=/subscriber_id\":(.*?),/.exec(html)){var subscriber_id=res[1];}
        html = AnyBalance.requestPost('https://lk.maryno.net/api/user/subscriber/'+subscriber_id);
        html = AnyBalance.requestGet('https://lk.maryno.net/api/user/product');
	if (res=/product_id\":(.*?),/.exec(html)){var product_id=res[1];}
        html = AnyBalance.requestPost('https://lk.maryno.net/api/user/product/'+product_id);
	url='https://lk.maryno.net/api/user/all';
	html=AnyBalance.requestGet(url);
	regexp = /Unauthorized/;
	if (!regexp.exec(html)){
      		AnyBalance.trace ('Authorization Ok!');
	} else {
      		AnyBalance.trace ('Authorization Required.');
		throw new AnyBalance.Error ('Ошибка авторизации.');
	}

	AnyBalance.trace ('Start parsing...');
	var result = {success: true};
	var res='';


	if (res=/number\":\"(.*?)\"/.exec(html)){result.number=res[1];}
	if (res=/contract_num\":\"(.*?)\"/.exec(html)){result.dogovor=res[1];}
	if (res=/fio\":\"(.*?)\"/.exec(html)){result.FIO=res[1];}
	if (res=/address\":\"(.*?)\"/.exec(html)){result.address=res[1];}
	if (res=/date_begin\":\"(.*?)\"/.exec(html)){result.start_day=res[1];}
	if (res=/balance\":(.*?),/.exec(html)){result.balance=Math.floor(res[1]*100)/100;}
	if (res=/bonusBalance\":(.*?),/.exec(html)){result.bonus_balance=res[1];}
	if (res=/plan\":\"(.*?)\"/.exec(html)){result.__tariff=res[1];result.tariff=res[1];}
	if (res=/turnbackBalance\":(.*?),/.exec(html)){result.credit=res[1];}
	if (res=/isBlocked\":(.*?)}/.exec(html)){
		if (res[1] == 0){result.status="Не блокирован";}
		if (res[1] != 0){result.status=res[1]}
	}
	url='https://lk.maryno.net/api/user/email';
	html=AnyBalance.requestGet(url);
	if (res=/value\":\"(.*?)\"/.exec(html)){result.email=res[1];}


	url='https://lk.maryno.net/api/accounts';
	html=AnyBalance.requestGet(url);
	if (res=/ip_address\":\"(.*?)\"/.exec(html)){ip_address=res[1];
        	var date = new Date ();
		var year=date.getFullYear();
		var month=date.getMonth();
		url='https://lk.maryno.net/api/accounts/details/month/'+ip_address+'/'+year+'/'+(month+1);
		t=AnyBalance.requestGet(url);
		t_m=t.split("}");
		var tr_in=0;
		var tr_out=0;
		for (i=0;i<=t_m.length-2;i++){
			res =/incoming\":(.*?),\"outgoing\":(.*)/.exec(t_m[i]);
        		tr_in=tr_in+Math.floor((res[1])/1024/1024);
			tr_out=tr_out+Math.floor((res[2])/1024/1024);
		}
		result.traffic_month_in=tr_in;
		result.traffic_month_out=tr_out;


		if (month == 0 ){
			year=year-1;
			month=12;
		}
		url='https://lk.maryno.net/api/accounts/details/month/'+ip_address+'/'+year+'/'+month;
		t_pr=AnyBalance.requestGet(url);
		t_m_pr=t_pr.split("}");
		var tr_lm_in=0;
		var tr_lm_out=0;
		for (i=0;i<=t_m_pr.length-2;i++){
			res =/incoming\":(.*?),\"outgoing\":(.*)/.exec(t_m_pr[i]);
        		tr_lm_in=tr_lm_in+Math.floor((res[1])/1024/1024);
			tr_lm_out=tr_lm_out+Math.floor((res[2])/1024/1024);
		}
		result.traffic_last_month_in=tr_lm_in;
		result.traffic_last_month_out=tr_lm_out;
	}

	AnyBalance.trace ('End parsing...');	
	AnyBalance.setResult(result);
        

}
