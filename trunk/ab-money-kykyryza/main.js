/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Куруза
Сайт оператора: http://kykyryza.ru
Личный кабинет: https://oplata.kykyryza.ru/personal/main
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://oplata.kykyryza.ru/personal/';
	
	var html = AnyBalance.requestGet(baseurl);
    var matches = html.match(/<h1>(ТЕХНИЧЕСКИЕ РАБОТЫ)<\/h1>/i);
    if(matches){
    	throw new AnyBalance.Error(matches[1].replace(/^\s*|\s*$/g, ''));
    }
	
    var html = AnyBalance.requestPost(baseurl + "pub/Login?wicket:interface=:2:frmLogin::IFormSubmitListener::", {
    	id9_hf_0: '',
    	login: prefs.login,
    	password: prefs.password
    });
    var $html = $(html);

    var val = $html.find('span.feedbackPanelERROR').text();
    if (val){
    	throw new AnyBalance.Error(val);
    }

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