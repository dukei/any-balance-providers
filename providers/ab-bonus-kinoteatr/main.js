
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var baseurl = 'https://kinoteatr.ru';

function main() {
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	AnyBalance.restoreCookies();
	var token=AnyBalance.getData('token'+prefs.login);
	if (token){
   		var html = AnyBalance.requestGet(baseurl + '/bonus/?ajax=1&SessionId=' + encodeURIComponent(token));
	        var json = getJson(html);
        }else{
        	var json={request_data:{error:{message:'SessionId нет. token не был сохранен в AnyBalance'}}};
        }
        if (json.request_data.error.message){
        	if (/SessionId/.test(json.request_data.error.message)){
        		AnyBalance.trace('Получаем новый SessionId по логину и паролю');
        		for(let i=1;i<6;i++){
        			try{
        				AnyBalance.trace('Попытка ' + i + ' из 5ти');
        				var json = loginKino();
        				var token = json.result.SessionId;
                                        AnyBalance.trace('SessionId получен с ' + i + ' попытки.');
                                        var html = AnyBalance.requestGet(baseurl + '/bonus/?ajax=1&SessionId=' + encodeURIComponent(token));
                                        var json = getJson(html);
        				break;
        			}catch(e){
        				AnyBalance.trace(e.message);
        				if (i==5) {
                                                clearAllCookies();
						AnyBalance.setData('token'+prefs.login,'');
						AnyBalance.saveData();
        					throw new AnyBalance.Error(e.message, null, true);
                                        }
        			}
        		}
        	}else{
        		clearAllCookies();
			AnyBalance.setData('token'+prefs.login,'');
			AnyBalance.saveData();
        		throw new AnyBalance.Error(json.request_data.error.message, null, true);
        	}
        }
	var result = {
		success: true
	};
	try{
		var card = json.request_data.GetCardInfoResult.Card;
	    
	    if(json.request_data.CurrentBalance)
			AB.getParam(json.request_data.CurrentBalance, result, 'balance');
		else
			AB.getParam(json.content, result, 'balance', /программа лояльности[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		

		AB.getParam(card.CategoryPercent, result, 'percent');
		AB.getParam(card.CategoryStatusName, result, 'status');
		AB.getParam(card.NextCategoryStatusBalance 
			- card.CurrentStatusBalance, result, 'left_for_next_status', null, replaceTagsAndSpaces, parseBalance);
		AB.getParam(card.CategoryConfirmationDate, result, 'left_for_next_status_till', null, replaceTagsAndSpaces, parseDateISO);
		AB.getParam(card.Number, result, 'num');
		AB.getParam(card.CategoryStatusName + ': ' + card.Category, result, '__tariff');

	}catch(e){
		AnyBalance.trace('Не удалось получить баланс по информации о карте: ' + e.message);

   	   	var html = AnyBalance.requestGet(baseurl + '/bonus/profile/?ajax=1&SessionId=' + encodeURIComponent(token));
   	    
		json = getJson(html);
		var data = json.request_data;

		AB.getParam(data.CurrentBalance, result, 'balance');
		AB.getParam(data.UserInfo.CardNumber, result, 'num');
	}
	AnyBalance.saveCookies();
	AnyBalance.setData('token'+prefs.login,token);
	AnyBalance.saveData();
	AnyBalance.setResult(result);
}



function loginKino(){
	var prefs = AnyBalance.getPreferences();

   	var html = AnyBalance.requestPost(baseurl + '/_fv/', JSON.stringify({
   		method:"UserLogin",
                id:105,
   		params:{
   			Login:prefs.login,
   			Password:prefs.password
   		}
   	}));

   	var json = getJson(html);
   	AnyBalance.sleep(1000);
   	var html = AnyBalance.requestPost(baseurl + '/cgi-bin/auth.pl', JSON.stringify({
   		method:"UserLogin",
                id:105,
   		params:{
   			Login:prefs.login,
   			Password:prefs.password,
                        Token:json.f,
                        D1:prefs.login['length'] * json.tm + prefs.password['length'] - json.tm + json.ti + json.tl % json.ti
   		}
   	}));
        var json = getJson(html);

   	if(!json.result){
   		var error = json.error && json.error.message;
   		if(error)
   			throw new AnyBalance.Error(error, null, /email|парол/i.test(error));
   		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
   		
   	}
   	return json;
}
