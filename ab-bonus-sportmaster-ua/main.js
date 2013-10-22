/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Данные по бонусной карте Спортмастер

Сайт оператора: http://sportmaster.ru/
Личный кабинет: http://www.sportmaster.ru/personal/bonus.php
*/
var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
	'X-Requested-With':'XMLHttpRequest'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    /*if(prefs.password){
        AnyBalance.trace('Введен пароль - получаем данные из личного кабинета');

        var baseurl = "http://www.sportmaster.ru/personal/bonus.php?login=yes";
        var html = AnyBalance.requestPost(baseurl, {
            AUTH_FORM:'Y',
            TYPE:'AUTH',
            backurl:'/personal/bonus.php',
            USER_LOGIN:prefs.login,
            USER_PASSWORD:prefs.password
        });
        
        var error = getParam(html, null, null, /<font[^>]*class=['"]errortext['"][^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        
        var result = {success: true};
        
        getParam(html, result, 'cardnum', /Номер бонусной карты:[\s\S]*?>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, '__tariff', /Номер бонусной карты:[\s\S]*?>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'balance', /Доступно средств:[\s\S]*?>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    }else*/{
        AnyBalance.trace('Пароль не введен - получаем данные по номеру карты');

        var baseurl = "http://www.sportmaster.ua/";
        var types = {
            '600': 'Синяя карта',
            '601': 'Серебряная карта',
            '602': 'Золотая карта',
        };
        var json;

        for(var type in types){
            /*if(types[prefs.type] && type != prefs.type)
                continue; //Если у нас задан тип, то получаем сразу его*/
            var html = AnyBalance.requestPost(baseurl + '?module=club&action=CheckBonus', {
                card_type:type,
                card_number:prefs.login,
                ajax:'1'
            }, g_headers);
			
			json = getJson(html);

			if(json.message != false)
                break;
        }

        if(json.message == false){
            throw new AnyBalance.Error("Не удалось получить баланс. Неверный номер карты или сайт изменен?");
        }
		
        var result = {success: true};
        
        result.__tariff = types[type];
        if(AnyBalance.isAvailable('cardnum'))
            result.cardnum = prefs.login;
			
        getParam(json.message+'', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);
}
