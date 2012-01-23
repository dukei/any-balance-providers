function main(){
  var prefs = AnyBalance.getPreferences();
  var pass = prefs.pass;
  var login = prefs.login;
  var info = AnyBalance.requestGet('https://stat.volia.com:8443/ktvinet/vapi/jstat.jsp?code=' + login + '&pass=' + pass);
  var result = {success: true};
  var v = $.parseJSON(info);
  var resst = v.responseStatus.responseValue;
  if (resst == 'ok'){
    result["balance"] = v.services[0].saldo;
    result["traffic"] = (v.traffic[0].rows[2].underTraffic / 1073741824).toFixed(1);
    AnyBalance.setResult(result);
  }
}