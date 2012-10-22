/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Куруза
Сайт оператора: http://kykyryza.ru
Личный кабинет: https://oplata.kykyryza.ru/personal/main
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://oplata.kykyryza.ru/personal/';
	
	var html = AnyBalance.requestGet(baseurl + 'pub/Entrance');
    var matches = html.match(/<h1>(ТЕХНИЧЕСКИЕ РАБОТЫ)<\/h1>/i);
    if(matches){
    	throw new AnyBalance.Error(matches[1].replace(/^\s*|\s*$/g, ''));
    }
//Первый шаг авторизации. Проверка номера карты	
    var html = AnyBalance.requestPost(baseurl + "?wicket:interface=:0:loginForm::IBehaviorListener:0:1", {
    	id7_hf_0: '',
    	ean: prefs.login,
    	password: ''
    });
    AnyBalance.trace(html);
    obj = $.parseJSON(html);
    
    if (!obj || !obj.validated || obj.cardActive == false){
    	
    	if (obj.form && obj.form.errorMessage)
    		throw new AnyBalance.Error(obj.form.errorMessage);
    	else if (obj.fields && obj.fields[0] && obj.fields[0].errorMessage)
    		throw new AnyBalance.Error(obj.fields[0].errorMessage);
    	else
    		throw new AnyBalance.Error("Ошибка авторизации. Проверьте правильность ввода номера карты");
    }
    
//Второй шаг авторизации. Проверка пароля	
    
    var html = AnyBalance.requestPost(baseurl + "?wicket:interface=:0:loginForm::IBehaviorListener:0:1", {
    	id7_hf_0: '',
    	ean: prefs.login,
    	password: prefs.password
    });
    
    AnyBalance.trace(html);
    obj = $.parseJSON(html);
    if (obj.form && obj.form.redirectUrl)
    	url = obj.form.redirectUrl;
    else
		throw new AnyBalance.Error("Ошибка авторизации. Проверьте правильность ввода пароля");
    
//Получение балансов    
    AnyBalance.trace(url);	
    
    var html = AnyBalance.requestGet(url);
    
    //AnyBalance.trace(html);
    var $html = $(html);

    var result = {success: true};

    $binfo = $html.find('.b-user-info__table').find('tr');
    
    if(AnyBalance.isAvailable('balance')){
//    	var val = $html.find('.user-balance-value').text();
    	var val = $binfo.find('th:contains("Баланс")').next().find('.b-user-info__balance').text();
    	
    	if (val)
    		val = val.replace(/[^0-9.,]+/,'');
        if(val)
            result.balance = parseFloat(val.replace(',','.'));
    }
    if(AnyBalance.isAvailable('bonus')){
//    	var val = $html.find('.user-balance-bonuspoints').text();
    	var val = $binfo.next().find('.b-user-info__balance').text();
    	if (val)
    		val = val.replace(/[^0-9.,]+/,'');
    	
        if(val)
            result.bonus = parseFloat(val.replace(',','.'));
    }  
    AnyBalance.setResult(result);
}