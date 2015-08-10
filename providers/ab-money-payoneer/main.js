/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:23.0) Gecko/20100101 Firefox/23.0',
	'Accept':'*/*',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
	//'Accept-Encoding':'gzip, deflate', // Сайт отвечает ошибкой 403 при успешной авторизации, и поэтому надо убрать gzip
	'Accept-Encoding':null,
	'Content-Type':'application/json; charset=utf-8',
	'X-Requested-With':'XMLHttpRequest',
	'Connection':'keep-alive',
	'Pragma':'no-cache',
	'Cache-Control':'no-cache',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://myaccount.payoneer.com/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
	var html = AnyBalance.requestGet(baseurl + 'login/login.aspx', g_headers); 
    html = AnyBalance.requestPost(baseurl + 'Login/Login.aspx/WmLogin', '{"username":"'+prefs.login+'","password":"'+prefs.password+'","captchaText":"","year":"","month":"","day":"","id":"","cardHolderIdOrg":"; __utma=","PayoneerInternalId":"","userPrefs":""}', addHeaders({Referer: baseurl + 'login/login.aspx'})); 
	html = AnyBalance.requestGet(baseurl + 'MainPage/PromoPage.aspx', g_headers); 
	
    if(!/SetAccount.aspx\?ac=0/i.test(html)){
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
    var result = {success: true};
    getParam(html, result, '__tariff', /id="ctl00_ddlAccounts"[\s\S]*?>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Баланс Карты:[\s\S]*?"TextFieldText">([\s\S]*?)<\//i, null, parseBalance);
	
    AnyBalance.setResult(result);
}