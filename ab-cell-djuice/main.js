/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

djuice
Сайт оператора: http://www.djuice.ua/
Личный кабинет: https://my.djuice.com.ua/
*/

function main(){
  var prefs = AnyBalance.getPreferences();
  var baseurl = 'https://my.djuice.ua/';
  AnyBalance.trace('Connecting to ' + baseurl);
    var html = AnyBalance.requestPost(baseurl + 'tbmb/login_djuice/perform.do', {
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
    if (matches=/Тарифний план:[\s\S]*?<a\s+[^>]*>(.*?)\s*<\/a>/.exec(html)){
      str_tmp=/Номер діє до:[\s\S]*?<td>(.*?)</.exec(html)
      result.__tariff=matches[1]+' (до '+str_tmp[1]+')';
    }
    
    // Баланс
    if(AnyBalance.isAvailable('balance')){
      if (matches=/Залишок на рахунку:[\s\S]*?<b>(.*?)</.exec(html)){
          result.balance=parseFloat(matches[1]);
      }
    }
    
    //Бонусные минуты (1)
    if(AnyBalance.isAvailable('bonus_mins_1')){
      if (matches=/Залишок хвилин для дзвінків[\s\S]*?<b>(.*?)</.exec(html)){
          result.bonus_mins_1=parseInt(matches[1]);
      }
    }
    
    //Бонусные минуты (2)
    if(AnyBalance.isAvailable('bonus_mins_2')){
      if (matches=/Залишок хвилин для дзвінків[\s\S]*?Залишок хвилин для дзвінків[\s\S]*?<b>(.*?)</.exec(html)){
          result.bonus_mins_2=parseInt(matches[1]);
      }
    }
    
    //Бонусные MMS
    if(AnyBalance.isAvailable('bonus_mms')){
      if (matches=/Бонусні MMS:[\s\S]*?<b>(.*?)</.exec(html)){
          result.bonus_mms=parseInt(matches[1]);
      }
    }
    
    //Бонусные SMS
    if(AnyBalance.isAvailable('bonus_sms')){
      if (matches=/Бонусні SMS:[\s\S]*?<b>(.*?)</.exec(html)){
          result.bonus_sms=parseInt(matches[1]);
      }
    }
    
    //Бонусные средства
    if(AnyBalance.isAvailable('bonus_money')){
      if (matches=/Бонусні кошти :[\s\S]*?<b>(.*?)</.exec(html)){
          result.bonus_money=parseFloat(matches[1]);
      }
    }
    
    //Остаток бонусов
    if(AnyBalance.isAvailable('bonus_left')){
      if (matches=/Залишок бонусів:[\s\S]*?<b>(.*?)</.exec(html)){
          result.bonus_left=parseFloat(matches[1]);
      }
    }
    
    //Интернет (1)
    if(AnyBalance.isAvailable('internet_1')){
      if (matches=/Залишок бонусного об\'єму даних:[\s\S]*?<b>(.*?)</.exec(html)){
          result.internet_1=Math.round(parseInt(matches[1])/1024/1024*100)/100;
      }
    }
    
    //Интернет (2)
    if(AnyBalance.isAvailable('internet_2')){
      if (matches=/Залишок бонусного об\'єму даних:[\s\S]*?Залишок бонусного об\'єму даних:[\s\S]*?<b>(.*?)</.exec(html)){
          result.internet_2=Math.round(parseInt(matches[1])/1024/1024*100)/100;
      }
    }
    
    //Домашний Интернет
    if(AnyBalance.isAvailable('home_internet')){
      if (matches=/Від послуги "Домашній Інтернет":[\s\S]*?<b>(.*?)</.exec(html)){
          result.home_internet=parseFloat(matches[1]);
      }
    }
    
    AnyBalance.setResult(result);
}

