// Идея почерпнута у MtSoft.ru
// Черт, но там уже всё устарело нахрен :(
// Домашний Интернет и Телевидение МТС
// Текущий баланс у провайдера "Домашний Интернет и Телевидение МТС"
// Сайт оператора: http://www.dom.mts.ru/
// Личный кабинет: http://kabinet.mts.ru/

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://kabinet.mts.ru/zservice/';
    // Заходим на главную страницу
    var info = AnyBalance.requestPost(baseurl + "go", {
    	action: 'startup',
    	logname: prefs.login,
        password: prefs.password
    });

    var $parse = $(info);
    var error = $.trim($parse.find('div.logon-result-block>p').text());
    
    if(error)
    	throw new AnyBalance.Error(error);
    
    // Находим ссылку "Состояние счета"
    var $url=$parse.find("A:contains('Состояние счета')");
    if ($url.length!=1)
    	throw new AnyBalance.Error("Невозможно найти ссылку на состояние счета");
    
    var html = AnyBalance.requestGet(baseurl + $url.attr('href'));
    var result = {success: true};

    var matches;
    
    //Тарифный план
    if (matches=/Тарифный план:[\s\S]*?>(.*?)</.exec(html)){
    	result.__tariff=matches[1];
    }
    
    // Баланс
    if(AnyBalance.isAvailable('balance')){
	    if (matches=/Ваш текущий баланс[\s\S]*?>(.*?)&/.exec(html)){
	        var tmpBalance=matches[1].replace(/ |\xA0/, ""); // Удаляем пробелы
	        tmpBalance=tmpBalance.replace(",", "."); // Заменяем запятую на точку
	        result.balance=parseFloat(tmpBalance);
	    }
    }

    // Лицевой счет
    if(AnyBalance.isAvailable('license')){
	    if (matches=/Лицевой счет:[\s\S]*?>(.*?)</.exec(html)){
	    	result.license=matches[1];
	    }
    }

    // Номер договора
    if(AnyBalance.isAvailable('agreement')){
	    if (matches=/Договор:[\s\S]*?>(.*?)</.exec(html)){
	    	result.agreement=matches[1];
	    }
    }

    // ФИО
    if(AnyBalance.isAvailable('username')){
	    if (matches=/<h3>([^<]*)<\/h3>/i.exec(html)){
	        result.username=matches[1];
	    }
    }
    
    AnyBalance.setResult(result);
}

