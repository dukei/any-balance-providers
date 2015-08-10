/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Домашний Интернет и Телевидение Сахалинского провайдера КапиталПлюс
Сайт оператора: http://kapitalplus.net
Личный кабинет: http://stats.kapitalplus.net
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://stats.kapitalplus.net/api/?';
    
    AnyBalance.setDefaultCharset('utf-8');

    var pass = /^[0-9a-f]{32}$/i.test(prefs.password) ? prefs.password : hex_md5(prefs.password).toLowerCase(); //Пароль в md5
    
    var info = AnyBalance.requestGet(baseurl + "l="+prefs.login+'&p='+pass);
    
    var json;
    try{
        json = JSON.parse(info);
    }catch(e){
      throw new AnyBalance.Error("Неправильный ответ сервера. Проблемы на сайте?");
    }

    if(json.auth != 'ok')
      throw new AnyBalance.Error("Неправильный логин или пароль");
    
    var result = {success: true};

    if(AnyBalance.isAvailable('balance')){
      result.balance = Math.round(parseFloat(json.balance)*100)/100;
    }

    if(AnyBalance.isAvailable('account_id')){
      result.account_id = json.account_id;
    }

    result.__tariff = json.tariff_name;

    if(AnyBalance.isAvailable('traffic_ext')){
      result.traffic_ext = Math.round(json.traffic_external_downloaded/1000/1000);
    }

    if(AnyBalance.isAvailable('traffic_int')){
      result.traffic_int = Math.round(json.traffic_internal_downloaded/1000/1000*100)/100;
    }

    if(AnyBalance.isAvailable('abon')){
      result.abon = json.periodic_payment;
    }

    AnyBalance.setResult(result);
}

