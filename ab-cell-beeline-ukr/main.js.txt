/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Киевстар
Сайт оператора: http://www.beeline.ua/
Личный кабинет: https://poslugy.beeline.ua/
*/

function main(){
  var prefs = AnyBalance.getPreferences();
  var baseurl = "https://poslugy.beeline.ua/";
  AnyBalance.trace('Connecting to ' + baseurl);

  var html = AnyBalance.requestGet(baseurl + 'tbmb/login_beeline/show.do');
  var token = /name="org.apache.struts.taglib.html.TOKEN" value="([\s\S]*?)">/.exec(html);

  AnyBalance.trace('Token = ' + token[1]);

  var html = AnyBalance.requestPost(baseurl + "tbmb/login_beeline/perform.do", {
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


  AnyBalance.setResult(result);
}

