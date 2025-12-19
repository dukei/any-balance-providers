/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 YaBrowser/25.10.0.0 Safari/537.36'
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = "https://my.garant.by";
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	AnyBalance.setDefaultCharset('UTF-8');
	AnyBalance.setExceptions(true);
	var html = AnyBalance.requestGet(baseurl+'/login', g_headers);
	
	if(!/authenticity_token" value="(.*)" autocomplete="off/i.test(html)){
		var baseurl = "https://my.garant.by";
		var html = AnyBalance.requestGet(baseurl+'/login', g_headers);
	
	}
	var token_aut = getParam(html, null, null, /authenticity_token" value="(.*)" autocomplete="off/i, replaceTagsAndSpaces, html_entity_decode);
AnyBalance.trace("Аuthenticity_token : "+token_aut);
	html = AnyBalance.requestPost(baseurl+'/login', {
			utf8: "✓",
			authenticity_token: token_aut,
			'user[login]': prefs.login,
			'user[password]': prefs.password,
			commit: 'Войти'
		}, addHeaders({
				Referer: baseurl,
              
			}));
AnyBalance.trace(html);
	if (/>Неверный логин или пароль</i.test(html)) {
		var error = getParam(html, null, null, /Неверный логин или пароль/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {
		success: true
	};
	
	var time=new Date().getTime()
	
	var XCsrfToken=getParam(html, null, null, /<meta name=\"csrf-token\" content=\"(.*)\"/i,null , html_entity_decode);//replaceTagsAndSpaces
	AnyBalance.trace("XCsrfToken : " + XCsrfToken);
	var g_headers2 = {
		'Accept':'application/json, text/javascript, */*; q=0.01',
        'Access-Control-Allow-Origin': '*',
		'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
		'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
		'X-Requested-With':'XMLHttpRequest',
		'X-csrf-token':XCsrfToken,
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 YaBrowser/25.10.0.0 Safari/537.36'
	};
	var data = getParam(html, null, null, /new HupoApp\((.*)\.data/i,null , html_entity_decode);//replaceTagsAndSpaces
	//AnyBalance.trace(data);
	
	var res_data = getJsonEval(data);
//	AnyBalance.trace(res_data);
	 AnyBalance.trace("ФИО : " + res_data.data.person.vc_name);
	getParam(res_data.data.person.vc_name, result, 'fio');
	

    if(res_data.data.equipment_addresses[0].vc_visual_code.indexOf('Беларусь')>=0){
        AnyBalance.trace("Адрес : " + res_data.data.equipment_addresses[0].vc_visual_code);
        getParam(res_data.data.equipment_addresses[0].vc_visual_code, result, '__tariff');
    }else{
        AnyBalance.trace("Адрес : " + res_data.data.equipment_addresses[1].vc_visual_code);
	getParam(res_data.data.equipment_addresses[1].vc_visual_code, result, '__tariff');
    }
	

	if(res_data.data.personal_accounts[0].vc_code.indexOf('TV')>=0){ //Если есть тариф Телевидения
	
	/*
	TV
	*/
		json_TV = AnyBalance.requestGet(baseurl + "/accounts/"+res_data.data.personal_accounts[0].vc_code+'?='+time,g_headers2);
		if (!json_TV || AnyBalance.getLastStatusCode() > 400) {
			throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
		}
		AnyBalance.trace("json_TV : " +json_TV);
		var dataJsonTv = getJsonEval(json_TV);
		AnyBalance.trace("Баланс Tv: " + dataJsonTv.data.personal_account.n_sum_bal + ' BYN');
		getParam(dataJsonTv.data.personal_account.n_sum_bal, result, 'balanceTv', dataJsonTv.data.personal_account.n_sum_bal, replaceTagsAndSpaces, parseBalance);
		if(dataJsonTv.data.servs[0]){
		AnyBalance.trace("Тариф Tv: " + dataJsonTv.data.servs[0].vc_name + '');
		getParam(dataJsonTv.data.servs[0].vc_name, result, 'tariаfTv', dataJsonTv.data.servs[0].vc_name, null, null);
		
	

				if(dataJsonTv.data.user_additional_servs[0]){ //Если есть Доп услуга телевидения
					var additionalServs='';
					let sum=0.0 ;
					for (var i = 0; i < dataJsonTv.data.user_additional_servs.length; i++) {
					dRes=dataJsonTv.data.user_additional_servs[i];
					AnyBalance.trace("Доп услуга: " + dRes.vc_name);
					AnyBalance.trace("Цена в месяц: " + dRes.n_good_sum+' '+dRes.vc_currency_code);
					additionalServs += dRes.vc_name + '-' + dRes.n_good_sum + ' ' + dRes.vc_currency_code +`\n`;
					sum=parseFloat(dRes.n_good_sum)+parseFloat(sum);
					}
					AnyBalance.trace("Доп услуга: " + additionalServs);
					AnyBalance.trace(" sumTV: " +  sum);
				 let	fullSumTv=parseFloat(dataJsonTv.data.servs[0].n_good_sum)+parseFloat(sum);
					getParam(additionalServs, result, 'additionalServicesTv', additionalServs, null, null);
					AnyBalance.trace("Полный тариф TV: " +  fullSumTv);
					getParam( ""+fullSumTv, result, 'tarifIntAdditionalTv',""+fullSumTv, replaceTagsAndSpaces, parseBalance);
					

				}
				
				
		AnyBalance.trace("Сумма тарифа Телевидения в месяц: " +  dataJsonTv.data.servs[0].n_good_sum );
		getParam( dataJsonTv.data.servs[0].n_good_sum, result, 'sumTariаfTv',  dataJsonTv.data.servs[0].n_good_sum, replaceTagsAndSpaces, parseBalance);
		
        
		AnyBalance.trace("Последний платеж Телевидения: " +  dataJsonTv.data.personal_account.n_last_payment_sum);
        let lastActivitiestv =''+dataJsonTv.data.personal_account.n_last_payment_sum+' '+dataJsonTv.data.personal_account.vc_last_payment_type+' '+dataJsonTv.data.personal_account.vc_last_payment_bank;
     getParam( lastActivitiestv, result, 'lastActivitiesTv',  lastActivitiestv,null, null);
     
			}
	/*
	INT
	*/
		json_Int = AnyBalance.requestGet(baseurl + "/accounts/"+res_data.data.personal_accounts[1].vc_code+'?='+time,g_headers2);


		AnyBalance.trace("Лицевой счет : " + res_data.data.personal_accounts[1].vc_code);
		getParam(res_data.data.personal_accounts[1].vc_code, result, 'account');
		if (!json_Int || AnyBalance.getLastStatusCode() > 400) {
			throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
		}
		AnyBalance.trace("json_Int: " + json_Int);
		var dataJsonInt = getJsonEval(json_Int);
		
		AnyBalance.trace("Баланс интернета : " + dataJsonInt.data.personal_account.n_sum_bal);
		getParam(dataJsonInt.data.personal_account.n_sum_bal, result, 'balanceInt', dataJsonInt.data.personal_account.n_sum_bal, replaceTagsAndSpaces, parseBalance);
		AnyBalance.trace("Тариф интернета: " +  dataJsonInt.data.servs[0].vc_name );
		getParam( dataJsonInt.data.servs[0].vc_name, result, 'tarifInt', dataJsonInt.data.servs[0].vc_name,null, null);
		

		if(dataJsonInt.data.user_additional_servs[0]){ // Доп услуга Интернета
			var additionalServs='';
			let sumInt=0.0;
			for (var i = 0; i < dataJsonInt.data.user_additional_servs.length; i++) {
			dIRes=dataJsonInt.data.user_additional_servs[i];
			AnyBalance.trace("Доп услуга: " + dIRes.vc_name);
			AnyBalance.trace("Цена в месяц: " + dIRes.n_good_sum+' '+dIRes.vc_currency_code);
			additionalServs += dIRes.vc_name + '-' + dIRes.n_good_sum + ' ' + dIRes.vc_currency_code +`\n`;
			sumInt=parseFloat(sumInt)+parseFloat(dIRes.n_good_sum);
			}
			AnyBalance.trace("Доп услуга: " + additionalServs);
			getParam(additionalServs, result, 'additionalServicesInt', additionalServs, null, null);
			
			
		 let	fullSumInt
		 fullSumInt=parseFloat(dataJsonInt.data.servs[0].n_good_sum)+parseFloat(sumInt);
		 AnyBalance.trace(" sumInt: " + sumInt);
		 AnyBalance.trace("Полный тариф Int: " +  fullSumInt);
		 getParam( ""+fullSumInt, result, 'tarifIntAdditionaliInt',""+fullSumInt, replaceTagsAndSpaces, parseBalance);
	 
		
 
			
		}				

		AnyBalance.trace("Сумма тарифа Интернета в месяц: " +  dataJsonInt.data.servs[0].n_good_sum );
		getParam( dataJsonInt.data.servs[0].n_good_sum, result, 'sumTariаfIn',  dataJsonInt.data.servs[0].n_good_sum, replaceTagsAndSpaces, parseBalance);
	
		AnyBalance.trace("Последний платеж Интернета: " +  dataJsonInt.data.personal_account.n_last_payment_sum);
       let lastActivitiesint =''+dataJsonInt.data.personal_account.n_last_payment_sum+' '+dataJsonInt.data.personal_account.vc_last_payment_type+' '+dataJsonInt.data.personal_account.vc_last_payment_bank;
	getParam( lastActivitiesint, result, 'lastActivitiesInt',  lastActivitiesint,null, null);
	
	if(dataJsonInt.data.servs[0].n_good_state_id==11114){
		can_disconnect=`Услуга Интернет  оказывается`;
		AnyBalance.trace("Состояние Услуги: "+can_disconnect);
		getParam(can_disconnect, result, 'canDisconnect', can_disconnect, null, null);
				
	}else{
		can_disconnect=`Услуга Интернет не оказывается : Пополните счет`;
		AnyBalance.trace("Состояние Услуги: "+can_disconnect);
		getParam(can_disconnect, result, 'canDisconnect', can_disconnect, null, null);
		
	}
		


	}else{
	/*
	INT
	*/
		json_Int = AnyBalance.requestGet(baseurl + "/accounts/"+res_data.data.personal_accounts[0].vc_code+'?='+time,g_headers2);
		AnyBalance.trace("Лицевой счет : " + res_data.data.personal_accounts[0].vc_code);
		getParam(res_data.data.personal_accounts[0].vc_code, result, 'account');
		if (!json_Int || AnyBalance.getLastStatusCode() > 400) {
			throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
		}

		AnyBalance.trace("json_Int: " + json_Int);
		var dataJsonInt = getJsonEval(json_Int);
		
		AnyBalance.trace("Баланс интернета : " + dataJsonInt.data.personal_account.n_sum_bal);
		getParam(dataJsonInt.data.personal_account.n_sum_bal, result, 'balanceInt', dataJsonInt.data.personal_account.n_sum_bal, replaceTagsAndSpaces, parseBalance);
		AnyBalance.trace("Тариф интернета: " +  dataJsonInt.data.servs[0].vc_name );
		getParam( dataJsonInt.data.servs[0].vc_name, result, 'tarifInt', dataJsonInt.data.servs[0].vc_name,null, null);
		

		if(dataJsonInt.data.user_additional_servs[0]){ // Доп услуга Интернета
			var additionalServs='';
			let sumInt=0.0;
			for (var i = 0; i < dataJsonInt.data.user_additional_servs.length; i++) {
			dIRes=dataJsonInt.data.user_additional_servs[i];
			AnyBalance.trace("Доп услуга: " + dIRes.vc_name);
			AnyBalance.trace("Цена в месяц: " + dIRes.n_good_sum+' '+dIRes.vc_currency_code);
			additionalServs += dIRes.vc_name + '-' + dIRes.n_good_sum + ' ' + dIRes.vc_currency_code +`\n`;
			sumInt=parseFloat(sumInt)+parseFloat(dIRes.n_good_sum);
			}
			AnyBalance.trace("Доп услуга: " + additionalServs);
			getParam(additionalServs, result, 'additionalServicesInt', additionalServs, null, null);
			
			
		 let	fullSumInt
		 fullSumInt=parseFloat(dataJsonInt.data.servs[0].n_good_sum)+parseFloat(sumInt);
		 AnyBalance.trace(" sumInt: " + sumInt);
		 AnyBalance.trace("Полный тариф Int: " +  fullSumInt);
		 getParam( ""+fullSumInt, result, 'tarifIntAdditionaliInt',""+fullSumInt, replaceTagsAndSpaces, parseBalance);
	 
		
			
		}		
		AnyBalance.trace("Сумма тарифа Интернета в месяц: " +  dataJsonInt.data.servs[0].n_good_sum );
		getParam( dataJsonInt.data.servs[0].n_good_sum, result, 'sumTariаfIn',  dataJsonInt.data.servs[0].n_good_sum, replaceTagsAndSpaces, parseBalance);
	
		AnyBalance.trace("Последний платеж Интернета: " +  dataJsonInt.data.personal_account.n_last_payment_sum);
       let lastActivitiesint =''+dataJsonInt.data.personal_account.n_last_payment_sum+' '+dataJsonInt.data.personal_account.vc_last_payment_type+' '+dataJsonInt.data.personal_account.vc_last_payment_bank;
	getParam( lastActivitiesint, result, 'lastActivitiesInt',  lastActivitiesint,null, null);
	

	if(dataJsonInt.data.servs[0].n_good_state_id==11114){
		can_disconnect=`Услуга Интернет  оказывается`;
		AnyBalance.trace("Состояние Услуги: "+can_disconnect);
		getParam(can_disconnect, result, 'canDisconnect', can_disconnect, null, null);
				
	}else{
		can_disconnect=`Услуга Интернет не оказывается : Пополните счет`;
		AnyBalance.trace("Состояние Услуги: "+can_disconnect);
		getParam(can_disconnect, result, 'canDisconnect', can_disconnect, null, null);
		
	}
	
	}
	
	

			if (dataJsonInt.data.personal_account.n_temporal_overdraft) {
					AnyBalance.trace("Кредит: " + dataJsonInt.data.personal_account.n_temporal_overdraft + ' BYN,' + " До: " + dataJsonInt.data.personal_account.d_overdraft_end.replace('.000+03:00', ' '));
					getParam("Кредит: " + dataJsonInt.data.personal_account.n_temporal_overdraft + ' BYN,' + " До: " + dataJsonInt.data.personal_account.d_overdraft_end.replace('.000+03:00', ' '), result, 'balanceCredit');
				}

	AnyBalance.requestGet(baseurl+"/logout");
	AnyBalance.setResult(result);
}
