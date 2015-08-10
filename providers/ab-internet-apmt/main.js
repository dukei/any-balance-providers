/**

Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Московский интернет провайдер АПМ-Телеком предлагает услуги широкополосного доступа в интернет
Сайт оператора: http://apmt.ru/
Личный кабинет: https://stat.apmt.ru/
*/



function main()
{

    var prefs = AnyBalance.getPreferences();

    var baseurl = 'https://stat.apmt.ru/';

    AnyBalance.setDefaultCharset('utf-8');

// Заходим на главную страницу


    var info = AnyBalance.requestPost(baseurl + "", {
        login: prefs.login,
        password: prefs.password
    });


    var error;

    if(error=/style='color:red'>([\W]+)</.exec(info))
//Что-то неправильно произошло. Скорее всего, пароль неправильный

        throw new AnyBalance.Error(error[1]);

    if(error=/<div class='mainmenu-act'>Вход в личный кабинет<\/div>/.exec(info))

        throw new AnyBalance.Error("Не указаны логин или пароль.");


    var result = {
        success: true
    };


    var matches;


// Баланс


    if(AnyBalance.isAvailable('balance')){

        if (matches=/Баланс<\/td>\s<td[\s\w='-\/%]*>([\d\.]+)</.exec(info))
{
           var tmpBalance=matches[1].replace(/ |\xA0/, "");
// Удаляем пробелы
            tmpBalance=tmpBalance.replace(",", ".");
// Заменяем запятую на точку
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

    if(AnyBalance.isAvailable('subscriber')){

        if (matches=/ФИО<\/td>\s<td[\s\w='-\/%]*>([\S ]+)</i.exec(info)){

            result.subscriber=matches[1];
        }
    }


// Состояние интернета

    if(AnyBalance.isAvailable('statusInt')){
        if (matches=/Состояние интернета<\/td>\s<td[\s\w='-\/%]*>([а-яА-Я]+)\s</i.exec(info)){

            result.statusInt=matches[1];
        }
    }

    AnyBalance.setResult(result);

}

