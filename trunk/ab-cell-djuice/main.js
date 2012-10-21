/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Djuice
Сайт оператора: http://www.djuice.ua/
Личный кабинет: https://my.djuice.com.ua/
*/

function sumParam (html, result, param, regexp, replaces, parser, do_replace) {
  if (param && (param != '__tariff' && !AnyBalance.isAvailable (param))){
    if(do_replace)
      return html;
    else
      return;
  }

  var total_value;
  var html_copy = html.replace(regexp, function(str, value){
    for (var i = 0; replaces && i < replaces.length; i += 2) {
      value = value.replace (replaces[i], replaces[i+1]);
    }
    if (parser)
      value = parser (value);
    if(typeof(total_value) == 'undefined')
      total_value = value;
    else
      total_value += value;
    return ''; //Вырезаем то, что заматчили
  });

  if(param){
    if(typeof(total_value) != 'undefined'){
      if(typeof(result[param]) == 'undefined')
        result[param] = total_value;
      else 
        result[param] += total_value;
    }
    if(do_replace)
      return html_copy;
  }else{
    return total_value;
  }
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
  var val = sumParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d.,]*)/, replaceFloat, parseFloat);
  AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
  return val;
}

function parseDate(str){
  var matches = /(\d+)[^\d](\d+)[^\d](\d+)/.exec(str);
  if(matches){
    var date = new Date(+matches[3], matches[2]-1, +matches[1]);
    var time = date.getTime();
    AnyBalance.trace('Parsing date ' + date + ' from value: ' + str);
    return time;
  }
  AnyBalance.trace('Failed to parse date from value: ' + str);
}

function parseTraffic(text){
  var _text = text.replace(/\s+/, '');
  var val = sumParam(_text, null, null, /(-?\d[\d\.,]*)/, replaceFloat, parseFloat);
  var units = sumParam(_text, null, null, /([kmgкмг][бb]|байт|bytes)/i);
  if(!units){
    AnyBalance.trace('Can not parse units from ' + text);
    units = 'б';
  }
  switch(units.substr(0,1).toLowerCase()){
    case 'b':
    case 'б':
      val = Math.round(val/1024/1024*100)/100;
      break;
    case 'k':
    case 'к':
      val = Math.round(val/1024*100)/100;
      break;
    case 'g':
    case 'г':
      val = Math.round(val*1024);
      break;
  }
  var textval = ''+val;
  if(textval.length > 6)
    val = Math.round(val);
  else if(textval.length > 5)
    val = Math.round(val*10)/10;

  AnyBalance.trace('Parsing traffic (' + val + ') from: ' + text);
  return val;
}

function parseMinutes(str){
  AnyBalance.trace('Parsing minutes from value: ' + str);
  return parseFloat(str)*60; //Переводим в секунды
}

//------------------------------------------------------------------------------

