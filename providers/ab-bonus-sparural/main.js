/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

    Получает текущий баланс достпуных и ожидаемых баллов
	Данные берутся из личного кабинете программы (http://www.sparural.ru/)
*/

function main(){
        var prefs = AnyBalance.getPreferences();
		var url='http://www.sparural.ru/netcat/modules/sparAuth/index.php?action=login';
		var url2='http://www.sparural.ru/cabinet/history/';
		var result = {success: true};
		AnyBalance.trace('Получение доступа.');
        var html = AnyBalance.requestPost(url, {
			user_cardNumber:prefs.login,
			user_cardPassword:prefs.password,
			user_name:'',
			user_gender:'1',
			user_birthday_day:'',
			user_birthday_month:'',
			user_birthday_year:'',
			user_birthday:'',
			user_phone:''
			
		});
		var html2 = AnyBalance.requestPost(url2);
		
		
		regexp=/Статистика покупок/m;
		regexp2=/Пароль/m;
		if (str=regexp.exec(html2)){	
			AnyBalance.trace('Доступ получен');
			}
		else if (str=regexp2.exec(html2)){	
			AnyBalance.trace('Неправильная пара логин-пароль!');
			throw new AnyBalance.Error ('Неправильный логин-пароль.');
			}
		else	
			{
			AnyBalance.trace('Нет доступа');
           throw new AnyBalance.Error ('Доступ не получен.');
		};
			
		AnyBalance.trace('Разбор полученных данных:');
			
//Баланс активных бонусов
		regexp2=/personal-account__bonus.>(.*)<tsp/m;
		if (str=regexp2.exec(html2)){
			result.aktivrubl=parseFloat(str[1]);
    		AnyBalance.trace('Баланс активных бонусов в рублях= ' + parseFloat(str[1]));
			}
		else	
			{
			AnyBalance.trace('Ошибка в запросе активных бонусов');
		};

//Баланс отложенных бонусов
		regexp3=/<span>(.*)<tsp/m;
		if (str=regexp3.exec(html2)){
			result.planrubl=parseFloat(str[1]);
        	AnyBalance.trace('Баланс отложенных бонусов в рублях = ' + parseFloat(str[1]));
			}
		else	
			{
			AnyBalance.trace('Ошибка в запросе отложенных бонусов');
		};
		
			
		AnyBalance.trace('Разбор завершен.');
		AnyBalance.setResult(result);
}





