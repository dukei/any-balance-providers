function main(){
var prefs = AnyBalance.getPreferences();

var str = AnyBalance.requestPost('https://secure.onetwotrip.com/_api/visitormanager/auth/', {
    email: prefs.login,
    pwd: prefs.password,
    rememberMe: false
  });
var obj = jQuery.parseJSON(str);  
if(obj.auth)
 AnyBalance.setResult({success: true, "ott-bonus": obj.bonus.total,"ott-curr": obj.bonus.currency}); 
else
 AnyBalance.setResult({error: true, message: "Не удалось получить данные с сайта"}); 
}