/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function parseTrafficTotalGb(str){
     var traffics = str.split(/\//g);
     var total;
     for(var i=0; i<traffics.length; ++i){
         var val = parseBalance(traffics[i]);
         if(typeof(val) != 'undefined')
             total = (total || 0) + val;
     }
     
     total = total && parseFloat((total/1024).toFixed(2));
     AnyBalance.trace('Parsed total traffic ' + total + ' Gb from ' + str);
     return total;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://lk.ugmk-telecom.ru/";

    var html = AnyBalance.requestPost(baseurl + '?login=yes', {
		backurl:'/',
		Login:'Войти',
        USER_LOGIN:prefs.login,
        USER_PASSWORD:prefs.password
    });

    if (!/logout=yes/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};
    
	getParam(html, result, 'balance', /На счете:(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Текущий тариф:(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}
