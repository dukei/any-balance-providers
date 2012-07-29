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
	
	card = $html.find('h2:contains("Пластиковые карты")').parent().parent().parent().next().html();
	$card = $('<table>'+card+'</table>');
	if (prefs.card){
		$card_num = $card.find('td.number:contains("XXXX'+prefs.card+'")');
	}else{
		$card_num = $card.find('td.number');
	}
	val = $card_num.text();
	if (val){
		var result = {success: true};
		result.__tariff = val;
	}else{
		throw new AnyBalance.Error('Проверьте правильность ввода последних 4-ех чисел вашей карты');
	}
    if(AnyBalance.isAvailable('balance')){
    	val = $card_num.next().text();
    	if (val)
    		val = val.replace(/[^0-9.,]+/,'');
        if(val)
            result.balance = parseFloat(val.replace(',','.'));
    }
    
    AnyBalance.setResult(result);
}