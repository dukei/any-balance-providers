/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Автор: Andrey Belchikov <belchikovs@gmail.com>

Rynga IP-телефония
Сайт оператора: http://www.rynga.com
Личный кабинет: https://www.rynga.com/login

*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');    

    var baseurl = 'https://www.rynga.com/';
    
    var html = $(AnyBalance.requestGet(baseurl + "login"));
    
	var params = {
	'login[username]':prefs.login,
	'login[password]':prefs.password
    };
	var isValid = false;
	html.find("input[type='hidden']").each(function(){
		isValid = true;
		params[$(this).attr("name")] = $(this).val();
	});
	
	
    if(!isValid)
        throw new AnyBalance.Error("Изменился механизм доступа к rynga.com. Необходимо обновить провайдер Rynga.");

    
    
    var rawHTML = AnyBalance.requestPost(baseurl + "login", params);
	html = $(rawHTML);

    
	var error = html.find("div.row_error_message").text();
    if(error && error.length > 0)
        throw new AnyBalance.Error(error);
     
    var result = {
        success: true
    };

  	result.balance = parseFloat(html.find("span.balance").text().substr(2).trim());
	
	var days = html.find("span.freedays").text();
	result.freedays = parseInt(days.substr(0, days.length - 4).trim());
	

		
    AnyBalance.setResult(result);
}

