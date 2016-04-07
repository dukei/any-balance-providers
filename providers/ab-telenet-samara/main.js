function main(){
  var base_url = "http://billing.telenettv.ru/utm5/";
  var prefs = AnyBalance.getPreferences();
  var orderNo = prefs.orderNo;
  var password = prefs.password;
  
  var content = AnyBalance.requestPost(base_url, {
         login:orderNo,
         password:password
  });
  
  var success = false, matches, balance;
  if(!content.match("Войти в личный кабинет")){
    if(matches = content.match(/<table class='utm-table'[\s\S]*?<\/table>/ig)){
      content = matches[0];
      if(matches = content.match(/<td[\s\S]*?<\/td>/gi)){
        var balanceIndex = -1;
        for(var i = 0; i < matches.length;i++){
          var td = matches[i];
          if(td.indexOf('>Баланс<') >=0){
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