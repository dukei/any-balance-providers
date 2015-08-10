/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Сеть магазинов «Фокстрот» техника для дома
Сайт «Фокстрот»: http://www.foxtrot.com.ua/uk
«Программа комфорта»: http://www.my-comfort.com.ua/
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = 'http://www.my-comfort.com.ua/';

    AnyBalance.trace("Trying to enter selfcare at address: " + baseurl + 'Members/Login');
    var html = AnyBalance.requestPost(baseurl + 'Members/Login', {
    	Card: prefs.login,
	PhoneCountryCode: prefs.prefct,
	PhoneCode: prefs.prefph,
        PhoneNumber: prefs.phone
    });

    if (!/Logoff/i.test(html)) {
    	var error = getParam(html, null, null, /<div class=\"validation-summary-errors\" data-valmsg-summary=\"true\"><ul><li>([^<]*)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
    	if (error)
			throw new AnyBalance.Error(error);
		
		AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    // Баланс на счету
    sumParam (html, result, 'balance', /Баллы: <\/span><span class=[^<]*>(\d+)</ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    
    // Активные бонусы
    sumParam (html, result, 'bonus_active', /Активные бонусы: (\d+)\s*<\/div>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);

    // Неактивные бонусы
    sumParam (html, result, 'bonus_unactive', /Неактивные бонусы: (\d+)<br\/>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);

    //Размер скидки
    var skidkatemp = sumParam (html, null, null, /Баллы: <\/span><span class=[^<]*>(\d+)</ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    result.skidka = skidka2balance(skidkatemp);
    
//    html = AnyBalance.requestGet(baseurl + 'Members/Summary', {
//    });

    // Остаток баланса до увеличения %
//    sumParam (html, result, 'balance_left', /Для перехода на новый уровень Вам не хватает (\d+) баллов\!<\/p>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    result.balance_left = skidka2balanceleft(skidkatemp);

    html = AnyBalance.requestGet(baseurl + 'Members/PersonalData', {
    });

    //Название
    sumParam(html, result, '__tariff', /id=\"LastName\" name=\"LastName\" style=\"[^<]*\" type=\"text\" value=\"([\s\S]*?)\" \/>/ig, replaceTagsAndSpaces, html_entity_decode, create_aggregate_join(' '));
    sumParam(html, result, '__tariff', /id=\"FirstName\" name=\"FirstName\" style=\"[^<]*\" type=\"text\" value=\"([\s\S]*?)\" \/>/ig, replaceTagsAndSpaces, html_entity_decode, create_aggregate_join(' '));
    sumParam(html, result, '__tariff', /id=\"MiddleName\" name=\"MiddleName\" style=\"[^<]*\" type=\"text\" value=\"([\s\S]*?)\" \/>/ig, replaceTagsAndSpaces, html_entity_decode, create_aggregate_join(' '));

    html = AnyBalance.requestPost(baseurl + 'news.html', {
    });

    //Дата последней новости
    sumParam (html, result, 'data_news', /<div class=\"date\">([^<]*)<\/div>/ig, replaceTagsAndSpaces, parseDate, aggregate_max);

    html = AnyBalance.requestPost(baseurl + 'actions.html', {
    });

    //Дата последней акции
    sumParam (html, result, 'data_action', /<div class=\"date\">([^<]*)<\/div>/ig, replaceTagsAndSpaces, parseDate, aggregate_max);
    
    html = AnyBalance.requestPost(baseurl + 'Members/Logoff', {
    });

    AnyBalance.setResult(result);

}

function skidka2balance(str){
    if(!isset(str))
        return;

    var skidka;

    if(str<=4200)
        skidka = 1;
    else if((str>4200)&&(str<=8500))
        skidka = 3;
    else if((str>8500)&&(str<=14450))
        skidka = 5;
    else if((str>14450)&&(str<=30000))
        skidka = 7;
    else //if(str>30000)
        skidka = 7;

    return skidka;
}

function skidka2balanceleft(str){
    if(!isset(str))
        return;

    var balance_left;

    if(str<=4200)
        balance_left = 4201 - str;
    else if((str>4200)&&(str<=8500))
        balance_left = 8501 - str;
    else if((str>8500)&&(str<=14450))
        balance_left = 14451 - str;
    else if((str>14450)&&(str<=30000))
        balance_left = 0;
    else //if(str>30000)
        balance_left = 0;

    return balance_left;
}