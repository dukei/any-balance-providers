 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Домашний Интернет и Телевидение Айпильсин
Сайт оператора: http://www.ipls.ru/
Личный кабинет: https://stat.ipls.ru/user/
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://stat.ipls.ru/user/';
AnyBalance.setDefaultCharset('utf-8');    
// Заходим на главную страницу
    var info = AnyBalance.requestPost(baseurl + "", {
    	login: prefs.login,
        password: prefs.password
    });
var $parse = $(info);
    
var error;
    if(error=/style='color:red'>([\W]+)</.exec(info)) //Что-то неправильно произошло. Скорее всего, пароль неправильный
      throw new AnyBalance.Error(error[1]);
      if(error=/<div class='mainmenu-act'>Вход в личный кабинет<\/div>/.exec(info))
      throw new AnyBalance.Error("Не указаны логин или пароль.");
    
    
var result = {success: true};

var matches;
    //Тарифный план
    if (matches=/Текущий тариф<\/td>\s<td[\s\w='-\/%]*>([\S ]+)</.exec(info)){
    	result.__tariff=matches[1];
    }
    


// Баланс
    if(AnyBalance.isAvailable('balance')){
	    if (matches=/Баланс<\/td>\s<td[\s\w='-\/%]*>([\d\.]+)</.exec(info)){
	        var tmpBalance=matches[1].replace(/ |\xA0/, ""); // Удаляем пробелы
	        tmpBalance=tmpBalance.replace(",", "."); // Заменяем запятую на точку
	        result.balance=parseFloat(tmpBalance);
	    }
    }
    // Лицевой счет
    if(AnyBalance.isAvailable('license')){
	    if (matches=/Основной лицевой счет<\/td>\s<td[\s\w='-\/%]*>([\d\.]+)</.exec(info)){
	    	result.license=matches[1];
	    }
    }

   // ФИО
    if(AnyBalance.isAvailable('username')){
	    if (matches=/ФИО<\/td>\s<td[\s\w='-\/%]*>([\S ]+)</i.exec(info)){
	        result.username=matches[1];
	    }
    }
    
 
AnyBalance.setResult(result);
}

