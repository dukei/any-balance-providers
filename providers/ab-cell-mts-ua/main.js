/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сотового оператора МТС (Украина). Вход через PDA-версию.

Сайт оператора: http://mts.com.ua/
Личный кабинет: https://ihelper-prp.mts.com.ua/SelfCarePda/
*/
var g_apiHeaders = {
    Connection: 'keep-alive',
	Accept: 'application/json, text/plain, */*',
	Origin: 'https://my.vodafone.ua',
	Origin: 'file://',
	'Accept-Encoding': null,
	Authorization:'Basic YXBwLW15dm9kYWZvbmUtd2lkZ2V0LW13OktGLXJGdjUhMjVmIQ==',
	'User-Agent': 'Mozilla/5.0 (Linux; Android 8.0; ONEPLUS A3010 Build/OPR6.170623.013) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Crosswalk/18.48.477.13 Mobile Safari/537.36',
	'Content-Type': 'application/manifest+json; charset=UTF-8'
}
var valut={en:' UAH',ru:' грн.',ua:' грн.'}
var monthes={
	en:['January','February','March','April','May','June','July','August','September','October','November','December'],
	ru:['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
	ua:['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень']
	}
var minuteName={en:' min.',ru:' мин.',ua:' хв.'};

function parseTrafficMb(str){
    var val = parseBalance(str);
    if(isset(val))
        val = Math.round(val/1024*100)/100;
    return val;
}

function main(){
	main_api();
}



function callApi(requests,charset){
	//Почему-то апи плохо понимает UTF-16. Приходится через бинарник перекодировать
	g_apiHeaders['Content-Type']='application/manifest+json; charset='+charset;
	var html = AnyBalance.requestPost('https://cscapp.vodafone.ua/eai_mob/start.swe?SWEExtSource=JSONConverter&SWEExtCmd=Execute', JSON.stringify({
		"requests": requests,
		"params":{
			"version":"4.0.6.0",
			"accessType": "",
			"language": callApi.lang,
			"source":"android 8",
			"token": callApi.token || null,
			"manufacture":"OnePlus",
			"childNumber":"",
                        "spinner": 0
		}
	}), g_apiHeaders, { options: { FORCE_CHARSET: charset }}
	);
	if (!html) throw new AnyBalance.Error('Сервер не отвечает. Попробуйте позже.', true);
	if (/<head><title>[\S\s]+?<\/title>/.test(html)) throw new AnyBalance.Error(getParam(html, null, null,/<title>([\S\s]+?)<\/title>/), true);
	if (charset=='base64') var response=decodeUTF16LE(Base64.decode(html)); else var response=html;
        //AnyBalance.trace('===========Ответ:\n'+response);
        response = response.replace(/[\u0000-\u0019]+/g,""); 
	var json = getJson(response);
	return json;
}

//Braindead decoder that assumes fully valid input
function decodeUTF16LE( binaryStr ) {
    var cp = [];
    for( var i = 0; i < binaryStr.length; i+=2) {
        cp.push( 
             binaryStr.charCodeAt(i) |
            ( binaryStr.charCodeAt(i+1) << 8 )
        );
    }

    return String.fromCharCode.apply( String, cp );
}

function throwApiError(res, verb){
	if(res.error){
		AnyBalance.trace('Result of ' + verb + ': ' + JSON.stringify(res));
		var message = getMtsErrorText(res.error) || 'Ошибка ' + verb + ': ' + res.error;
		throw new AnyBalance.Error(message, null, res.error == 202);
	}
	if (res[verb]) throwApiError (res[verb],verb);
}

function callApi1(verb, request){
    var params = {};
    params[verb] = request || {};
    var charset='UTF-8';
    var i=1;
  while (i<2){
    try{
        if (i>1){
        	AnyBalance.trace('Попытка получить '+verb+' '+i+' из 3');
        	AnyBalance.trace('Ждем 15 сек. перед повтором');
        	AnyBalance.sleep(1000);
        }
        if (i>3) charset='UTF-16';
        if (i>6) charset='base64';
    	var json = callApi(params,charset);
    	var res = json[verb];
	throwApiError(json, verb);
	return json[verb].values;
   }catch(e){
        var message=e.message;
   	AnyBalance.trace('message: '+message);
   }
   i+=1;
  }
  throw new AnyBalance.Error(message);
}

function parseBalanceRound(str){
	var b = parseBalance(str);
	if(isset(b))
		b = Math.round(b*100)/100
	return b;
}

function main_api(){
    var prefs = AnyBalance.getPreferences();
    var prefs = AnyBalance.getPreferences();
    checkEmpty(prefs.login, 'Введите номер телефона для входа в интернет-помощник!');
    prefs.login=prefs.login.replace(/([^\d]*)/g,"").substr(-9);
    if(prefs.login && !/^\d{9}$/i.test(prefs.login)) {
	throw new AnyBalance.Error('В качестве номера необходимо ввести 9 цифр номера, например, 501234567, или не вводить ничего, чтобы получить информацию по основному номеру.');
    }

    prefs.lang=prefs.lang||'ru';
    var token = AnyBalance.getData('token_' + prefs.login), json;
    if(token){
    	callApi.token = token;
        callApi.lang = prefs.lang;
    	AnyBalance.trace("We have token saved. Trying to get access");

    	json = callApi({checkBlockService:
    		 {
    			language: 'en',
    			source: 'android 8',
    			token: token,
    			version: '2.1.1'
    		}}
    	);
    	if(json.checkBlockService.error){
    		AnyBalance.trace('Previous token is invalid: ' + json.checkBlockService.error);
    		token = null;
    	}
    }

    if(!token){
    	AnyBalance.trace("Нужно логиниться");
    	json = callApi1('loginV2', {id: prefs.login});
    	var tempToken;
    	tempToken = json.tempToken;
    	AnyBalance.trace('Получен tempToken по login');
    	if (/^\d{8}$/i.test(prefs.password)) {
    		AnyBalance.trace("Вход по PUK коду");
	        json = callApi1('getToken', {action: 0, id: prefs.login, parentToken: "", rememberMe: true, tempToken: tempToken, tpass: "", puk: prefs.password});
    	}
        token = callApi.token = json.token;
        if(!token){
        	AnyBalance.trace("Вход по SMS");
   		var code = AnyBalance.retrieveCode('Пожалуйста, введите код, отправленный вам по SMS на номер ' + prefs.login, null, {inputType: 'number', time: 180000});
	    	json = callApi1('getToken', {action: 0, id: prefs.login, parentToken: "", rememberMe: true, tempToken: tempToken, tpass: code});
	    	token = callApi.token = json.token;
    	}
        if(!token) throw new AnyBalance.Error('Авторизация не удалась Сайт изменен?');
    	AnyBalance.setData('token_' + prefs.login, token);
    	AnyBalance.saveData();
    }

//Баланс
    var result = {success: true};
    	AnyBalance.trace('Getting balance');
    	json = callApi1('balance');
    	getParam(json.balance.toString(), result, 'balance', null, null, parseBalanceRound);
//Тарифный план
    	AnyBalance.trace('Getting current plan');
    	json = callApi1('currentPlan');
    	getParam(json.name, result, '__tariff');
    	getParam('<strong>'+json.desc+' ('+json.regularCost+ valut[prefs.lang]+')</strong>', result, 'info');
    	
//SMS,минуты,доп.счет,срок действия номера,срок действия тарифа
    if(AnyBalance.isAvailable('sms_left','sms_left1','sms_left2','sms_left3','sms_left4', 'min_left', 'min_left1', 'min_left2', 'min_left3', 'min_left4','ama','endTP')){
    	json=getCouners('countersMainV2');
    	getParam(json.dateOfExpire + '', result, 'dateOfExpire', null, null, parseDate);
    	getParam(json.ama.balance, result, 'ama', null, null, parseBalance);
    	if (json.endTP.endedDateTP){
    		getParam(json.endTP.endedDateTP+'', result, 'endTP', null, null, parseDate);
    	}else{
    		result.endTP=+new Date()}
    	if(json.servicePackage.message) 
    		result.info+=(result.info?'<br>':'')+'<font  color=#B00000>'+json.servicePackage.message+'</font>';
    }

//Бонусы
    if(AnyBalance.isAvailable('bonus_balance')){
    	    	AnyBalance.trace('Getting bonus balance');
    		var val = callApi1('getBonus');
    		getParam(val.balance + '', result, 'bonus_balance', null, null, parseBalance);
                if(isAvailable('info') && val.debitBonusesCount>0) {
                	var bonusText;
                	if (prefs.lang=='en'){
                		bonusText=val.debitBonusesCount + ' bonuses will be debited ' + getFormattedDate('MM-DD-YY',new Date(parseDate(val.debitBonusesDate)));
                	}else if  (prefs.lang=='ua'){
                		bonusText=getFormattedDate('DD.MM.YYYY',new Date(parseDate(val.debitBonusesDate)))+' р. буде списано '+val.debitBonusesCount+' бонусів.';
                	}else{
                		bonusText=getFormattedDate('DD.MM.YYYY',new Date(parseDate(val.debitBonusesDate)))+' г. будет списано '+val.debitBonusesCount+' бонусов.';
                	}
                	result.info+=(result.info?'<br>':'') + '<font  color=#B00000>'+bonusText+'</font>';
    	}
    }
//Трафик
    	if(AnyBalance.isAvailable('traffic_left','traffic_left1','traffic_left2','traffic_left3','traffic_left4'))
    		getCouners('countersMainDPIv3');

//Подключенные услуги
	if (prefs.service && prefs.service!='0' && AnyBalance.isAvailable('info')){
		AnyBalance.trace('services');
                let val = callApi1('services');
                let servicesText='';
                val.sort(function (a, b) {return ((b.catPriority||0)*10000+b.priority||0)-((a.catPriority||0)*10000+a.priority||0)});
                for(var i=0; i<val.length; ++i){
                	if (prefs.service=='2'||parseBalance(val[i].cost,true)){
                		servicesText+=servicesText?'<br>':'';
                                servicesText+=val[i].name;
                                servicesText+=parseBalance(val[i].cost)>0?':<strong>'+parseBalance(val[i].cost,true).toFixed(2)+valut[prefs.lang]+'/'+val[i].interval+'</strong> ':'';
                	}
                }
                if (servicesText){
                	result.info+=(result.info?'<br><br>':'')+'<strong>';
                        if (prefs.lang=='en'){
                        	result.info+=prefs.service=='2'?'Services:':'Paid services:'
                        }else if  (prefs.lang=='ua'){
                        	result.info+=prefs.service=='2'?'Послуги:':'Платні послуги:'
                        }else{
                        	result.info+=prefs.service=='2'?'Услуги:':'Платные услуги:'
                        }
                        result.info+='</strong><br>'+servicesText;
                }
	}
//Расходы
	if (prefs.exps && prefs.exps!='0' && AnyBalance.isAvailable('info')){
		AnyBalance.trace('getBalanceHistoryV2');
                let json = callApi1('getBalanceHistoryV2');
                let val=json.item;
                let servicesText='';
                val.sort(function (a, b) {return parseDate(b.period,true)-parseDate(a.period,true)})
                var prevDat='';
                for(var i=0; i<val.length; ++i){
                	if (parseBalance(val[i].cost,true)||prefs.exps==2){
                		servicesText+=servicesText?'<br>':'';
                		if (prevDat!=val[i].period) {
                                	let d=new Date(parseDate(val[i].period,true));
                                	servicesText+='<font  color=#0000cd>'+monthes[prefs.lang][d.getMonth()]+' '+d.getFullYear()+'</font>:<br>';
                		}
                                servicesText+='<small>'+val[i].categoryName+'</small>';
                		if (parseBalance(val[i].cost,true))
                                	servicesText+=':<strong>'+parseBalance(val[i].cost,true).toFixed(2)+valut[prefs.lang]+'</strong> ';

                                prevDat=val[i].period;
                	}
                }
                if (servicesText){
                	result.info+=(result.info?'<br><br>':'')+'<strong>';
                        if (prefs.lang=='en'){
                        	result.info+='Expenses:</strong><br>Average:'
                        }else if  (prefs.lang=='ua'){
                        	result.info+='Витрати:</strong><br>В середньому:'
                        }else{
                        	result.info+='Расходы:</strong><br>В среднем:'
                        }
                        result.info+=parseBalance(json.averageCost).toFixed(2)+valut[prefs.lang]+'<br>'+servicesText;
                }
	}


    getParam(prefs.login, result, 'phone');
    AnyBalance.setResult(result);

function getCouners(val){
	AnyBalance.trace('Getting remainders '+val);
        json = callApi1(val);
        AnyBalance.trace('Remainders '+val+': ' + JSON.stringify(json));
        val=json.counters;
    	let sms_left='';
    	let min_left='';
    	let traffic_left='';
                val.sort(function (a, b) {return (Number(b.priority)+(b.mainFlg=='Y'?9999:0))-(Number(a.priority)+(a.mainFlg=='Y'?9999:0))});
    		for(var i=0; i<val.length; ++i){
    			var rem = val[i];
    			if(rem.type == 'SMSMMS' && 0+sms_left<5){
    				result['sms_left'+sms_left]=rem.remainValue;
                                if (prefs.needSuf) result['suf_sms_left' + sms_left] = '/' + rem.fullValue;
                                result['suf_sms_left' + sms_left]=(result['suf_sms_left' + sms_left]||'')+' sms';
                                if (prefs.needPref||!AnyBalance.isAvailable('sms_left'+sms_left)) result['pre_sms_left' + sms_left] = rem.name + ' ';
                                if (sms_left) {sms_left+=1} else {sms_left=1};
    			}else if(rem.type == 'Minutes' && 0+min_left<5){
    				result['min_left'+min_left]=rem.remainValue;
                                if (prefs.needSuf) result['suf_min_left' + min_left] = '/'+rem.fullValue;
                                result['suf_min_left' + min_left]=(result['suf_min_left' + min_left]||'')+minuteName[prefs.lang];
                                if (prefs.needPref||!AnyBalance.isAvailable('min_left'+min_left)) result['pre_min_left' + min_left] = rem.name + ' ';
                                if (min_left) {min_left+=1} else {min_left=1};
    			}else if(rem.type == 'Internet' && 0+traffic_left<5){
    				result['traffic_left'+traffic_left]=parseTraffic(rem.remainValue + ' '+rem.unit)
                                if (prefs.needSuf) result['suf_traffic_left' + traffic_left] = '/'+parseTraffic(rem.fullValue+' '+rem.unit);
                                result['suf_traffic_left' + traffic_left]=(result['suf_traffic_left' + traffic_left]||'')+' Mb';
                                if (prefs.needPref||!AnyBalance.isAvailable('traffic_left'+traffic_left)) result['pre_traffic_left' + traffic_left] = rem.name + ' ';
                                if (traffic_left) {traffic_left+=1} else {traffic_left=1};
    			}else{
    				AnyBalance.trace('Unknown remainder: ' + JSON.stringify(rem));
    			}
    		}
    	return json;
}
}