function main(){
  var prefs = AnyBalance.getPreferences();
  var baseurl = 'https://my.djuice.ua/';
  var headers = {
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1',
    Connection: 'keep-alive'
  };

  AnyBalance.trace('Connecting to ' + baseurl);

  var html = AnyBalance.requestGet(baseurl + 'tbmb/login_djuice/show.do', headers);
  var token = /name="org.apache.struts.taglib.html.TOKEN" value="([\s\S]*?)">/.exec(html);
  if(!token)
      throw new AnyBalance.Error("Не удаётся найти код безопасности для входа. Проблемы или изменения на сайте?");

  AnyBalance.trace('Token = ' + token[1]);

  var html = AnyBalance.requestPost(baseurl + 'tbmb/login_djuice/perform.do', {
    isSubmitted: "true",
    "org.apache.struts.taglib.html.TOKEN": token[1],
    user: prefs.login,
    password: prefs.password
  }, headers);
  
  var matches = html.match(/<td class="redError">([\s\S]*?)<\/td>/i);
  if(matches){
      throw new AnyBalance.Error(matches[1]);
  }
  
  AnyBalance.trace('Successfully connected');
  
  var result = {success: true};
  var str_tmp;
  
  //Тарифный план
  sumParam(html, result, '__tariff', /(?:Тарифний план:|Тарифный план:)[\s\S]*?<td\s+[^>]*>(.*?)\s*<\/td>/, replaceTagsAndSpaces);
  
  // Баланс
  sumParam(html, result, 'balance', /(?:Залишок на рахунку:|Остаток на счету:)[\s\S]*?<b>(.*?)</, replaceTagsAndSpaces, parseBalance);
  
  //Бонусные минуты (1)
  sumParam(html, result, 'bonus_mins_1', /(?:Залишок хвилин для дзвінків|Остаток минут для звонков)[\s\S]*?<b>(.*?)</, replaceTagsAndSpaces, parseMinutes);
  
  //Бонусные минуты (2)
  sumParam(html, result, 'bonus_mins_2', /(?:Залишок хвилин для дзвінків|Остаток минут для звонков)[\s\S]*?(?:Залишок хвилин для дзвінків|Остаток минут для звонков)[\s\S]*?<b>(.*?)</, replaceTagsAndSpaces, parseMinutes);
  
  //Бонусные MMS
  sumParam(html, result, 'bonus_mms', /(?:Бонусні MMS:|Бонусные MMS:)[\s\S]*?<b>(.*?)</, replaceTagsAndSpaces, parseInt);
  
  //Бонусные SMS
  sumParam(html, result, 'bonus_sms', /(?:Бонусні SMS:|Бонусные SMS:)[\s\S]*?<b>(.*?)</, replaceTagsAndSpaces, parseInt);
  
  //Бонусные средства
  sumParam(html, result, 'bonus_money', /(?:Бонусні кошти :|Бонусные средства:)[\s\S]*?<b>(.*?)</, replaceTagsAndSpaces, parseBalance);
  
  //Остаток бонусов
  sumParam(html, result, 'bonus_left', /(?:Залишок бонусів:|Остаток бонусов:)[\s\S]*?<b>(.*?)</, replaceTagsAndSpaces, parseBalance);
  sumParam(html, result, 'bonus_left', /(?:Залишок бонусів:|Остаток бонусов:)[\s\S]*?(?:Залишок бонусів:|Остаток бонусов:)[\s\S]*?<b>(.*?)</, replaceTagsAndSpaces, parseBalance);
  
  //Интернет
  sumParam(html, result, 'internet', /(?:Залишок бонусного об\'єму даних:|Остаток бонусного объема данных:)[\s\S]*?<b>(.*?)</i, replaceTagsAndSpaces, parseTraffic);
  sumParam(html, result, 'internet', /(?:Залишок бонусного об\'єму даних:|Остаток бонусного объема данных:)[\s\S]*?(?:Залишок бонусного об\'єму даних:|Остаток бонусного объема данных:)[\s\S]*?<b>(.*?)</i, replaceTagsAndSpaces, parseTraffic);
  sumParam(html, result, 'internet', /(?:Інтернет:|Интернет:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTraffic);
  
  //Домашний Интернет
  sumParam(html, result, 'home_internet', /(?:Від послуги "Домашній .нтернет":|От услуги "Домашний .нтернет":)[\s\S]*?<b>(.*?)<[\s\S]*?>(.*?)&nbsp;</, replaceTagsAndSpaces, parseBalance);
  
  //Домашний Интернет действует до
  sumParam(html, result, 'home_internet_to_date', /(?:Від послуги "Домашній .нтернет":|От услуги "Домашний .нтернет":)[\s\S]*?<b>(?:.*?)<[\s\S]*?>(.*?)&nbsp;</, replaceTagsAndSpaces, parseDate);
  
  //Срок действия номера
  sumParam(html, result, 'till', /(?:Номер діє до:|Номер действует до:)[\s\S]*?<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
  
  AnyBalance.setResult(result);
}
