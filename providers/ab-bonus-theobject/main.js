function main(){
var prefs = AnyBalance.getPreferences();
var url = 'http://theobject.ru/my/';

var str = AnyBalance.requestPost(url+'user/auth', {
    email: prefs.login,
    password: prefs.password
  });
var obj = jQuery.parseJSON(str);  
if(obj.success) {
 var result = {success: true, bonus: obj.bonus, balance: obj.balance, "__tariff": obj.level};
 if(AnyBalance.isAvailable('shoots')) {
  var html = AnyBalance.requestGet(url);   
  getParam (html, result, 'shoots', /Общий настрел:[\s\S]*?<td[^>]*><strong>([\s\S]*?)<\/strong><\/td>/i, replaceTagsAndSpaces, parseBalance);
 }
 AnyBalance.setResult(result); 
} 
else
 AnyBalance.setResult({error: true, message: "Не удалось получить данные с сайта"}); 
}