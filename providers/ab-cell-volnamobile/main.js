/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сотового оператора МТС (Украина). Вход через PDA-версию.

Сайт оператора: http://mts.com.ua/
Личный кабинет: https://ihelper-prp.mts.com.ua/SelfCarePda/
*/
var g_headers = {
    	connection: 'keep-alive',
	accept: 'application/json, text/plain, */*',
	'origin':'https://lk.volnamobile.ru',
	'accept-encoding': null,
	'user-agent': 'Mozilla/5.0 (Linux; Android 8.0; ONEPLUS A3010 Build/OPR6.170623.013) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Crosswalk/18.48.477.13 Mobile Safari/537.36',
	'content-type': 'application/manifest+json; charset=UTF-8',
}

function parseTrafficMb(str){
    var val = parseBalance(str);
    if(isset(val))
        val = Math.round(val/1024*100)/100;
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    checkEmpty(prefs.login, 'Введите номер телефона для входа в интернет-помощник!');	
    prefs.login=prefs.login.toString().replace(/[^\d]+/g,'').substr(-10);
    var cc={};
    var baseurl='https://lk.volnamobile.ru/api/v1.0/';
    var html = AnyBalance.requestPost(baseurl+'account/login', JSON.stringify({username:prefs.login,password:prefs.password}),g_headers);
    if (html){
    	if (/message/i.test(html)) throw new AnyBalance.Error(getJson(html).message);
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось войти в личный кабинет');
    }
    var html = AnyBalance.requestGet(baseurl+'proxy/user/get',addHeaders({'x-requested-by':prefs.login}));
    var json=getJson(html);
    var result = {success: true};
    result.balance=json.metadata.subscriber.mainBalance;
    result.ls=json.metadata.subscriber.accountNumber;
    result.__tariff=json.metadata.subscriber.tariff+' ('+json.metadata.status.title+')';
    if (json.metadata.discounts) getCouners(json.metadata.discounts);
    if (json.metadata.resourceBalances) getCouners(json.metadata.resourceBalances);
    if (AnyBalance.isAvailable('abon')){
    	var html = AnyBalance.requestGet(baseurl+'proxy/plans/get/user',addHeaders({'x-requested-by':prefs.login}));
    	var json=getJson(html);
    	result.__tariff=result.__tariff.replace('(',json.metadata.shortDescription+'(');
	json=json.metadata.keyFeatures;
	json.filter(c=>c.key=='Абонентская плата');
	if (json.length) result.abon=json[0].value;
    }
    AnyBalance.setResult(result);
                                                                         	
  function getCouners(val){
        AnyBalance.trace('Remainders '+ JSON.stringify(val));
    		for(var i=0; i<val.length; ++i){
    			var rem = val[i];
    			if(rem.metadata.unitTypeId == 1||rem.metadata.valueTypeId==1)//минуты
    				setCounter(rem,'min')
    			else if(rem.metadata.unitTypeId == 2||rem.metadata.valueTypeId==3)//SMS
    				setCounter(rem,'sms')
//    			else if(rem.metadata.unitTypeId == 5)//Баланс
//    				setCounter(rem,'traffic')
    			else if(rem.metadata.unitTypeId == 3||rem.metadata.valueTypeId==6)//Мегабайты
    				setCounter(rem,'traffic')
    			else
    				AnyBalance.trace('Unknown remainder: ' + JSON.stringify(rem));
    			}
  }
    	function setCounter(rem,counter){
    		if (!cc[counter]) cc[counter]=1; else cc[counter]+=1;
    			if (rem.metadata.max)
    				result[counter+'_left'+cc[counter]]=(rem.metadata.max-rem.metadata.value).toFixed(1);
    			else
    				result[counter+'_left'+cc[counter]]=(rem.metadata.value).toFixed(1);
    			if (prefs.needPref||!AnyBalance.isAvailable(counter+'_left'+cc[counter]))
    				result[counter+'_left_name'+cc[counter]]=(rem.title+': ');
    		
                var dat=getParam(rem.metadata.endDate.replace(/(\d*)-(\d*)-(\d*)(T[\s\S]*)/,'$3.$2.$1'), null, null, null, null, parseDate);
                if (dat&&(!result.dateOfExpire||dat>result.dateOfExpire))result.dateOfExpire=dat;
    	}
}

