/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс для абонента East Telecom
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://debet.east.ru/cgi-bin/utm5/aaa5";
    AnyBalance.setDefaultCharset('utf-8'); 
    
    if(!prefs.login)
        throw new AnyBalance.Error("Пожалуйста, укажите логин для входа!");
    if(!prefs.password)
        throw new AnyBalance.Error("Пожалуйста, укажите пароль для входа!");

    var html = AnyBalance.requestPost(baseurl, {'login':prefs.login,'password':prefs.password,'cmd':'login'});
    
    if(/Ошибка.\s*Доступ запрещен/i.test(html)){
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неверный логин или пароль');
    }
    
    var result = {success: true},matches;
	
	getParam(html,result,'rub',/<TR>\s*<TD class="utm-table" align="right">Баланс основного счета<\/TD>\s*<TD class="utm-table" align="left">([^<]*?)<\/TD>\s*<\/TR>/im,replaceTagsAndSpaces, parseBalance);
	getParam(html,result,'credit',/<TR>\s*<TD class="utm-table" align="right">Кредит основного счета<\/TD>\s*<TD class="utm-table" align="left">([^<]*?)<\/TD>\s*<\/TR>/im,replaceTagsAndSpaces, parseBalance);
	getParam(html,result,'uid',/<TR>\s*<TD class="utm-table" align="right">ID<\/TD>\s*<TD class="utm-table" align="left">([^<]*?)<\/TD>\s*<\/TR>/im,replaceTagsAndSpaces, null);
	getParam(html,result,'fio',/<TR>\s*<TD class="utm-table" align="right">Полное имя<\/TD>\s*<TD class="utm-table" align="left">([^<]*?)<\/TD>\s*<\/TR>/im,replaceTagsAndSpaces, null);
	getParam(html,result,'login',/<TR>\s*<TD class="utm-table" align="right">Логин<\/TD>\s*<TD class="utm-table" align="left">([^<]*?)<\/TD>\s*<\/TR>/im,replaceTagsAndSpaces, null);
	getParam(html,result,'state',/<TR>\s*<TD class="utm-table" align="right">Статус Интернета<\/TD>\s*<TD class="utm-table" align="left">([^<]*?)<\/TD>\s*<\/TR>/im,replaceTagsAndSpaces, null);
    
    AnyBalance.setResult(result);
}
