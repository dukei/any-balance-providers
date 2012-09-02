/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий баланс бонусных баллов, статус карты, регион участия программы.

Сайт оператора: http://club-lukoil.ru/
Личный кабинет: http://club-lukoil.ru/cabinet/
Личный кабинет (информация о владельце): http://club-lukoil.ru/cabinet/personal
*/

function main(){
        var prefs = AnyBalance.getPreferences();
        var PASS = prefs.password;
		var LOGIN = prefs.login;
		var url='http://club-lukoil.ru/cabinet/';
		var url1='http://club-lukoil.ru/';
		var url2='http://club-lukoil.ru/cabinet/personal';
		var html1 = AnyBalance.requestPost(url1, prefs);
		AnyBalance.trace('Получение sessid');
		regexp=/bxSession.*\n*, '(.*)', /m;
        if (str=regexp.exec(html1)){
              sessid=str[1];
        }
		AnyBalance.trace('sessid = ' + sessid);
		
		AnyBalance.trace('Отправка запроса авторизации');
        var html = AnyBalance.requestPost(url, {
			LOGIN:prefs.login,
			PASS:prefs.password,
			sessid:sessid
		});
		var html2 = AnyBalance.requestPost(url2, {
			LOGIN:prefs.login,
			PASS:prefs.password,
			sessid:sessid
		});
		regexp=/Контактные данные/m;
		regexp2=/Неправильная пара логин-пароль/m;
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
		
		var result = {success: true};
		AnyBalance.trace('Разбор полученных данных:');

		
//Баланс
        regexp=/Баланс Ваших Баллов.*\n*>(.*) б/m;
        if (str=regexp.exec(html)){
              result.balance=str[1];
        }
		AnyBalance.trace('Баланс = ' + str[1]);

//Статус карты
		regexp=/Ваша Карта.*\n*>(.*)</m;
        if (str=regexp.exec(html)){
              result.status=str[1];
        }
		AnyBalance.trace('Статус карты = ' + str[1]);

//Регион программы
		regexp=/Регион Программы.*\n*>(.*)</m;
        if (str=regexp.exec(html)){
              result.region=str[1];
        }
		AnyBalance.trace('Регион = ' + str[1]);		
		
//Статус в программе
        regexp=/статус в Программе.*\n*>(.*)</m;
        if (str=regexp.exec(html)){
              result.statusprog=str[1];
        }
		AnyBalance.trace('Статус в программе = ' + str[1]);

//ФИО
        regexp=/ФИО.*\n*>(.*)</m;
        if (str=regexp.exec(html2)){
              result.username=str[1];
        }
		AnyBalance.trace('Владелец = ' + str[1]);

//Телефон
        regexp=/Мобильный телефон.*\n*>(.*)</m;
        if (str=regexp.exec(html2)){
              result.phonenumber=str[1];
        }
		AnyBalance.trace('Мобильный телефон = ' + str[1]);

		AnyBalance.trace('Разбор завершен.');
        AnyBalance.setResult(result);
}





