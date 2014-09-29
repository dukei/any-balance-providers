/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    if(prefs.password){
		checkEmpty(prefs.login, 'Введите логин!');
		
        AnyBalance.trace('Введен пароль - получаем данные из личного кабинета');

        var baseurl = "https://www.sportmaster.ru/personal/bonus.php?login=yes";
		
		var html = AnyBalance.requestPost(baseurl, {
			AUTH_FORM:'Y',
			TYPE:'AUTH',
			backurl:'/personal/bonus.php',
			USER_LOGIN:prefs.login,
			USER_PASSWORD:prefs.password
		});
		
		var error = getParam(html, null, null, /<font[^>]*class=['"]errortext['"][^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error) {
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		}
        
        var result = {success: true};
        //getParam(html, result, 'cardnum', /Номер бонусной карты:[\s\S]*?>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, '__tariff', /Уровень вашей бонусной программы:[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'balance', /У вас общих бонусов[^>]*>\s*(\d+)/i, replaceTagsAndSpaces, parseBalance);
		
		if(isAvailable('all')) {
			var table = getParam(html, null, null, /<table[^>]*clubTableA[^>]*>(?:[\s\S](?!<\/table>))[\s\S]*?<\/table>/i);
			if(table) {
				var string = '';
				var array = sumParam(table, null, null, /<tr>\s*<td[^>]*>\s*[\s\S]*?<\/tr>/ig, replaceTagsAndSpaces);
				for(var i = 1; i < array.length; i++) {
					var current = getParam(array[i], null, null, null, [/(\d{4})$/i, '$1\n', /(\d{2})-(\d{2})-(\d{4})/, '$1/$2/$3']);
					string += current;
				}
				getParam(string, result, 'all');
			}
		}
    } else {
		throw new AnyBalance.Error("Спортмастер ввел подтверждение входа по смс, поэтому получение баланса работает только при вводе логина и пароля.", null, true);
        AnyBalance.trace('Пароль не введен - получаем данные по номеру карты');

        var baseurl = "http://www.sportmaster.ru/club-program/";
        var types = {
            '300': 'Синяя карта',
            '301': 'Серебряная карта',
            '302': 'Золотая карта',
        };
        var status;

        for(var type in types){
            if(types[prefs.type] && type != prefs.type)
                continue; //Если у нас задан тип, то получаем сразу его

            var html = AnyBalance.requestPost(baseurl, {
                card_type:type,
                card_id:prefs.login,
                check_bonus:''
            });
            status = getParam(html, null, null, /card_bonus\s*=\s*'([^']*)/, replaceSlashes);
            if(/Доступно средств:/i.test(status))
                break;
        }

        if(!/Доступно средств:([^']*)/i.test(html)){
            if(status)
                throw new AnyBalance.Error(status);
            throw new AnyBalance.Error("Не удалось получить баланс. Неверный номер карты или сайт изменен?");
        }

        var result = {success: true};
        
        result.__tariff = types[type];
        if(AnyBalance.isAvailable('cardnum'))
            result.cardnum = prefs.login;
        getParam(html, result, 'balance', /Доступно средств:([^']*)/i, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);
}

function aggregate_newline(values, delimiter, allow_empty) {
	if (values.length == 0) 
		return;
	if (!isset(delimiter)) 
		delimiter = ', ';
	var ret = values.join(delimiter);
	if (!allow_empty) 
		ret = ret.replace(/^(?:\s*,\s*)+|(?:\s*,\s*){2,}|(?:\s*,\s*)+$/g, '');
	return ret;
}
