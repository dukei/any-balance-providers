function main(){
  var base_url = "http://lk.telenettv.ru/webexecuter?action=GetBalance&mid=0&module=contract";
  var prefs = AnyBalance.getPreferences();
  var orderNo = prefs.orderNo;
  var password = prefs.password;
  
  var content = AnyBalance.requestPost(base_url, {
         user:orderNo,
         pswd:password
  });
  
  var success = false, matches, balance;
  if(!content.match("ОШИБКА: Договор не найден")){

    if(matches = content.match(/<table class="table tableWidth tableFont balanceList"[\s\S]*?<\/table>/ig)){
      content = matches[0];
      if(matches = content.match(/<td[\s\S]*?<\/td>/gi)){
        var balanceIndex = -1;
        for(var i = 0; i < matches.length;i++){
          var td = matches[i];
          if(td.indexOf('>Исходящий остаток на конец месяца<') >=0){
            balanceIndex = i;
            break;
          }
        }
        if(balanceIndex >= 0){
          var balanceValTd = matches[balanceIndex+1];
          balance = balanceValTd.match(/>[\s\S]*?</)[0];
          balance = balance.replace(">","").replace("<","");
          success = true;
        }
      }
      
    }
  }
  AnyBalance.setResult({success: success, balance: balance});
}