/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Телеинфо ВТБ24
Сайт оператора: https://telebank.vtb24.ru/
Личный кабинет: https://telebank.vtb24.ru/WebNew/
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://telebank.vtb24.ru/WebNew/';
	
	var html = AnyBalance.requestGet(baseurl+'Login.aspx');

	var $html = $(html);
	form_data = {
		__EVENTVALIDATION: $html.find('#__EVENTVALIDATION').val(),
		__VIEWSTATE: $html.find('#__VIEWSTATE').val(),
		js: 1,
		m: 1,
		__LASTFOCUS: '',
		__EVENTTARGET: '',
		__EVENTARGUMENT: '',
		Action: '',
		ButtonLogin: '',
		TextBoxName: prefs.login,
		TextBoxPassword: prefs.password
	}
	
    var html = AnyBalance.requestPost(baseurl+'Login.aspx', form_data);
    var $html = $(html);

    var val = $html.find('#LabelError').text();
    if (val){
    	throw new AnyBalance.Error($html.find('#LabelMessage').text());
    }

    var html = AnyBalance.requestGet(baseurl+'Accounts/Accounts.aspx');
    var $html = $(html);

    var result = {success: true};

    var $accounts = $html.find('table.accounts');

    var $card_tr;

    if (prefs.card){                        
	$card_tr = $accounts.find('tr:contains("XXXXXX'+prefs.card+'")');
    }else{
	$card_tr = $accounts.find('tr:contains("XXXXXX")');
    }

    AnyBalance.trace('Найдено карт: ' + $card_tr.size());
    if(!$card_tr.size())
        throw new AnyBalance.Error(prefs.card ? 'Не найдена карта с последними цифрами ' + prefs.card : 'Не найдено ни одной карты');

    var result = {success: true};
    $card_tr = $card_tr.first();
    result.__tariff = $card_tr.find('td.number').text();
    if(AnyBalance.isAvailable('cardnum'))
        result.cardnum = result.__tariff;

    if(AnyBalance.isAvailable('cardname')){
        result.cardname = $card_tr.find('td:nth-child(2)').text().replace(/&nbsp;/g, ' ').replace(/^\s+|\s+$/g, '');
    }

    if(AnyBalance.isAvailable('currency')){
        result.cardname = $card_tr.find('td:nth-child(5)').text().replace(/&nbsp;/g, ' ').replace(/^\s+|\s+$/g, '');
    }

    if(AnyBalance.isAvailable('balance')){
    	val = $card_tr.find('td:nth-child(4)').text();
    	if (val)
    		val = val.replace(/[^0-9.,]+/,'');
        if(val)
            result.balance = parseFloat(val.replace(',','.'));
    }
    
    AnyBalance.setResult(result);
}