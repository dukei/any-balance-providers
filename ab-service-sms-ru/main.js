/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получение информации о состоянии баланса и использовании дневного лимита SMS с сайта http://sms.ru

Сайт оператора: http://sms.ru/
Личный кабинет: https://sms.ru/
*/

function getValue(result, namein, nameout){
		var matches, regexp = new RegExp('(?=(\n.*){1}$)', 'i');
		if(matches = namein.match(regexp)){
				if(AnyBalance.isAvailable(nameout))
						result[nameout] = parseFloat(matches[1].replace(',','.'));
		}
}

function main(){
		var prefs = AnyBalance.getPreferences();

		var baseurl = 'http://sms.ru/';

		var strToken = AnyBalance.requestGet(baseurl + 'auth/get_token');
		
		var strBalance = AnyBalance.requestPost(baseurl + 'my/balance', {
        		login:prefs.login,
        		password:prefs.password,
				token:strToken,
    	});

		var strLimit = AnyBalance.requestPost(baseurl + 'my/limit', {
        		login:prefs.login,
        		password:prefs.password,
				token:strToken,
    	});
	
		var result = {success: true};

		getValue(result, strBalance, 'balance');
		
		getValue(result, strLimit, 'sent');
    
		AnyBalance.setResult(result);
}

