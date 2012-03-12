/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Домашний Интернет и Телевидение Акадо
Сайт оператора: http://www.akado.ru/
Личный кабинет: https://office.akado.ru/login.xml
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://office.akado.ru/';
    
    AnyBalance.setDefaultCharset('utf-8');
    
    // Заходим на главную страницу
    var info = AnyBalance.requestPost(baseurl + "login.xml/login", {
        login: prefs.login,
        password: prefs.password
    });

    
    var error = $('<div>' + info + '</div>').find('response>message').text();
    if(error) //Что-то неправильно произошло. Скорее всего, пароль неправильный
      throw new AnyBalance.Error(error);
    
    var result = {success: true};
    
    if(AnyBalance.isAvailable('balance', 'agreement', 'username')){
      var status = AnyBalance.requestGet(baseurl + "status.xml");
      var $parse = $('<div>' + status + '</div>');
      
      if(AnyBalance.isAvailable('balance')){
        var balance = $parse.find('#account-balance-value').text();
        if(balance)
          result.balance = parseFloat(balance);
      }
      
      if(AnyBalance.isAvailable('username')){
        var value = $parse.find('#account-fullname').text();
        if(value)
          result.username = value;
      }
      
      if(AnyBalance.isAvailable('agreement')){
        var value = $parse.find('#account-ID').text();
        if(value)
          result.agreement = value;
      }
    }
    
    if(AnyBalance.isAvailable('payhint')){
      var account = AnyBalance.requestGet(baseurl + "account.xml");
      var $parse = $(account);
      
      var value = $parse.find("span.description:contains('Рекомендуемая сумма оплаты услуг в следующем месяце')").parent().find("span.amount").text();
      if(value){
        var res = /([\d+\.,]+)/.exec(value);
        if(res){
          result.payhint = parseFloat(res[1]);
        }
      }
    }
    
    var services = AnyBalance.requestGet(baseurl + "services.xml");
    var $parse = $($.parseXML(services));
    var servid = $parse.find("tr:contains('УСЛУГИ ИНТЕРНЕТ')").first().attr('data-id');

    services = AnyBalance.requestGet(baseurl + "services.xml?ID="+servid+"&depth=1");
    $parse = $($.parseXML(services));
    var tariff = $parse.find('th a').first().text();
    if(tariff){
      var res = /\(\s*(.*?)\s*[,\)]/.exec(tariff);
      if(res)
        tariff = res[1];
      result.__tariff = tariff;
    }

    var value = $parse.find("span.description:contains('Рекомендуемая сумма оплаты услуг в следующем месяце')").parent().find("span.amount").text();
    if(value){
      var res = /([\d+\.,]+)/.exec(value);
      if(res){
        result.payhint = parseFloat(res[1]);
      }
    }
    

    AnyBalance.setResult(result);
}

