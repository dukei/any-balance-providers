/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

"Курская телефонная компания" - Интернет (kurskonline)
Сайт оператора: http://www.r46.ru/
Личный кабинет: http://test.kabinet.r46.ru/login?next=/
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://test.kabinet.r46.ru/';
	var result = {success: true};
    
    AnyBalance.setDefaultCharset('utf-8');

	if(AnyBalance.isAvailable('balance', 'agreement')){
    
		// Заходим на главную страницу
		var info = AnyBalance.requestPost(baseurl + "login?next=/", {
			login: prefs.login,
			pass: prefs.password
		});
		var $parse = $('<div>' + info + '</div>');
		var sidebar = $parse.find("#sidebar");
		if(!sidebar){
			throw new AnyBalance.Error("Имя пользователя или пароль не верны");
		}
		var ths = sidebar.find("th");
		for(var i=0; i< ths.length; i++)
		{
			var th = $(ths[i]);
			var text = th.text();
			if(text  == "№ договора: ")
			{
				result.agreement = parseFloat(th.next().text());
			}
			else if(text == "Баланс: ")
			{
				var b = th.next().text();
				b = b.substr(0, b.length - 3).trim();
				result.balance = parseFloat(b);
			}
		}
		
	}

    
    
    

    AnyBalance.setResult(result);
}

