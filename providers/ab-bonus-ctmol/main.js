/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

    Получает текущий баланс достпуных и ожидаемых баллов
	Данные берутся из личного кабинете программы (http://molbonus.ru/)
*/

function main(){
        var prefs = AnyBalance.getPreferences();
		var url='http://molbonus.ru/';
		var result = {success: true};
		AnyBalance.trace('Получение доступа.');
        var html = AnyBalance.requestPost(url, {
			plogin:prefs.login,
			pass:prefs.password,
			logot:'1',
			x:'59',
			y:'10'
		});

		regexp=/отложенных/m;
		regexp2=/Ошибка авторизации/m;
		if (str=regexp.exec(html)){	
			AnyBalance.trace('Доступ получен');
			}
		else if (str=regexp2.exec(html)){	
			AnyBalance.trace('Неправильная пара логин-пароль!');
			throw new AnyBalance.Error ('Неправильный логин-пароль.');
			}
		else	
			{
			AnyBalance.trace('Нет доступа');
           throw new AnyBalance.Error ('Доступ не получен.');
		};
			
		AnyBalance.trace('Разбор полученных данных:');
			
//Баланс отложенных бонусов
		regexp=/koball.>(.*)<.*отложенных/m;
		if (str=regexp.exec(html)){
			result.planbonus=parseFloat(str[1]);
        	pr=parseFloat(str[1])/10,
			result.planrubl=pr,
			AnyBalance.trace('Баланс отложенных бонусов = ' + parseFloat(str[1]));
			AnyBalance.trace('Баланс отложенных бонусов в рублях= ' + pr);
			}
		else	
			{
			AnyBalance.trace('Ошибка в запросе отложенных бонусов');
		};

//Баланс активных бонусов
		regexp=/отложенных.*>(.*)<.*активных/m;
		if (str=regexp.exec(html)){
			result.aktivbonus=parseFloat(str[1]);
        	ar=parseFloat(str[1])/10,
			result.aktivrubl=ar,
			AnyBalance.trace('Баланс активных бонусов = ' + parseFloat(str[1]));
			AnyBalance.trace('Баланс активных бонусов в рублях= ' + ar);
			}
		else	
			{
			AnyBalance.trace('Ошибка в запросе активных бонусов');
		};
		
			ir=pr+ar,
			irb=ir*10,
			result.itogrubl=ir,
			result.itogbonus=irb,
			
			AnyBalance.trace('Общий баланс баллов = ' + irb);
			AnyBalance.trace('Общий баланс баллов в рублях= ' + ir);
			
		AnyBalance.trace('Разбор завершен.');
		AnyBalance.setResult(result);
}





