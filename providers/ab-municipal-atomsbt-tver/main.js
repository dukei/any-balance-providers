/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Content-Type':'application/json; charset=UTF-8',
	'Connection':'Keep-Alive',
	'User-Agent':'okhttp/3.12.2'};
var baseurl = 'https://waapi.atomsbt.ru/api/';	
function callAPI(cmd,params,prefs){
	AnyBalance.trace('Запрос на '+cmd);
	for (var i=0;i<5;i++){
		if (params){
			var html = AnyBalance.requestPost(baseurl+cmd, JSON.stringify(params), g_headers);
		}else{
			var html = AnyBalance.requestGet(baseurl+cmd, g_headers);
		}
		if (html && !/504 Gateway Time-out/.test(html))
			break;
		AnyBalance.trace(html);
		if(i<4)AnyBalance.trace('не удалось получить '+cmd+'. Попытка '+(i+2)+ 'из 5');
	}
	var json=getJson(html);
	if (!json.result) {
		AnyBalance.trace('запрос:'+cmd);
		AnyBalance.trace('ответ:'+html);
		if (json.errorText) throw new AnyBalance.Error(json.errorText);
                throw new AnyBalance.Error("Ошибка вызова API. Подробности в логе");
	}
        if (cmd=='user/auth') {
        	g_headers.token=json.token;
        	AnyBalance.setData(prefs.login+'token',g_headers.token);
        	AnyBalance.saveData();
        	return;
        }
        return json.data;
};
function main() {

	AnyBalance.setDefaultCharset('utf-8');
	var prefs = AnyBalance.getPreferences();
	var token=AnyBalance.getData(prefs.login+'token');
	if (token){
		AnyBalance.trace('Найден старый токен.')
		try{
			g_headers.token=token;
			var lss=callAPI('ls/list');
                        AnyBalance.trace('Старый токен в порядке. Будем использовать его.')
		}catch(e){
			AnyBalance.trace('Токен испорчен.')
                        g_headers.token='';
                        token='';
		}

	}
	if (!token){
		AnyBalance.trace('Нужна авторизация');
		checkEmpty(prefs.login, 'Введите логин!');
		checkEmpty(prefs.password, 'Введите пароль!');
		callAPI('user/auth',{login: prefs.login,password: prefs.password},prefs);
		var lss=callAPI('ls/list');
	}
	if (lss.length<1) throw new AnyBalance.Error ('Не удалось найти ни одного лицевого счета.',false, true)
	AnyBalance.trace('Найдены лицевые счета:\n'+lss.map(ls=>ls.billing_object_number).join(', '));
	if (prefs.ls){
		lss=lss.filter(ls=>ls.billing_object_number.endsWith(prefs.ls));
		if (lss.length<1) throw new AnyBalance.Error ('Не удалось найти лицевой счет с последними цифрами '+prefs.ls,false, true)
		ls=lss[0];
	}else if(lss.length==1){
		ls=lss[0];
	}else{
		var main_ls=lss.filter(ls=>ls.main_ls=='1');
		if (main_ls.length>0) 
			ls=main_ls[0];
		else
			ls=lss[0];
	}
	AnyBalance.trace('Используется лицевой счет:'+ls.billing_object_number);
	var result = {success: true};
	result.ls=ls.billing_object_number;
	var info=callAPI('ls/'+ls.billing_object_number);
	result.adress=info.ADRES;
	result.saldo=info.BALANS/100;
        result.paid=(info.OPLACHENO+info.OPLACHENOZAKRMES+info.OPLACHENOPENI+info.OPLACHENOPENIZAKRMES+info.OPLACHENOSPENI+info.OPLPENI)/100;
        result.in_saldo=+info.PVHSALDO/100;
        result.accrued=+info.NACHISLENO/100;
        result.period=parseDateISO(info.DOLGNA,true);
        result.__tariff='К оплате:'+info.KOPLATESPENI/100+' руб.';
        var rowID;
        if(isAvailable('device_value','device_number','pays','poverkaNext','poverkaLast')){
        	var info=callAPI('ls/'+ls.billing_object_number+'/counters/list/100');
        	if (info.length>0){
        		result.device_number=info[0].ZavodNomer;
        		rowID=info[0].RowID;
        		result.poverkaNext=parseDateISO(info[0].DateNextCheck);
        		result.poverkaLast=parseDateISO(info[0].DateCheck);

        	}
        }
  if(isAvailable('device_value') && rowID) {
  	var info=callAPI('ls/counters/history',{
  		ls: ls.billing_object_number,
  		RowID: rowID,
  		enddate: getFormattedDate('YYYY-MM-DD')+'T23:59:00.820',
  		page: 1,
  		rowsPerPage: 100,
  		startdate: getFormattedDate({format:'YYYY-MM-DD',offsetYear:1})+'T23:59:00.820'});
  	result.device_value=info.map(row=>'<b>'+row.pokazaniya[0].POKAZANIE+'</b> ('+row.pokazaniya[0].RASHOD+')-'+getFormattedDate('DD.MM.YYYY',new Date (parseDateISO(row.DATA,true)))+'<br><small> через:'+row.pokazaniya[0].TIPVVODA+'</small>').join('<br>');
  }

  if(isAvailable('pays') && rowID) {
  	var info=callAPI('ls/payments',{
  		ls: ls.billing_object_number,
  		enddate: getFormattedDate('YYYY-MM-DD')+'T23:59:00.820',
  		page: 1,
  		rowsPerPage: 100,
  		startdate: getFormattedDate({format:'YYYY-MM-DD',offsetYear:1})+'T23:59:00.820'});
  	result.pays=info.map(row=>'<b>'+row.SUMMA/100+' руб.</b> - '+getFormattedDate('DD.MM.YYYY',new Date(parseDateISO(row.DATA,true)))+'<br><small>'+row.ISTOCHNIK+'</small>').join('<br>');
  }
	
	AnyBalance.setResult(result);
}