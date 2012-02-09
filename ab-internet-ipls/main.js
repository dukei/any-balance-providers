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
    
    var error;
    if(error=/style='color:red'>([\W]+)</.exec(info)) //Что-то неправильно произошло. Скорее всего, пароль неправильный
        throw new AnyBalance.Error(error[1]);
    if(error=/<div class='mainmenu-act'>Вход в личный кабинет<\/div>/.exec(info))
        throw new AnyBalance.Error("Не указаны логин или пароль.");
    
    
    var result = {
        success: true
    };

    var matches;
    //Тарифный план
    if (matches=/Текущий тариф<\/td>\s<td[\s\w='-\/%]*>([\S ]+)</.exec(info)){
        result.__tariff=matches[1];
    }
    
    // ФИО
    if(AnyBalance.isAvailable('username')){
        if (matches=/ФИО<\/td>\s<td[\s\w='-\/%]*>([\S ]+)</i.exec(info)){
            result.username=matches[1];
        }
    }
    
    var account = AnyBalance.requestGet(baseurl + "?module=accounts");
	
	// Лицевой счет
    if(AnyBalance.isAvailable('license')){
        if (matches=/ID лицевого счета<\/td>\s<td[\s\w='-\/%]*>([\d\.]+)</.exec(account)){
            result.license=matches[1];
        }
    }
	
	// Баланс
    if(AnyBalance.isAvailable('balance')){
        if (matches=/Баланс<\/td>\s<td[\s\w='-\/%]*>([\d\.-]+)</.exec(account)){
            var tmpBalance=matches[1].replace(/ |\xA0/, ""); // Удаляем пробелы
            tmpBalance=tmpBalance.replace(",", "."); // Заменяем запятую на точку
            result.balance=parseFloat(tmpBalance);
        }
    }
	
	// Кредит
    if(AnyBalance.isAvailable('credit')){
        if (matches=/Кредит<\/td>\s<td[\s\w='-\/%]*>([\d\.]+)</.exec(account)){
            var tmpBalance=matches[1].replace(/ |\xA0/, ""); // Удаляем пробелы
            tmpBalance=tmpBalance.replace(",", "."); // Заменяем запятую на точку
            result.credit=parseFloat(tmpBalance);
        }
    }
	
	// Статус блокировки
    if(AnyBalance.isAvailable('block')){
        if (matches=/Статус блокировки<\/td>\s<td[\s\w='-\/%]*>([\d\.]+)</.exec(account)){
            var tmpBalance=matches[1].replace(/ |\xA0/, ""); // Удаляем пробелы
            tmpBalance=tmpBalance.replace(",", "."); // Заменяем запятую на точку
            switch (parseInt(tmpBalance)) {
				case 0:	
					result.block='Работает';
					break;
				case 16:	
					result.block='Заблокирован';
					result.license='<font color="red"><b><s>'+result.license+'</b></s></font>'
					break;
				
				default:
					result.block="Статус блокировки = "+parseInt(tmpBalance);
			
			}
			
        }
    }
	
 
    AnyBalance.setResult(result);
}

