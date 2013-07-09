/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс для абонента East Telecom
*/

function getValue(result, info, namein, nameout){
	
    if ( AnyBalance.isAvailable(nameout) ) {

		var matches, regexp = new RegExp('[\s\S]*?<TR>[\n ]*?<TD class="utm-table" align="right">'+namein+'<\/TD>[\n ]*?<TD class="utm-table" align="left">([^<]*?)<\/TD>[\n ]*?<\/TR>[\s\S]*?', 'im');
				
        if(matches = info.match(regexp)){
			result[nameout] = matches[1];
        }
	}
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://debet.east.ru/cgi-bin/utm5/aaa5";
    AnyBalance.setDefaultCharset('utf-8'); 
    
    if(!prefs.login)
        throw new AnyBalance.Error("Пожалуйста, укажите логин для входа!");
    if(!prefs.password)
        throw new AnyBalance.Error("Пожалуйста, укажите пароль для входа!");

    var html = AnyBalance.requestPost(baseurl, {'login':prefs.login,'password':prefs.password,'cmd':'login'});
    
    if(/Ошибка. Доступ запрещен/i.test(html)){
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неверный логин или пароль');
    }
    
    var result = {success: true},matches;
		
	getValue(result,html,'Баланс основного счета','rub');
	getValue(result,html,'ID','uid');
	getValue(result,html,'Полное имя','fio');
	getValue(result,html,'Логин','login');
	getValue(result,html,'Статус Интернета','state');
	getValue(result,html,'Кредит основного счета','credit');	
    
    AnyBalance.setResult(result);
}
