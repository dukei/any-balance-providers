/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Билайн
Сайт оператора: http://www.beeline.ua/
Личный кабинет: https://poslugy.beeline.ua/
*/

function parseTrafficMb(str){
    var val = parseBalance(str);
    if(isset(val))
        val = Math.round(val/1024/1024*100)/100;
    return val;
}

function parseBalanceRK(_text){
    var text = _text.replace(/\s+/g, '');
    var rub = getParam(text, null, null, /(-?\d[\d\.,]*)(?:мин|хв|руб|грн)/i, replaceFloat, parseFloat) || 0;
    var kop = getParam(text, null, null, /(-?\d[\d\.,]*)(?:сек)/i, replaceFloat, parseFloat) || 0;
    var val = rub+kop/100;
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + _text);
    return val;
}

//При сумме считаем, что дробная часть - это секунды
function aggregate_sum_mins(mins){
    if(mins.length == 0)
        return;
    var minutes=0, seconds=0;
    for(var i=0; i<mins.length; ++i){
        var val = mins[i];
        minutes += Math.floor(val);
        seconds += (val - Math.floor(val))*100;
    }

    minutes += Math.floor(seconds/60);
    minutes += (seconds%60)/100;
    return minutes;
}

function main(){
	throw new AnyBalance.Error('Личный кабинет переехал на новый адрес https://my.kyivstar.ua, воспользуйтесь провайдером Киевстар для получения баланса.');

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
  sumParam(html, result, 'bonusbalance', /Бонусн(?:ые средства|і кошти):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
  // Остаток бонусов
  sumParam(html, result, 'bonusbalance', /(?:Остаток бонусо|Залишок бонусі)в:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
  // Доплата за входящие звонки
  sumParam(html, result, 'bonusbalance', /Доплата за вх(?:одящие зво|ідні дзві)нки:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);

  // Срок действия Бонусный баланс
  sumParam(html, result, 'termin_bonusbalance', /Бонусн(?:ые средства|і кошти):[\s\S]*?<td[^>]*>[\s\S]*?<\/td>[\s\S]*?<td[\s\S]*?>[\s\S]*?>([\s\S]*?)</ig, replaceTagsAndSpaces, parseDate, aggregate_min);
  // Срок действия Остаток бонусов
  sumParam(html, result, 'termin_bonusbalance', /(?:Остаток бонусо|Залишок бонусі)в:[\s\S]*?<td[^>]*>[\s\S]*?<\/td>[\s\S]*?<td[\s\S]*?>[\s\S]*?>([\s\S]*?)</ig, replaceTagsAndSpaces, parseDate, aggregate_min);
  // Срок действия бонусов доплаты за входящие звонки
  sumParam(html, result, 'termin_bonusbalance', /Доплата за вх(?:одящие зво|ідні дзві)нки:[\s\S]*?<td[^>]*>[\s\S]*?<\/td>[\s\S]*?<td[\s\S]*?>[\s\S]*?>([\s\S]*?)</ig, replaceTagsAndSpaces, parseDate, aggregate_min);
  
  // Бесплатные минуты на Киевстар
  sumParam(html, result, 'minutebalance6', /(?:Остаток минут|Залишок хвилин) для (?:звонко|дзвінкі)в на Ки(?:е|ї)встар:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalanceRK, aggregate_sum_mins);
  
  // Льготные минуты на мобильные и стационарные номера по Украине
  // Остаток минут для звонков на других операторов и номера фиксированной связи:
  sumParam(html, result, 'minutebalance7', /(?:Остаток минут|Залишок хвилин) для (?:звонко|дзвінкі)в на (?:других|інших) оператор(?:о|і)в:?[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalanceRK, aggregate_sum_mins);

  // Бонусные минуты на Beeline и Голден Телеком
  getParam(html, result, 'minutebalance', /Бонусн(?:ые минуты|і хвилини) на Beeline (?:и|та) Голден Телеком:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalanceRK);
  
  // Бесплатные минуты на Киевстар и Beeline
  getParam(html, result, 'minutebalance1', /Бе(?:сплатные минуты|зкоштовні хвилини) на Ки(?:е|ї)встар (?:и|та) Beeline:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalanceRK);
  
  // Минуты на стационарные телефоны Украины
  getParam(html, result, 'minutebalance2', /(?:инуты|вилини) на стац(?:и|і)онарн(?:ые|і) телефон(?:ы|и) Укра(?:ины|їни):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalanceRK);
  
  // Минуты по условиям ТП (на Киевстар, Билайн, Голден ТЕЛЕКОМ)
  sumParam(html, result, 'minutebalance3', /.>(?:Минуты по условиям|Хвилини за умовами) ТП:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalanceRK, aggregate_sum_mins);
  
  // Пакетные минуты по условиям ТП (по Украине)
  sumParam(html, result, 'minutebalance4', /.>Пакетн(?:ые минуты по условиям|і хвилини за умовами) ТП:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalanceRK, aggregate_sum_mins);
  
  // Остаток минут на Киевстар и Голден Телеком
  sumParam(html, result, 'minutebalance5', /.>(?:Остаток минут для звонков на Киевстар и|Залишок хвилин для дзвінків на Київстар та) Голден Телеком:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, parseBalanceRK, parseBalance, aggregate_sum_mins);

  // Бонус Домашний Интернет
  getParam(html, result, 'bonusdominet', /(?:От услуги "Домашний И|Від послуги "Домашній І)нтернет":[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
  
  //Остаток бонусного объема данных
  sumParam(html, result, 'bonusinet', /.>(?:Остаток бонусного объема данны|Залишок бонусного об\'єму дани)х:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseTrafficMb, aggregate_sum);

  AnyBalance.setResult(result);
}

