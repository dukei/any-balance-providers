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
  }
  
  //Домашний Интернет
  if(AnyBalance.isAvailable('home_internet')){
    if (matches=/(Від послуги "Домашній Інтернет":|От услуги "Домашний Интернет":)[\s\S]*?<b>(.*?)</.exec(html)){
        result.home_internet=parseFloat(matches[2]);
    }
  }
  
  //Остаток бонусов (2)
  if(AnyBalance.isAvailable('bonus_left_2')){
    if (matches=/(Залишок бонусів:|Остаток бонусов:)[\s\S]*?(Залишок бонусів:|Остаток бонусов:)[\s\S]*?<b>(.*?)</.exec(html)){
        result.bonus_left_2=parseFloat(matches[3]);
    }
  }
  
  AnyBalance.setResult(result);
}

