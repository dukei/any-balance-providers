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
  
  var aggregate_concat = create_aggregate_join('');

  // Тариф
  getParam(html, result, '__tariff', /<nobr>Тарифн(?:и|ы)й план:<\/nobr>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
  // Срок действия номера
  getParam(html, result, 'termin', /<nobr>Номер д(?:іє|ействует) до:<\/nobr>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
  
  // Баланс
  getParam(html, result, 'balance', /(?:Остаток на счету|Залишок на рахунку):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

  // Бонусный баланс
  sumParam(html, result, 'bonusbalance', /Бонусн(?:ые средства|і кошти):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
  // Остаток бонусов
  sumParam(html, result, 'bonusbalance', /(?:Остаток бонусо|Залишок бонусі)в:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);

  // Бонусные минуты на Beeline и Голден Телеком
  getParam(html, result, 'minutebalance', /Бонусн(?:ые минуты|і хвилини) на Beeline (?:и|та) Голден Телеком:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
  
  // Бесплатные минуты на Киевстар и Beeline
  getParam(html, result, 'minutebalance1', /Бе(?:сплатные минуты|зкоштовні хвилини) на Ки(?:е|ї)встар (?:и|та) Beeline:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
  
  // Бесплатные минуты на стационарные телефоны Украины
  getParam(html, result, 'minutebalance2', /Бе(?:сплатные минуты|зкоштовні хвилини) на стац(?:и|і)онарн(?:ые|і) телефон(?:ы|и) Укра(?:ины|їни):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
  
  // Минуты по условиям ТП (на Киевстар, Билайн, Голден ТЕЛЕКОМ)
  sumParam(html, result, 'minutebalance3', /.>(?:Минуты по условиям|Хвилини за умовами) ТП:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
  
  // Пакетные минуты по условиям ТП (по Украине)
  sumParam(html, result, 'minutebalance4', /.>Пакетн(?:ые минуты по условиям|і хвилини за умовами) ТП:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);  

  // Доплата за входящие звонки
  getParam(html, result, 'doplatabalance', /Доплата за вх(?:одящие зво|ідні дзві)нки:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
  // Срок действия бонусов доплаты за входящие звонки
  getParam(html, result, 'termin_doplatabalance', /Доплата за вх(?:одящие зво|ідні дзві)нки:[\s\S]*?<td[^>]*>[\s\S]*?<\/td>[\s\S]*?<td[\s\S]*?>[\s\S]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseDate);
  
  // Бонус Домашний Интернет
  getParam(html, result, 'bonusdominet', /(?:От услуги "Домашний И|Від послуги "Домашній І)нтернет":[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);


  AnyBalance.setResult(result);
}

