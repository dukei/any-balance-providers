/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

djuice
Сайт оператора: http://www.djuice.ua/
Личный кабинет: https://my.djuice.com.ua/
*/

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
  if (matches=/(Тарифний план:|Тарифный план:)[\s\S]*?<td\s+[^>]*>(.*?)\s*<\/td>/.exec(html)){
    str_tmp=/(Номер діє до:|Номер действует до:)[\s\S]*?<td>(.*?)</.exec(html)
    result.__tariff=matches[2]+' (до '+str_tmp[2]+')';
  }
  
  // Баланс
  if(AnyBalance.isAvailable('balance')){
    if (matches=/(Залишок на рахунку:|Остаток на счету:)[\s\S]*?<b>(.*?)</.exec(html)){
        result.balance=parseFloat(matches[2]);
    }
  }
  
  //Бонусные минуты (1)
  if(AnyBalance.isAvailable('bonus_mins_1')){
    if (matches=/(Залишок хвилин для дзвінків|Остаток минут для звонков)[\s\S]*?<b>(.*?)</.exec(html)){
        result.bonus_mins_1=parseInt(matches[2]);
    }
  }
  
  //Бонусные минуты (2)
  if(AnyBalance.isAvailable('bonus_mins_2')){
    if (matches=/(Залишок хвилин для дзвінків|Остаток минут для звонков)[\s\S]*?(Залишок хвилин для дзвінків|Остаток минут для звонков)[\s\S]*?<b>(.*?)</.exec(html)){
        result.bonus_mins_2=parseInt(matches[3]);
    }
  }
  
  //Бонусные MMS
  if(AnyBalance.isAvailable('bonus_mms')){
    if (matches=/(Бонусні MMS:|Бонусные MMS:)[\s\S]*?<b>(.*?)</.exec(html)){
        result.bonus_mms=parseInt(matches[2]);
    }
  }
  
  //Бонусные SMS
  if(AnyBalance.isAvailable('bonus_sms')){
    if (matches=/(Бонусні SMS:|Бонусные SMS:)[\s\S]*?<b>(.*?)</.exec(html)){
        result.bonus_sms=parseInt(matches[2]);
    }
  }
  
  //Бонусные средства
  if(AnyBalance.isAvailable('bonus_money')){
    if (matches=/(Бонусні кошти :|Бонусные средства:)[\s\S]*?<b>(.*?)</.exec(html)){
        result.bonus_money=parseFloat(matches[2]);
    }
  }
  
  //Остаток бонусов (1)
  if(AnyBalance.isAvailable('bonus_left_1')){
    if (matches=/(Залишок бонусів:|Остаток бонусов:)[\s\S]*?<b>(.*?)</.exec(html)){
        result.bonus_left_1=parseFloat(matches[2]);
    }
  }
  
  //Интернет (1)
  if(AnyBalance.isAvailable('internet_1')){
    if (matches=/(Залишок бонусного об\'єму даних:|Остаток бонусного объема данных:)[\s\S]*?<b>(.*?)</.exec(html)){
        result.internet_1=Math.round(parseInt(matches[2])/1024/1024*100)/100;
    }
  }
  
  //Интернет (2)
  if(AnyBalance.isAvailable('internet_2')){
    if (matches=/(Залишок бонусного об\'єму даних:|Остаток бонусного объема данных:)[\s\S]*?(Залишок бонусного об\'єму даних:|Остаток бонусного объема данных:)[\s\S]*?<b>(.*?)</.exec(html)){
        result.internet_2=Math.round(parseInt(matches[3])/1024/1024*100)/100;
    }
    getParam(html, result, 'internet_2', /(?:Інтернет:|Интернет:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficMb);
  }
  
  //Домашний Интернет
  getParam(html, result, 'home_internet', /(?:Від послуги "Домашній .нтернет":|От услуги "Домашний .нтернет":)[\s\S]*?<b>(.*?)<[\s\S]*?>(.*?)&nbsp;</, replaceTagsAndSpaces, parseBalance);
  getParam(html, result, 'home_internet_to_date', /(?:Від послуги "Домашній .нтернет":|От услуги "Домашний .нтернет":)[\s\S]*?<b>(?:.*?)<[\s\S]*?>(.*?)&nbsp;</, replaceTagsAndSpaces, parseDate);

  getParam(html, result, 'till', /(?:Номер діє до:|Номер действует до:)[\s\S]*?<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
  
  //Остаток бонусов (2)
  if(AnyBalance.isAvailable('bonus_left_2')){
    if (matches=/(Залишок бонусів:|Остаток бонусов:)[\s\S]*?(Залишок бонусів:|Остаток бонусов:)[\s\S]*?<b>(.*?)</.exec(html)){
        result.bonus_left_2=parseFloat(matches[3]);
    }
  }
  
  AnyBalance.setResult(result);
}

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var matches = regexp.exec (html), value;
	if (matches) {
		value = matches[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
	}
   return value
}

var replaceTagsAndSpaces = [/&nbsp;/g, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseTrafficMb(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    if(typeof(val) != 'undefined')
        val = Math.round(val/1024/1024*100)/100;
    AnyBalance.trace('Parsing traffic (' + val + 'Mb) from: ' + text);
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

