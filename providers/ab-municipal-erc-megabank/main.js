/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

ЕРЦ Мегабанк
Сайт: https://erc.megabank.net/
*/

function calc_service_debt(servicename, data){
  for(var service_id in data) {
    if(data[service_id].servicename == servicename) {
      service_debt = data[service_id].saldo - data[service_id].paysnew;
      return Math.round(service_debt*100)/100;
    }
  }
}

//------------------------------------------------------------------------------

function main(){
  AnyBalance.setDefaultCharset('utf-8');
  var prefs = AnyBalance.getPreferences();
  var baseurl = 'https://erc.megabank.ua/';
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
    var html = AnyBalance.requestPost(baseurl + '/ru/node?destination=node', {
      form_build_id: form_build_id[1],
      form_id: "user_login_block",
      op: "Войти",
      name: prefs.login,
      pass: prefs.password
    }, headers);

    if(!/user\/logout/i.test(html)){
        var json = getJson(html);
        for(var i=0; i<json.length; ++i){
        	if(json[i].command == 'insert'){
			    var error = getElement(json[i].data, /<div[^>]+alert/i, replaceTagsAndSpaces);
			    if(error){
          			throw new AnyBalance.Error(error, null, /парол/i.test(error));
			    }
        	}
        }
    }

    AnyBalance.trace('Successfully login');
  } else {
    AnyBalance.trace('Already logged?');
  }

  AnyBalance.trace('Connecting to ' + baseurl + 'ru/service/publicutilities');
  var html = AnyBalance.requestGet(baseurl + 'ru/service/publicutilities', headers);
  AnyBalance.trace('Searching account_url');
  if(prefs.account){
    var account_url = (new RegExp('<h3 class="title">' + prefs.account + '[\\s\\S]*?"/(ua/service/publicutilities/debt/\\d)')).exec(html);
    if(!account_url) throw new AnyBalance.Error("Не удаётся найти account_url. Проблемы или изменения на сайте?");
    account_url = baseurl + account_url[1];
  } else var account_url = baseurl + 'ru/service/publicutilities/debt/1'
  AnyBalance.trace('account_url = ' + account_url);

  AnyBalance.trace('Connecting to ' + account_url);
  var html = AnyBalance.requestGet(account_url, headers);

  AnyBalance.trace('Searching account_N');
  var account_N  = /(\d)$/.exec(account_url);
  if(!account_N) throw new AnyBalance.Error("Не удаётся найти account_N. Проблемы или изменения на сайте?");
  AnyBalance.trace('account_N = ' + account_N[1]);

  AnyBalance.trace('Searching month_option');
  var month_option = getParam(html, null, null, /<select[^>]+id="kan_monthlist"[^>]*>\s*<option[^>]+value="([^"]*)/i, replaceHtmlEntities);
  if(!month_option) throw new AnyBalance.Error("Не удаётся найти month_option. Проблемы или изменения на сайте?");
  var m=month_option.slice(4,7)*1;
  var y=month_option.slice(0,4)*1;
  m +=1;
  if (m==13) {m=1;y+=1};
  month_option=y.toString()+ (m<10 ? '0':'')+ m.toString();
  AnyBalance.trace('Getting table');
  AnyBalance.trace('month_option = ' + month_option);
  var json_table = AnyBalance.requestGet(baseurl + 'ru/service/resp/debt/' + account_N[1] + '/' + month_option + '?order=asc', headers);
  data_table = JSON.parse(json_table);


  var result = {success: true};

  result.month = month_option.replace(/(\d{4})(\d{2})/i, '$2/$1');

  // Лицевой счет
  getParam(html, result, 'account', /<span class="label-static">(?:особовий рахунок|лицевой счет)<\/span><span class="value-static">(.*?)</, replaceTagsAndSpaces, false);

  // Адрес
  getParam(html, result, 'address', /<span class="label-static">Адреса?<\/span><span class="value-static">([\s\S]*?)</, replaceTagsAndSpaces);

  // Ф.И.О.
  getParam(html, result, 'name', /<span class="label-static">П|Ф\.І|И\.Б|О.<\/span><span class="value-static">(.*?)</, replaceTagsAndSpaces);

  // Месяц
  getParam(html, result, 'month', /<select class="form-control" id="kan_monthlist" size=1 onchange="get_views_nt\(\)" data-trig="1"><option value="\d{6}"  selected="selected" > (.*?) </, replaceTagsAndSpaces);

  // Электричество
  if(AnyBalance.isAvailable('rent', 'debt')){
    result.electricity = calc_service_debt('ЭЛЕКТРИЧЕСТВО', data_table)
  }

  // Квартплата
  if(AnyBalance.isAvailable('rent', 'debt')){
    result.rent = calc_service_debt('КВАРТПЛАТА', data_table)
  }

  // Отопление
  if(AnyBalance.isAvailable('heating', 'debt')){
    result.heating = calc_service_debt('ОТОПЛЕНИЕ', data_table)
  }

  // Горячая вода
  if(AnyBalance.isAvailable('hot_water', 'debt')){
    result.hot_water = calc_service_debt('ГОРЯЧАЯ ВОДА', data_table)
  }

  // Холодная вода
  if(AnyBalance.isAvailable('cold_water', 'debt')){
    result.cold_water = calc_service_debt('ХОЛОДНАЯ ВОДА', data_table)
  }

  // Канализация
  if(AnyBalance.isAvailable('sewerage', 'debt')){
    result.sewerage = calc_service_debt('КАНАЛИЗАЦИЯ', data_table)
  }

  // Газ
  if(AnyBalance.isAvailable('gas', 'debt')){
    result.gas = calc_service_debt('ГАЗ ПРИРОДНЫЙ', data_table)
  }

  // Вывоз ТБО
  if(AnyBalance.isAvailable('garbage', 'debt')){
    result.garbage = calc_service_debt('ВЫВОЗ ТБО', data_table)
  }

  // Укртелеком
  if(AnyBalance.isAvailable('ukrtelekom', 'debt')){
    result.ukrtelekom = calc_service_debt('УКРТЕЛЕКОМ', data_table)
  }

  // Воля
  if(AnyBalance.isAvailable('volya', 'debt')){
    result.volya = calc_service_debt('ВОЛЯ. ТЕЛЕКОММУНИКАЦ. УСЛУГИ', data_table)
  }

  // Общий долг
  if(AnyBalance.isAvailable('debt')){
    result.debt = 0;
    if(result.electricity>0) result.debt += result.electricity;
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
  result.__tariff='Счет: ' + result.account + ' (' + result.month + ')';

  AnyBalance.trace('Logout');
//  var html = AnyBalance.requestGet(baseurl + 'ru/user/logout', headers);
  
  AnyBalance.setResult(result);
}
