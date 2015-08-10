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

    checkEmpty(prefs.login, 'Введите номер карты');
    checkEmpty(prefs.type, 'Выберите тип карты');

    AnyBalance.trace('Пароль не введен - получаем данные по номеру карты');

    var baseurl = "http://www.sportmaster.ua/";
    var types = {
        '600': 'Синяя карта',
        '601': 'Серебряная карта',
        '602': 'Золотая карта',
    };
    var json;

    var img = AnyBalance.requestGet(baseurl + "/kcaptcha/?" + Math.random());
    var code = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', img);
    
    for(var type in types){
        if(types[prefs.type] && type != prefs.type)
            continue; //Если у нас задан тип, то получаем сразу его

        var html = AnyBalance.requestPost(baseurl + '?module=clubpro&action=checkByCard', {
            card_number:prefs.login,
            card_type:type,
            captcha_text:code
        }, g_headers);
		
		json = getJson(html);

		if(!json.error)
            break;
    }

    if(json.message){
        throw new AnyBalance.Error(json.message);
    }
	
    var result = {success: true};
    
    result.__tariff = types[type];
    if(AnyBalance.isAvailable('cardnum'))
        result.cardnum = prefs.login;
		
    getParam(json.data.client_level.CurLevelSumma, result, 'balance', null, null, parseBalance);
    for(var i=0; i<json.data.bonus_amount_list.BonusAmount.length; ++i){
        var ba = json.data.bonus_amount_list.BonusAmount[i];
    	if(ba.BonusType == 3){
    		sumParam(ba.Amount, result, 'bonus3', null, null, null, aggregate_sum);
    		sumParam(ba.DatEnd, result, 'bonus3till', null, null, parseDateISO, aggregate_min);
    	}else{
    		AnyBalance.trace('Unknown bonus type: ' + JSON.stringify(ba));
    	}
    }

    AnyBalance.setResult(result);
}
