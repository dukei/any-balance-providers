/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс, статистика заказов и выплат партнёрской программы PowerPartners.ru

Сайт партнерской программы: http://powerpartners.ru/
API статистики: http://powerpartners.ru/api/balance.php
*/

function main(){

  var prefs = AnyBalance.getPreferences();

  if (!prefs.email)
    throw new AnyBalance.Error('Вы не указали адрес эл.почты');
  if (!prefs.password)
    throw new AnyBalance.Error('Вы не указали пароль');

  AnyBalance.setDefaultCharset('utf-8');

  var res = AnyBalance.requestPost('http://powerpartners.ru/api/balance.php', {
    email:  prefs.email,
    pswd:   prefs.password,
    format: "json"
  });
  
  try {
    var info = JSON.parse(res);
  } catch(e) {
    AnyBalance.trace('JSON parse error (' + e.message + '): ' + res);
    throw new AnyBalance.Error('Проблемы на стороне сайта: неверный формат статистики');
  }

  if ((!isset(info.result)) || (info.result == -1)) {
    AnyBalance.trace('Internal server error');
    throw new AnyBalance.Error('Внутренние проблемы сервера статистики');
  }

  if (info.result == 0) {
    AnyBalance.trace('Invalid email or password');
    throw new AnyBalance.Error('Неверные e-mail или пароль');
  }
 
  var result = {success: true, __tariff: prefs.email};
  
  if (AnyBalance.isAvailable('balance'))
    result.balance = info.balance;
  if (AnyBalance.isAvailable('orders'))
    result.orders = info.orders;
  if (AnyBalance.isAvailable('current_orders_amount'))
    result.current_orders_amount = info.current_orders_amount;
  if (AnyBalance.isAvailable('current_orders_count'))
    result.current_orders_count = info.current_orders_count;
  if (AnyBalance.isAvailable('last_payment_amount'))
    result.last_payment_amount = info.last_payment_amount;
  if (AnyBalance.isAvailable('last_payment_date'))
    result.last_payment_date = info.last_payment_date;

  AnyBalance.setResult(result);
}

function isset(v){
    return typeof(v) != 'undefined';
}
