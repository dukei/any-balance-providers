/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'X-APP': 'android-5.6.6',
	'User-Agent': 'okhttp/3.9.1 x-app-version/5.6.6',
	'Content-Type': 'application/x-www-form-urlencoded'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://lkk.mosoblgaz.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl + 'api/auth/token',{
    	login:prefs.login,
    	password:prefs.password
    	}, g_headers,{HTTP_METHOD: 'PUT'});
    var json=getJson(html);
    if (!json.success){
    	var error=json.error.text;
    	if (error)
    		throw new AnyBalance.Error(error, null, true);
    	throw new AnyBalance.Error('Авторизация не удалась', null, true);
    }
    g_headers.token=json.token;
    g_headers['Content-Type']='application/json; charset=UTF-8';
    g_headers['X-APP']='android-5.6.6';


    var request='{"query":"query ContractList {  me {    id    contracts {      number      name      alias      address      existsRealMeter      liveBalance {liveBalance        recommendedPaySum                CharitySch                CharityNorm      }      filial {        id        title      }      contractData {        number        TO {NachTO {                    sum {                      CurSum                      PredSum                    }                    data {                      Tarif                      Cost                      Unit                      Cost                      Sum                    }                  }                  Dogovors {                    Num                    Code                    Name                    EndDate                    StartDate                  }                }        dogovorsVDGOInfo {          Num          Code          Name          SignDate          EndDate          StartDate          Saldo          CurPay          sumToPay        }        Nach {          sch {            data {              Cost              Unit              Dim            }          }          norm {            number            sum            data {              Id              Tarif              Cost              Unit              Dim              Count              m3              Sum              Normgaz            }          }        }        Devices {          ID          Place          ClassCode          ClassName          Model          ManfFirm          ManfNo          Status          DateNextCheck        }      }      metersHistory {        data      }    }  }}"}';
	html = AnyBalance.requestPost(baseurl + 'graphql/', request,g_headers); 
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));

    if(!json.data){
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    if (!json.data||!json.data.me||!json.data.me.contracts||!json.data.me.contracts.length)
    	throw new AnyBalance.Error('Лицевые счета не найдены');
	
    var ls;
	for(var i=0; i<json.data.me.contracts.length; ++i){
		var contract = json.data.me.contracts[i];
		AnyBalance.trace('Найден лицевой счет ' + contract.number);
		if(!ls && (!prefs.num || endsWith(contract.number, prefs.num))){
			ls = contract;
		}
	}

	if(!ls)
		throw new AnyBalance.Error('Не удалось найти лицевой счет с последними цифрами ' + prefs.num);
	
	AnyBalance.trace('Выбран лицевой счет ' + ls.number);
	
    var result = {success: true};
    getParam(ls.liveBalance.recommendedPaySum, result, 'recomended',null,null,parseFloat);
    getParam(ls.liveBalance.liveBalance, result, 'balance',null,null,parseFloat);
    getParam(ls.number, result, 'acc');
    getParam(ls.name, result, 'fio');
    getParam(ls.address, result, 'adr');
    if (ls.alias) getParam(ls.alias, result, '__tariff');
    if (ls.existsRealMeter){
        getParam(ls.metersHistory.data[0].info.Name+' №'+ls.metersHistory.data[0].info.FactoryNum, result, 'counter');
        getParam(ls.metersHistory.data[0].info.NextCheckDate,result,'NextCheckDate',null,[/(\d{4})(\d{2})(\d{2})/,'$3.$2.$1'],parseDate);
        getParam(ls.metersHistory.data[0].values[0].V, result, 'lastV',null,null,parseInt);
        getParam(ls.metersHistory.data[0].values[0].M3, result, 'lastM3',null,null,parseInt);
        getParam(ls.metersHistory.data[0].values[0].Cost, result, 'cost',null,null,parseFloat);
        getParam(ls.metersHistory.data[0].values[0].Date.date, result, 'lastDate',null,[/(\d{4})-(\d{2})-(\d{2})/,'$3.$2.$1'],parseDate);
    }
    if (isAvailable('income','nachisl','balanceStart')){
    	var request='{"operationName": "ContractPayments","variables": {"number": "'+ls.number+'"},"query": "query ContractPayments($number: String!) {  me {contract(number: $number) {calculationsAndPayments    }  }}"}';
    	html = AnyBalance.requestPost(baseurl + 'graphql/', request, g_headers); 
    	var json = getJson(html);
    	json=json.data.me.contract.calculationsAndPayments;
    	var income=0;
    	var nachisl=0;
    	var balance=0;
    	for (var usluga in json){
	    for (var month in json[usluga]){
		if (json[usluga][month].payment) income+=parseFloat(json[usluga][month].payment);
	        if (json[usluga][month].invoice) nachisl+=parseFloat(json[usluga][month].invoice);
	        if (json[usluga][month].balance) balance+=parseFloat(json[usluga][month].balance);
	        break;
	    }
    	}
    	var m=parseInt(month)-1;
    	var y=month.replace(/\d*\./,'');
    	var mm=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
    	getParam(mm[m]+' '+y,result,'__tariff')

    	if (income) getParam(income, result, 'income');
    	if (nachisl) getParam(nachisl, result, 'nachisl');
    	if (balance) getParam(balance, result, 'balanceStart');
    }

    AnyBalance.setResult(result);
}



