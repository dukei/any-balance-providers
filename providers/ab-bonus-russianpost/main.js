/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

*/

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.russianpost.ru/loyalty/';
	var html = AnyBalance.requestGet(baseurl + 'Login.aspx');
	
	var html = AnyBalance.requestPost(baseurl + 'Login.aspx',{
		'__EVENTTARGET':'',
		'__EVENTARGUMENT':'',
		'__VIEWSTATE':$(html).find('#__VIEWSTATE').val(),
		'__EVENTVALIDATION':$(html).find('#__EVENTVALIDATION').val(),
		'_ctl0:c_mainContent:TextBoxLogin':prefs.login,
		'_ctl0:c_mainContent:TextBoxPassword':prefs.password,
		'_ctl0:c_mainContent:ButtonSubmit':'Вход'
	}
	);
	var html=AnyBalance.requestGet('http://www.russianpost.ru/loyalty/Default.aspx');
	
	var matches = html.match(/Сервис временно не доступен/i);
    if(matches){
    	throw new AnyBalance.Error('Сервис временно не доступен. Информацию о начисленных баллах Вы можете получить по телефону Горячей линии 8-800-444-33-33.');
    }
    //AnyBalance.trace(html);
    var $html = $(html);
    var result = {success: true};
	
    if(AnyBalance.isAvailable('balance')){
    	var val = $html.find('#cartInformer_lblFullAmount').text();
        AnyBalance.trace("Баланс: " + val);
    	if (val)
    		val = val.replace(/[^0-9.,]+/,'');
        if(val)
            result.balance = parseFloat(val.replace(',','.'));
    }
	
    AnyBalance.setResult(result);
}