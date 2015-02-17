/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function parseBalanceRK(_text){
	var text = _text.replace(/\s+/g, '');
	var rub = getParam(text, null, null, /(-?\d[\d\.,]*)руб/i, replaceFloat, parseFloat) || 0;
	var kop = getParam(text, null, null, /(-?\d[\d\.,]*)коп/i, replaceFloat, parseFloat) || 0;
	var val = rub+kop/100;
	AnyBalance.trace('Parsing balance (' + val + ') from: ' + _text);
	return val;
}

function parseTrafficGb(str){
	var val = getParam(str.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
	return parseFloat((val/1024).toFixed(2));
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
    var baseurl = "https://lka.ural.mts.ru/";
	
    var city2num = {
		ekat: 42,
		kem: 29,
		nef: 2,
		nizv: 16,
		ntagil: 43,
		novk: 30,
		nyg: 4,
		orn: 26,
		perm: 44,
		pyh: 2,
		rad: 8,
		sur: 5,
		tob: 28,
		tum: 6,
		yamal: 7,
		// Оставлено для совместимости, можно потом удалить
		bug: 26,
		buz: 26,
		novt: 26,
		noy: 7,
		prm: 26,
		prg: 26,
		sor: 26,
	};

    if(prefs.type != 0 && prefs.type != 500 && prefs.type != 550 && !prefs.city)
        throw new AnyBalance.Error('Для выбранного типа подключения необходимо явно указать ваш город.');
	
/*    AnyBalance.trace(JSON.stringify({
        extDvc:prefs.type,
        authCity:(prefs.city && city2num[prefs.city]) || 26,
        authLogin:prefs.login,
        authPassword:prefs.password,
        userAction:'auth'
    }));
*/

    var html = AnyBalance.requestPost(baseurl, {
        extDvc:prefs.type,
        authCity:(prefs.city && city2num[prefs.city]) || 26,
        authLogin:prefs.login,
        authPassword:prefs.password,
        userAction:'auth'
    });

    if(!/\/index\/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*background-color:\s*Maroon[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
		
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }
    var result = {success: true};
	
	if(!prefs.accnum) {
		getParam(html, result, 'balance', /Баланс:[\S\s]*?<strong[^>]*>([\S\s]*?)<\/strong>/i, replaceTagsAndSpaces, parseBalanceRK);
		getParam(html, result, 'status', /Статус:[\S\s]*?<strong[^>]*>([\S\s]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'licschet', /Лицевой счёт:[\S\s]*?<strong[^>]*>([\S\s]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, '__tariff', /Тарифный план:[\S\s]*?<strong[^>]*>([\S\s]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
	} else {
		// Теперь таблица услуг
		var table = getParam(html, null, null, /(<table[\s\S]{1,150}id="list"[\s\S]*?<\/table>)/i);
		if(!table)
			throw new AnyBalance.Error('Не найдена таблица услуг. Обратитесь к автору провайдера по имейл.');
		
		var re = /(<tr[\s\S]*?<\/tr>)/ig;
		html.replace(re, function(tr) {
			if(AnyBalance.isSetResultCalled())
				return; //Если уже вернули результат, то дальше крутимся вхолостую
			
			var accnum = (prefs.accnum || '').toUpperCase();
			var acc = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){1}\s*(?:<b>|<a href[\s\S]*?>|)\s*([\s\S]*?)\s*(?:<\/b>|<\/a>|)\s*<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
			//var acc = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){2}\s*([\s\S]*?)\s*<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
			if(!prefs.accnum || /*(name && name.toUpperCase().indexOf(accnum) >= 0) || */(acc && acc.toUpperCase().indexOf(accnum) >= 0))
			{
				getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){5}\s*(?:<b>|<a href[\s\S]*?>|)\s*([\s\S]*?)\s*(?:<\/b>|<\/a>|)\s*<\/td>/i, replaceTagsAndSpaces, parseBalanceRK);
				//getParam(html, result, 'status', /Статус:[\S\s]*?<strong[^>]*>([\S\s]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
				getParam(tr, result, 'licschet', /(?:[\s\S]*?<td[^>]*>){1}\s*(?:<b>|<a href[\s\S]*?>|)\s*([\s\S]*?)\s*(?:<\/b>|<\/a>|)\s*<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
				//getParam(html, result, '__tariff', /Тарифный план:[\S\s]*?<strong[^>]*>([\S\s]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
				getParam(tr, result, 'usluga', /(?:[\s\S]*?<td[^>]*>){4}\s*(?:<b>|<a href[\s\S]*?>|)\s*([\s\S]*?)\s*(?:<\/b>|<\/a>|)\s*<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
				AnyBalance.setResult(result);
				return;
			}
		});
	}
    AnyBalance.setResult(result);
}