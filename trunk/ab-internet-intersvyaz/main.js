/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

    Получает данные из личного кабинета провайдера Интерсвязь
	Данные берутся из личного кабинете программы (https://ooointersvyaz2.lk.is74.ru/auth/login)
*/

function main(){
        var prefs = AnyBalance.getPreferences();
		var url='https://ooointersvyaz2.lk.is74.ru/auth/login';
		var url2='https://ooointersvyaz2.lk.is74.ru/profile';
		var result = {success: true};
		AnyBalance.trace('Получение доступа.');
        var html = AnyBalance.requestPost(url, {
			YII_CSRF_TOKEN:'58ab76f2d4bc25fd038f1914246df898efe0fc02',
			u:prefs.login,
			p:prefs.password,
			yt0:'Войти'
		});

		regexp=/Ваш статус/m;
		regexp2=/Неправильный логин или пароль/m;
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
			
//Баланс
		 regexp=/Баланс на .*\n.*\n.*\t(.*) руб/m;
		 if (str=regexp.exec(html)){
			perevod=str[1].replace(',','.');
			result.balans=parseFloat(perevod);
        	AnyBalance.trace('Баланс счета = ' + parseFloat(perevod));
			}
		else	
			{
			AnyBalance.trace('Ошибка в запросе баланса');
		};

//Бонус в %
		regexp=/Ваш текущий бонус.*\n.*\n.*\n.\t(.*)%/m;
		if (str=regexp.exec(html)){
			result.bonuspr=parseFloat(str[1]);
        	AnyBalance.trace('Бонус в % = ' + parseFloat(str[1]));
			}
		else	
			{
			AnyBalance.trace('Ошибка в запросе бонуса');
		};

//Экономия
		regexp=/Ваш текущий бонус.*\n.*\n.*\n.*\n.*\n.*\n.* (.*) руб/m;
		if (str=regexp.exec(html)){
			result.econom=parseFloat(str[1]);
        	AnyBalance.trace('Экономия = ' + str[1]);
			}
		else	
			{
			AnyBalance.trace('Ошибка в запросе экономии');
		};

//Получение личных данных
		var html2 = AnyBalance.requestGet(url2);

//Абонент
		regexp=/Договор.*\n.*\n.*\n.*user-name.>(.*)</m;
		if (str=regexp.exec(html2)){
			result.fio=str[1];
			AnyBalance.trace('Абонент = ' + str[1]);
			}
		else	
			{
			AnyBalance.trace('Ошибка в запросе абонента');
		};

//Номер лицевого счета
		regexp=/Лицевой счет.*\n.*>(.*)</m;
		if (str=regexp.exec(html2)){
			result.nls=str[1];
			AnyBalance.trace('Номер лицевого счета = ' + result.nls);
			}
		else	
			{
			AnyBalance.trace('Ошибка в запросе лицевого счета');
		};
		
		AnyBalance.trace("Разбор завершен.");
		AnyBalance.setResult(result);
}