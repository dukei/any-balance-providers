/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Киевстар
Сайт оператора: http://www.kyivstar.ua/
Личный кабинет: https://my.kyivstar.ua/
*/

function main(){
  var prefs = AnyBalance.getPreferences();
  var baseurl = "https://my.kyivstar.ua/";
  AnyBalance.trace('Connecting to ' + baseurl);

  var html = AnyBalance.requestGet(baseurl + 'tbmb/login/show.do');
  var token = /name="org.apache.struts.taglib.html.TOKEN" value="([\s\S]*?)">/.exec(html);

  AnyBalance.trace('Token = ' + token[1]);

  var html = AnyBalance.requestPost(baseurl + "tbmb/login/perform.do", {
    isSubmitted: "true",
    "org.apache.struts.taglib.html.TOKEN": token[1],
    user: prefs.login,
    password: prefs.password
  });
  
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
    if (matches=/(Кількість хвилин для дзвінків|Количество минут для звонков)[\s\S]*?<b>(.*?)</.exec(html)){
        result.bonus_mins_1=parseInt(matches[2]);
    } else if (matches=/(Хвилини всередині мережі "Київстар":|Минуты внутри сети "Киевстар":)[\s\S]*?<b>(.*?)</.exec(html)){
        result.bonus_mins_1=parseInt(matches[2]);
    }
  }
  
  //Бонусные минуты (2)
  if(AnyBalance.isAvailable('bonus_mins_2')){
    if (matches=/(Кількість хвилин для дзвінків|Количество минут для звонков)[\s\S]*?(Кількість хвилин для дзвінків|Количество минут для звонков)[\s\S]*?<b>(.*?)</.exec(html)){
        result.bonus_mins_2=parseInt(matches[3]);
    } else if (matches=/(Залишок хвилин для дзвінків абонентам Київстар та DJUICE:|Остаток минут для звонков абонентам Киевстар и DJUICE:)[\s\S]*?<b>(.*?)</.exec(html)){
        result.bonus_mins_2=parseInt(matches[2]);
    }
  }
  
  //Бонусные MMS
  if(AnyBalance.isAvailable('bonus_mms')){
    if (matches=/>(Бонусні MMS:|Бонусные MMS:)[\s\S]*?<b>(.*?)</.exec(html)){
        result.bonus_mms=parseInt(matches[2]);
    }
  }
  
  //Бонусные SMS
  if(AnyBalance.isAvailable('bonus_sms')){
    if (matches=/>(Бонусні SMS:|Бонусные SMS:)[\s\S]*?<b>(.*?)</.exec(html)){
        result.bonus_sms=parseInt(matches[2]);
    }
  }
  
  //MMS
  if(AnyBalance.isAvailable('mms')){
    if (matches=/>MMS:[\s\S]*?<b>(.*?)</.exec(html)){
        result.mms=parseInt(matches[1]);
    }
  }
  
  //SMS
  if(AnyBalance.isAvailable('sms')){
    if (matches=/>SMS:[\s\S]*?<b>(.*?)</.exec(html)){
        result.sms=parseInt(matches[1]);
    }
  }
  
  //SMS2
  if(AnyBalance.isAvailable('sms2')){
    if (matches=/>SMS:[\s\S]*?>SMS:[\s\S]*?<b>(.*?)</.exec(html)){
        result.sms2=parseInt(matches[1]);
    }
  }
  
  //Бонусные средства (1)
  if(AnyBalance.isAvailable('bonus_money_1')){
    if (matches=/(Бонусні кошти:|Бонусные средства:)[\s\S]*?<b>(.*?)</.exec(html)){
        result.bonus_money_1=parseFloat(matches[2]);
    }
  }
  
  //Бонусные средства (2)
  if(AnyBalance.isAvailable('bonus_money_2')){
    if (matches=/(Бонуси за умовами тарифного плану "Єдина ціна":|Бонусы по условиям тарифного плана "Единая цена":)[\s\S]*?<b>(.*?)</.exec(html)){
        result.bonus_money_2=parseFloat(matches[2]);
    } else if (matches=/(Кошти по послузі "Екстра кошти"|Средства по услуге "Экстра деньги"):[\s\S]*?<b>(.*?)</.exec(html)){
        result.bonus_money_2=parseInt(matches[2]);
    }
  }
  
  //Остаток бонусов
  if(AnyBalance.isAvailable('bonus_left')){
    if (matches=/(Залишок бонусів:|Остаток бонусов:)[\s\S]*?<b>(.*?)</.exec(html)){
        result.bonus_left=parseFloat(matches[2]);
    }
  }
  
  //Остаток бонусов (2)
  if(AnyBalance.isAvailable('bonus_left_2')){
    if (matches=/(Залишок бонусів:|Остаток бонусов:)[\s\S]*?(Залишок бонусів:|Остаток бонусов:)[\s\S]*?<b>(.*?)</.exec(html)){
        result.bonus_left_2=parseFloat(matches[3]);
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
  
  AnyBalance.setResult(result);
}

