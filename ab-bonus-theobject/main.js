function main(){
var prefs = AnyBalance.getPreferences();

var str = AnyBalance.requestPost('http://theobject.ru/my/user/auth', {
    email: prefs.login,
    password: prefs.password
  });
var obj = jQuery.parseJSON(str);  
if(obj.success)
 AnyBalance.setResult({success: true, bonus: obj.bonus, balance: obj.balance, "__tariff": obj.level}); 
else
 AnyBalance.setResult({error: true, message: "Не удалось получить данные с сайта"}); 
}