/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сотового оператора Tele2se (Comviq. Sweden).

*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && !AnyBalance.isAvailable (param))
		return;

	var value = regexp.exec (html);
	if (value) {
		value = value[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
    else
      return value
	}
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function main(){
    if(AnyBalance.getLevel() < 3)
      throw new AnyBalance.Error("Этот провайдер требует AnyBalance API v.3+. Пожалуйста, обновите AnyBalance до последней версии.");
  
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://www.comviq.se/";
    AnyBalance.setDefaultCharset('utf-8');
    var result = {success: true};
	
 var params = {
	emailOrPhnNrOrMSISDN: prefs.login,
	password: prefs.password,
	test: false,
	simulateMigrate:false
    };
 
	if (!prefs.login | !prefs.password) 
		throw new AnyBalance.Error('Имя пользователя или пароль не должны быть пусты')


    html = AnyBalance.requestPost(baseurl + "WebServices/Account.asmx/LoginOrMigrate", JSON.stringify(params), {
	"Accept": "application/json, text/javascript, */*; q=0.01",
	"Content-Type": "application/json; charset=UTF-8",
	"Referer": "https://www.comviq.se/Login.aspx",
	"X-Requested-With": "XMLHttpRequest"});
    		
    var result = {success: true}; //Баланс нельзя не получить, не выдав ошибку!
    json = JSON.parse(html);

	if (!json.d.LoggedIn) {
		throw new AnyBalance.Error(json.d.Message)
	}
    html = AnyBalance.requestGet(baseurl + "mitt-konto_autotanka.aspx");
    result.__tariff = getParam(html, null, null, /Prisplan: (.*)</i, replaceTagsAndSpaces);
    if(AnyBalance.isAvailable('saldo'))
    result.saldo = getParam(html, null, null, /<div class="value">(.*)</i, replaceFloat);
    if(AnyBalance.isAvailable('giltigt'))
    result.giltigt = getParam(html, null, null, /Giltig till:\s*(.*)</i, replaceTagsAndSpaces);
    if(AnyBalance.isAvailable('mobilsurf'))
    result.mobilsurf = getParam(html, null, null, /<td class="middle">(.*)\sMB/i, replaceFloat);
    if(AnyBalance.isAvailable('kortstatus'))
    result.kortstatus = getParam(html, null, null, /Kortstatus<\/label><div id="myAccountCardStatus" class="value">(.*)</i, replaceTagsAndSpaces);
					
    AnyBalance.setResult(result);
}