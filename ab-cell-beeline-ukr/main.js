/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Билайн
Сайт оператора: http://www.beeline.ua/
Личный кабинет: https://poslugy.beeline.ua/
*/

function main(){
  var prefs = AnyBalance.getPreferences();
  var baseurl = "https://poslugy.beeline.ua/";
  var headers = {
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'uk-UA,uk;q=0.8,en-US;q=0.6,en;q=0.4',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.4 (KHTML, like Gecko) Chrome/22.0.1229.94 Safari/537.4',
    Connection: 'keep-alive'
  };

  AnyBalance.trace('Connecting to ' + baseurl);

  var html = AnyBalance.requestGet(baseurl + 'tbmb/login_beeline/show.do', headers);
  var token = /name="org.apache.struts.taglib.html.TOKEN" value="([\s\S]*?)">/.exec(html);

  AnyBalance.trace('Token = ' + token[1]);

  var html = AnyBalance.requestPost(baseurl + "tbmb/login_beeline/perform.do", {
    isSubmitted: "true",
    "org.apache.struts.taglib.html.TOKEN": token[1],
    user: prefs.login,
    password: prefs.password
  }, headers);
  
  var matches = html.match(/<td class="redError">\s*([\s\S]*?)\s*<\/td>/i);
  if(matches){
      throw new AnyBalance.Error(matches[1]);
  }
  
  AnyBalance.trace('Successfully connected');
  
  var result = {success: true};
  var str_tmp;
  
  // Тариф
  if (matches=/<nobr>Тарифн(?:и|ы)й план:<\/nobr>\s*<\/td>\s*<td.+>(.*?)\s*<\/td>\s*<\/tr>/.exec(html)){
    str_tmp=/<nobr>Номер д(?:іє|ействует) до:<\/nobr>\s*<\/td>\s*<td>(.*?)<\/td>/.exec(html)
   result.__tariff=matches[1]+' (до '+str_tmp[1]+')';
  }
  
  // Баланс
  if(AnyBalance.isAvailable('balance')){
    if (matches=/<nobr>(?:Остаток на счету|Залишок на рахунку):<\/nobr>\s*<\/td>\s*<td>\s*<table.+\s*<colgroup>\s*<col.+\s*<col.+\s*<\/colgroup>\s*<.+\s*<td.+><b>(-?\d[\d\.,\s]*)<\/b>\s*грн.<\/td>/.exec(html)){
        result.balance=parseFloat(matches[1]);
    }
  }

  // Бонусный баланс
  if(AnyBalance.isAvailable('bonusbalance')){
    if (matches=/<td.+>Бонусн(?:ые средства|і кошти):<\/td>\s*<td.+>\s*<nobr><b>(-?\d[\d\.,\s]*)<\/b> грн.\s*<\/nobr>/.exec(html)){
        result.bonusbalance=parseFloat(matches[1]);
    }
  }

  // Бонусные минуты на Beeline и Голден Телеком
  if(AnyBalance.isAvailable('minutebalance')){
    if (matches=/<td.+>Бонусн(?:ые минуты|і хвилини) на Beeline (?:и|та) Голден Телеком:<\/td>\s*<td.+>\s*<nobr><b>(\d+?)<\/b> (?:мин|хв). <b>.+<\/b> сек.\s*<\/nobr>/.exec(html)){
        result.minutebalance=parseFloat(matches[1]);
    }
  }
  
  // Бесплатные минуты на Киевстар и Beeline
  if(AnyBalance.isAvailable('minutebalance1')){
    if (matches=/<td.+>Бе(?:сплатные минуты|зкоштовні хвилини) на Ки(?:е|ї)встар (?:и|та) Beeline:<\/td>\s*<td.+>\s*<nobr><b>(\d+?)<\/b> (?:мин|хв). <b>.+<\/b> сек.\s*<\/nobr>/.exec(html)){
        result.minutebalance1=parseFloat(matches[1]);
    }
  }
  
  // Бесплатные минуты на стационарные телефоны Украины
  if(AnyBalance.isAvailable('minutebalance2')){
    if (matches=/<td.+>Бе(?:сплатные минуты|зкоштовні хвилини) на стац(?:и|і)онарн(?:ые|і) телефон(?:ы|и) Укра(?:ины|їни):<\/td>\s*<td.+>\s*<nobr><b>(\d+?)<\/b> (?:мин|хв). <b>.+<\/b> сек.\s*<\/nobr>/.exec(html)){
        result.minutebalance2=parseFloat(matches[1]);
    }
  }
  
  // Доплата за входящие звонки
  if(AnyBalance.isAvailable('doplatabalance')){
    if (matches=/<td.+>Доплата за вх(?:одящие зво|ідні дзві)нки:<\/td>\s*<td.+>\s*<nobr><b>(-?\d[\d\.,\s]*)<\/b> грн.\s*<\/nobr>/.exec(html)){
        result.doplatabalance=parseFloat(matches[1]);
    }    
  }
  
  // Бонус Домашний Интернет
  if(AnyBalance.isAvailable('bonusdominet')){
    if (matches=/<td.+>(?:От услуги "Домашний И|Від послуги "Домашній І)нтернет":<\/td>\s*<td.+>\s*<nobr><b>(-?\d[\d\.,\s]*)<\/b> грн.\s*<\/nobr>/.exec(html)){
        result.bonusdominet=parseFloat(matches[1]);
    }    
  }

  AnyBalance.setResult(result);
}

