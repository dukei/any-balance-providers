/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

ЕРЦ Мегабанк
Сайт: https://erc.megabank.net/
*/

function htmlDecode(input){
  var e = document.createElement('div');
  e.innerHTML = input;
  return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
}

//------------------------------------------------------------------------------

function main(){
  AnyBalance.setDefaultCharset('utf-8');
  var prefs = AnyBalance.getPreferences();
  var baseurl = 'https://erc.megabank.net/';
  var headers = {
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1',
    Connection: 'keep-alive'
  };

  AnyBalance.trace('Connecting to ' + baseurl);
  var html = AnyBalance.requestGet(baseurl, headers);

  AnyBalance.trace('Searching form_build_id');
  var form_build_id = /id="user-login-form"[\s\S]*?<input type="hidden" name="form_build_id"[\s\S]*?value="([\s\S]*?)"/.exec(html);

  if(form_build_id) {
    AnyBalance.trace('form_build_id = ' + form_build_id[1]);
    AnyBalance.trace('Login');
    var html = AnyBalance.requestPost(baseurl + 'ru/node?destination=front_page', {
      form_build_id: form_build_id[1],
      form_id: "user_login_block",
      name: prefs.login,
      pass: prefs.password
    }, headers);
    var matches = html.match(/<div class="messages error">\n([\s\S]*?) <a/i);
    if(matches){
      throw new AnyBalance.Error(matches[1]);
    }
    AnyBalance.trace('Successfully login');
  } else {
    AnyBalance.trace('Already logged?');
  }

  AnyBalance.trace('Connecting to ' + baseurl + 'ru/cabinet/publicutilities');
  var html = AnyBalance.requestGet(baseurl + 'ru/cabinet/publicutilities', headers);

  AnyBalance.trace('Searching account_url');
  if(prefs.account){
    var account_url = (new RegExp('<div class="magic_content">[\\s\\S]*<a href=([\\s\\S]*?)>' + prefs.account)).exec(html);
    if(!account_url) throw new AnyBalance.Error("Не удаётся найти account_url. Проблемы или изменения на сайте?");
    account_url = account_url[1];
  } else var account_url = 'https://erc.megabank.net/ru/cabinet/publicutilities/debt&rr=1'
  AnyBalance.trace('account_url = ' + account_url);

  AnyBalance.trace('Connecting to ' + account_url);
  var html = AnyBalance.requestGet(account_url, headers);
  
  AnyBalance.trace('Searching account_N');
  var account_N  = /(\d)$/.exec(account_url);
  if(!account_N) throw new AnyBalance.Error("Не удаётся найти account_N. Проблемы или изменения на сайте?");
  AnyBalance.trace('account_N = ' + account_N[1]);

  AnyBalance.trace('Searching month_option');
  var month_option = /<select id="kan_monthlist" size=1 onchange="get_views_next\(\)"><option value="(\d{6})"/.exec(html);
  if(!month_option) throw new AnyBalance.Error("Не удаётся найти month_option. Проблемы или изменения на сайте?");
  AnyBalance.trace('month_option = ' + month_option[1]);

  AnyBalance.trace('Getting table');
  var html_table = AnyBalance.requestPost(baseurl + 'ru/kan-type/load', {
    rr: account_N[1],
    month: month_option[1]
  }, headers);

  AnyBalance.trace('Reading table');
  var result = {success: true};

  // Лицевой счет
  getParam(html, result, 'account', /<DIV class="maintextercviewsmall">Лицевой счет[\s\S]*?class=maintextercview>(.*?)</, replaceTagsAndSpaces, false);

  // Адрес
  getParam(html, result, 'address', /<DIV class="maintextercviewsmall">адрес[\s\S]*?class=maintextercview>([\s\S]*?)</, replaceTagsAndSpaces, htmlDecode);

  // Ф.И.О.
  getParam(html, result, 'name', /<DIV class="maintextercviewsmall">ф.и.о.[\s\S]*?class=maintextercview>(.*?)</, replaceTagsAndSpaces, htmlDecode);

  // Месяц
  getParam(html_table, result, 'month', /Справка о результатах взаиморасчетов по коммунальным услугам за (.*?)</, replaceTagsAndSpaces, false);
  
  // Квартплата
  if(AnyBalance.isAvailable('rent', 'debt')){
    //AnyBalance.trace('rent');
    var debt_tmp=getParam(html_table, result, false, /&#1050;&#1042;&#1040;&#1056;&#1058;&#1055;&#1051;&#1040;&#1058;&#1040;(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
    var paid1_tmp=getParam(html_table, result, false, /&#1050;&#1042;&#1040;&#1056;&#1058;&#1055;&#1051;&#1040;&#1058;&#1040;(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
    var paid2_tmp=getParam(html_table, result, false, /&#1050;&#1042;&#1040;&#1056;&#1058;&#1055;&#1051;&#1040;&#1058;&#1040;(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
    result.rent = Math.round((debt_tmp - paid1_tmp - paid2_tmp)*100)/100;
  }

  // Отопление
  if(AnyBalance.isAvailable('heating', 'debt')){
    //AnyBalance.trace('heating');
    var debt_tmp=getParam(html_table, result, false, /&#1054;&#1058;&#1054;&#1055;&#1051;&#1045;&#1053;&#1048;&#1045;(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
    var paid1_tmp=getParam(html_table, result, false, /&#1054;&#1058;&#1054;&#1055;&#1051;&#1045;&#1053;&#1048;&#1045;(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
    var paid2_tmp=getParam(html_table, result, false, /&#1054;&#1058;&#1054;&#1055;&#1051;&#1045;&#1053;&#1048;&#1045;(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
    result.heating = Math.round((debt_tmp - paid1_tmp - paid2_tmp)*100)/100;
  }

  // Горячая вода
  if(AnyBalance.isAvailable('hot_water', 'debt')){
    //AnyBalance.trace('hot_water');
    var debt_tmp=getParam(html_table, result, false, /&#1043;&#1054;&#1056;&#1071;&#1063;&#1040;&#1071; &#1042;&#1054;&#1044;&#1040;(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
    var paid1_tmp=getParam(html_table, result, false, /&#1043;&#1054;&#1056;&#1071;&#1063;&#1040;&#1071; &#1042;&#1054;&#1044;&#1040;(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
    var paid2_tmp=getParam(html_table, result, false, /&#1043;&#1054;&#1056;&#1071;&#1063;&#1040;&#1071; &#1042;&#1054;&#1044;&#1040;(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
    result.hot_water = Math.round((debt_tmp - paid1_tmp - paid2_tmp)*100)/100;
  }

  // Холодная вода
  if(AnyBalance.isAvailable('cold_water', 'debt')){
    //AnyBalance.trace('cold_water');
    var debt_tmp=getParam(html_table, result, false, /&#1061;&#1054;&#1051;&#1054;&#1044;&#1053;&#1040;&#1071; &#1042;&#1054;&#1044;&#1040;(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
    var paid1_tmp=getParam(html_table, result, false, /&#1061;&#1054;&#1051;&#1054;&#1044;&#1053;&#1040;&#1071; &#1042;&#1054;&#1044;&#1040;(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
    var paid2_tmp=getParam(html_table, result, false, /&#1061;&#1054;&#1051;&#1054;&#1044;&#1053;&#1040;&#1071; &#1042;&#1054;&#1044;&#1040;(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
    result.cold_water = Math.round((debt_tmp - paid1_tmp - paid2_tmp)*100)/100;
  }

  // Канализация
  if(AnyBalance.isAvailable('sewerage', 'debt')){
    //AnyBalance.trace('sewerage');
    var debt_tmp=getParam(html_table, result, false, /&#1050;&#1040;&#1053;&#1040;&#1051;&#1048;&#1047;&#1040;&#1062;&#1048;&#1071;(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
    var paid1_tmp=getParam(html_table, result, false, /&#1050;&#1040;&#1053;&#1040;&#1051;&#1048;&#1047;&#1040;&#1062;&#1048;&#1071;(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
    var paid2_tmp=getParam(html_table, result, false, /&#1050;&#1040;&#1053;&#1040;&#1051;&#1048;&#1047;&#1040;&#1062;&#1048;&#1071;(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
    result.sewerage = Math.round((debt_tmp - paid1_tmp - paid2_tmp)*100)/100;
  }

  // Газ
  if(AnyBalance.isAvailable('gas', 'debt')){
    //AnyBalance.trace('gas');
    var debt_tmp=getParam(html_table, result, false, /&#1043;&#1040;&#1047;(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
    var paid1_tmp=getParam(html_table, result, false, /&#1043;&#1040;&#1047;(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
    var paid2_tmp=getParam(html_table, result, false, /&#1043;&#1040;&#1047;(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
    result.gas = Math.round((debt_tmp - paid1_tmp - paid2_tmp)*100)/100;
  }

  // Вывоз ТБО
  if(AnyBalance.isAvailable('garbage', 'debt')){
    //AnyBalance.trace('garbage');
    var debt_tmp=getParam(html_table, result, false, /&#1042;&#1067;&#1042;&#1054;&#1047; &#1058;&#1041;&#1054;(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
    var paid1_tmp=getParam(html_table, result, false, /&#1042;&#1067;&#1042;&#1054;&#1047; &#1058;&#1041;&#1054;(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
    var paid2_tmp=getParam(html_table, result, false, /&#1042;&#1067;&#1042;&#1054;&#1047; &#1058;&#1041;&#1054;(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
    result.garbage = Math.round((debt_tmp - paid1_tmp - paid2_tmp)*100)/100;
  }

  // Укртелеком
  if(AnyBalance.isAvailable('ukrtelekom', 'debt')){
    //AnyBalance.trace('ukrtelekom');
    var debt_tmp=getParam(html_table, result, false, /&#1059;&#1050;&#1056;&#1058;&#1045;&#1051;&#1045;&#1050;&#1054;&#1052;(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
    var paid1_tmp=getParam(html_table, result, false, /&#1059;&#1050;&#1056;&#1058;&#1045;&#1051;&#1045;&#1050;&#1054;&#1052;(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
    var paid2_tmp=getParam(html_table, result, false, /&#1059;&#1050;&#1056;&#1058;&#1045;&#1051;&#1045;&#1050;&#1054;&#1052;(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
    result.ukrtelekom = Math.round((debt_tmp - paid1_tmp - paid2_tmp)*100)/100;
  }

  // Воля
  if(AnyBalance.isAvailable('volya', 'debt')){
    //AnyBalance.trace('volya');
    var debt_tmp=getParam(html_table, result, false, /&#1042;&#1054;&#1051;&#1071;. &#1058;&#1045;&#1051;&#1045;&#1050;&#1054;&#1052;&#1052;&#1059;&#1053;&#1048;&#1050;&#1040;&#1062;. &#1059;&#1057;&#1051;&#1059;&#1043;&#1048;(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
    var paid1_tmp=getParam(html_table, result, false, /&#1042;&#1054;&#1051;&#1071;. &#1058;&#1045;&#1051;&#1045;&#1050;&#1054;&#1052;&#1052;&#1059;&#1053;&#1048;&#1050;&#1040;&#1062;. &#1059;&#1057;&#1051;&#1059;&#1043;&#1048;(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
    var paid2_tmp=getParam(html_table, result, false, /&#1042;&#1054;&#1051;&#1071;. &#1058;&#1045;&#1051;&#1045;&#1050;&#1054;&#1052;&#1052;&#1059;&#1053;&#1048;&#1050;&#1040;&#1062;. &#1059;&#1057;&#1051;&#1059;&#1043;&#1048;(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
    result.volya = Math.round((debt_tmp - paid1_tmp - paid2_tmp)*100)/100;
  }

  // Общий долг
  if(AnyBalance.isAvailable('debt')){
    result.debt = 0;
    if(result.rent>0) result.debt += result.rent;
    if(result.heating>0) result.debt += result.heating;
    if(result.hot_water>0) result.debt += result.hot_water;
    if(result.cold_water>0) result.debt += result.cold_water;
    if(result.sewerage>0) result.debt += result.sewerage;
    if(result.gas>0) result.debt += result.gas;
    if(result.garbage>0) result.debt += result.garbage;
    if(result.ukrtelekom>0) result.debt += result.ukrtelekom;
    if(result.volya>0) result.debt += result.volya;
    result.debt = Math.round(result.debt*100)/100;
  }

  //Тарифный план
  var account_tmp=getParam(html, result, false, /<DIV class="maintextercviewsmall">Лицевой счет[\s\S]*?class=maintextercview>(.*?)</, replaceTagsAndSpaces, false);
  var month_tmp=getParam(html_table, result, false, /Справка о результатах взаиморасчетов по коммунальным услугам за (.*?)</, replaceTagsAndSpaces, false);
  result.__tariff='Счет: ' + account_tmp + ' (' + month_tmp + ')';

  AnyBalance.trace('Logout');
  var html = AnyBalance.requestGet(baseurl + 'ru/logout', headers);
  
  AnyBalance.setResult(result);
}
