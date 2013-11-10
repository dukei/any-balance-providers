/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получение информации о состоянии баланса и использовании дневного лимита SMS с сайта http://sms.ru

Сайт оператора: http://sms.ru/
Личный кабинет: https://sms.ru/
*/

function main(){
		var prefs = AnyBalance.getPreferences();

		var baseurl = 'http://sms.ru/';

		var strToken = AnyBalance.requestGet(baseurl + 'auth/get_token');
		
		var strBalance = AnyBalance.requestPost(baseurl + 'my/balance', {
        		login:prefs.login,
        		password:prefs.password,
				token:strToken,
    	});
		
		var status = strBalance.substr(0,3);

		AnyBalance.trace(status);
	
		if( status > 100){
				throw new AnyBalance.Error('Ошибка. Что-то пошло не так');
    	}

		var strLimit = AnyBalance.requestPost(baseurl + 'my/limit', {
        		login:prefs.login,
        		password:prefs.password,
				token:strToken,
    	});

		if( status > 100){
				throw new AnyBalance.Error('Ошибка. Что-то пошло не так');
    	}
	
		var result = {success: true};

    	strBalance = strBalance.split("\n");
        result['balance'] = strBalance[strBalance.length-1]

		var strOctatok = strLimit.split("\n");
        result['octatok'] = strOctatok[strOctatok.length-2]-strOctatok[strOctatok.length-1]

		var strSent = strLimit.split("\n");
        result['sent'] = strLimit[strLimit.length-1]

		strLimit = strLimit.split("\n");
        result['limit'] = strLimit[strLimit.length-2]

		AnyBalance.setResult(result);
}

