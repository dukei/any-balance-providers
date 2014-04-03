function main(){
var urlPrefix='https://ibp.2tbank.ru/lite/app/';
var prefs = AnyBalance.getPreferences();

checkEmpty(prefs.login, 'Введите ваш персональный клиентский номер!');
checkEmpty(prefs.password, 'Введите ваш пароль для входа в интернет банк!');
checkEmpty(prefs.account, 'Введите номер счета или вклада!');

    var html = AnyBalance.requestGet(urlPrefix+'pub/Login');
    var sid = getParam(html, null, null, /<form[^>]+action=".*?x=([^"]*)/i, null, html_entity_decode);
    var hasData = getParam(html, null, null, /<input[^>]+name="hasData"[^>]*value="([^"]*)/i, null, html_entity_decode);
    if(!hasData || !sid)
        throw new AnyBalance.Error('Не найдена форма входа! Сайт изменен?');

    html = AnyBalance.requestPost(urlPrefix+'pub/Login?x='+sid, {
    "login": prefs.login,
    "password": prefs.password,
    "hasData": hasData,
    ":submit": "x"
});
if(html != null && RegExp("<title>Главная\\sстраница<\\/title>","i").test(html) ) {
// var cookie = AnyBalance.getCookie('JSESSIONID');
 var params = {"1": {url: 'priv/accounts', func: fetchAcc},
               "2": {url: 'priv/deposits', func: fetchDep}};
 html = AnyBalance.requestPost(urlPrefix+params[prefs.type].url);
 if(html) {
  AnyBalance.setResult(params[prefs.type].func($(html)));
 }
 else
  AnyBalance.setResult({error: true, message: "Не удалось получить данные из интернет-банка"}); 
} 
else
 AnyBalance.setResult({error: true, message: "Не удалось войти в интернет-банк. Проверьте логин и пароль."}); 
}
function fetchAcc(pageHtml){
 var result = {};
 var prefs = AnyBalance.getPreferences();
 var rows = pageHtml.find("div.account-block > div");
 if(rows.length == 0)
  return {error: true, message: "Не найдена таблица со счетами. Сайт изменился?"};
 AnyBalance.trace("Rows: "+rows);
 for(var i = 0; i<rows.length; i++) {
  var row = $(rows[i]);
  var accStr = row.find("span.accountToggleNumber > a").html();
  AnyBalance.trace("accStr: "+accStr);
  var accRe = /(\d{5}$)/ig;
  var accNo = accRe.exec(accStr);
  if(!accNo || accNo[1] != prefs.account )
   continue;
  AnyBalance.trace("accNo: "+JSON.stringify(accNo));
  if(AnyBalance.isAvailable("t-sum")) {
    var amount = row.find("div.account-amount-info > span.amount > span.value > nobr").html();
    result.t_sum=amount.replace("-",".");
  }
 }
 if(Object.getOwnPropertyNames(result).length === 0)
  result = {error: true, message: "Не удалось найти счет"};
 else
  result["success"] = true;
 return result;
}
function fetchDep(pageHtml){
 var result = {};
 var prefs = AnyBalance.getPreferences();
 var rows = pageHtml.find("tbody > tr");
 if(rows.length == 0)
  return {error: true, message: "Не найдена таблица с вкладами. Сайт изменился?"};
 for(var i = 0; i<rows.length;i++) {
  var cells = $(rows[i]).find("td");
  if(cells.length){
   var accStr = $(cells[0]).find("a.deposit-link span").html();
   var accRe = /\/(\d{5})$/ig;
   var accNo = accRe.exec(accStr);
   if(!accNo || (accNo[1] != prefs.account))
    continue;
   if(AnyBalance.isAvailable("t-sum"))
    result.t_sum=$(cells[3]).html().replace("-",".");
   if(AnyBalance.isAvailable("t-percent-sum"))
    result.t_percent_sum=$(cells[4]).html().replace("-",".");
   if(AnyBalance.isAvailable("t-percent"))
    result.t_percent=$(cells[2]).html().replace("%","");
   if(AnyBalance.isAvailable("t-percent-date"))
    result.t_percent_date=parseDate($(cells[5]).html());
  }
 }
 if(Object.getOwnPropertyNames(result).length === 0)
  result = {error: true, message: "Не удалось найти вклад"};
 else
  result["success"] = true;
 return result;
}