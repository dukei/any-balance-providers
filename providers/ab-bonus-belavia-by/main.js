/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
'Connection':'keep-alive',
'Origin':'https://belavia.by',
'Content-Type':'application/x-www-form-urlencoded',
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
};

function main(){
    var prefs = AnyBalance.getPreferences();
	
    AB.checkEmpty(prefs.login, 'Номер участника!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');
	
    AnyBalance.setDefaultCharset('utf-8');
    var baseurl = "https://belavia.by/";
    var html = AnyBalance.requestGet(baseurl,g_headers);
    var html = AnyBalance.requestPost(baseurl + 'leader/login/?path=%2F',{
        MemberId: prefs.login,
        Password: prefs.password,
        RememberMe: true
        },g_headers);
    var html = AnyBalance.requestGet(baseurl + 'leader/balance/',g_headers);
	var result = {success: true};

    if	(!/leader\/logout/.test(html)){
    	throw new AnyBalance.Error('Не удалось войти на сайт',false,true);
    }
    getParam(html,result,'__tariff',/<span class="dt">Уровень:[\s\S]*?<div[^>]*?>([\s\S]*?)<\/div>/,replaceTagsAndSpaces)
    getParam(html,result,'balance',/<span class="dt">Баланс:[\s\S]*?<div[^>]*?>([\s\S]*?)<\/div>/,replaceTagsAndSpaces,parseBalance)
    getParam(html,result,'ball',/<span class="dt">Квалификационные баллы:[\s\S]*?<div[^>]*?>([\s\S]*?)<\/div>/,replaceTagsAndSpaces,parseBalance)
    getParam(html,result,'segments',/<span class="dt">Количество сегментов:[\s\S]*?<div[^>]*?>([\s\S]*?)<\/div>/,replaceTagsAndSpaces,parseBalance)
    getParam(html,result,'forNext',/<span class="dt">До следующего уровня([\s\S]*?<div[^>]*?>[\s\S]*?)<\/div>/,replaceTagsAndSpaces)
    result.card=prefs.login.replace(/(\d{4})(\d{4})(\d*)/,'$1-$2-$3')
    AnyBalance.setResult(result);
}