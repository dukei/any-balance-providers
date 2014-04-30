/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
    var prefs = AnyBalance.getPreferences();
	
    var baseurl = 'https://issa.beltelecom.by/';
	
    var required_headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:12.0) Gecko/20100101 Firefox/12.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-ru,ru;q=0.8,en-us;q=0.5,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
    };
	
	var html = AnyBalance.requestGet(baseurl + "main.html", required_headers);
	
	var captchaa;
	/*if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet(baseurl+ '/ps/scc/php/cryptographp.php');
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}*/	
	
    html = AnyBalance.requestPost(baseurl + "main.html", {
		'redirect':'/main.html',
		'oper_user':prefs.login,
		'passwd':prefs.password,
		'cap_field':captchaa
    }, required_headers);

    //AnyBalance.trace(html);
	
	if (!/\/logout/i.test(html)) {
		var error = sumParam(html, null, null, /id="error"[^>]*>([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}	
	
    var result = {success: true};
	
	getParam(html, result, 'username', />\s*ФИО\s*\/\s*Компания[^:]*:([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'agreement', />\s*Договор([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);

	sumParam(html, result, 'balance', /\(<img[^>]*coins\.png">(?:&nbsp;|\s*)?Баланс([\d\s]+)р/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, '__tariff', /\d{8,}(?:\s|&nbsp;)?\(([^)]+)/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
	
	
	
    /*var $html = $(html);
    var $tableInfo = $html.find('table.ystyle:has(img[src*="images/issa/person.gif"])');
    AnyBalance.trace("Found info table: " + $tableInfo.length);
    
    /*if(AnyBalance.isAvailable('username')){
        var val = $tableInfo.find('td:has(img[src*="images/issa/person.gif"])').next().find('b').text();
        if(val)
            result.username = $.trim(val);
    }*/
    /*if(AnyBalance.isAvailable('agreement'))
        result.agreement = $.trim($tableInfo.find('td:has(img[src*="images/issa/account.gif"])').next().find('b').text());
    */
    //result.__tariff = $.trim($tableInfo.find('td:has(img[src*="images/issa/tariff.gif"])').next().find('b').text());
    
    /*var $tableBalance = $html.find('p:contains("Информация о лицевом счете")').next();
    AnyBalance.trace("Found balance table: " + $tableBalance.length);
    
    if(AnyBalance.isAvailable('balance')){
        var val = $tableBalance.find('td:contains("Актуальный баланс")').next().text();
        if(val && (matches = val.match(/[\-\d\.]+/)))
            result.balance = parseFloat(matches[0]);
    }
    
    if(AnyBalance.isAvailable('corrections')){
        var val = $tableBalance.find('td:contains("Сумма корректировок за текущий месяц:")').next().text();
        AnyBalance.trace("Corrections: " + val);
        if(val && (matches = val.match(/([\-\d\.]+)/))){
            result.corrections = parseFloat(matches[1]);
        }
    }

    if(AnyBalance.isAvailable('pays')){
        var val = $tableBalance.find('td:contains("Сумма платежей за текущий месяц:")').next().text();
        AnyBalance.trace("Pays: " + val);
        if(val && (matches = val.match(/([\-\d\.]+)/))){
            result.pays = parseFloat(matches[1]);
        }
    }*/
   
    AnyBalance.setResult(result);
}