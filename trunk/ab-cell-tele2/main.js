/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сотового оператора Tele2 (Россия).

Сайт оператора: http://www.tele2.ru/
Личный кабинет: https://my.tele2.ru/
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && !AnyBalance.isAvailable (param))
		return;

	var value = regexp.exec (html);
	if (value) {
		value = value[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
    else
      return value
	}
}

function main(){
    if(AnyBalance.getLevel() < 3)
      throw new AnyBalance.Error("Этот провайдер требует AnyBalance API v.3+. Пожалуйста, обновите AnyBalance до последней версии.");
  
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://my.tele2.ru/";

    AnyBalance.setDefaultCharset('utf-8');

    AnyBalance.trace("Trying to enter selfcare at address: " + baseurl);
    var html = AnyBalance.requestPost(baseurl + "public/security/check", {
      j_username: prefs.login,
      j_password: prefs.password
    }, {"X-Requested-With": "XMLHttpRequest"});
    
    var json = JSON.parse(html);
    if(!json.success)
      throw new AnyBalance.Error(json.error);
    
    var result = {success: true}; //Баланс нельзя не получить, не выдав ошибку!
    
    if(AnyBalance.isAvailable('balance')){
      result.balance = null; //Баланс должен быть всегда, даже если его не удаётся получить. 
      //Если его не удалось получить, то передаём null, чтобы значение взялось из предыдущего запроса
    }

    html = AnyBalance.requestGet(baseurl + "home");
    
    getParam(html, result, "userName", /"wide-header"[\s\S]*?([^<>]*)<\/h1>/i, [/^\s*|\s*$/g, '']);
    result.__tariff = getParam(html, null, null, /Тариф<\/h2>[\s\S]*?>([^<]*)/i, [/^\s*|\s*$/g, '']);
    
    if(AnyBalance.isAvailable('balance')){
      AnyBalance.trace("Searching for balance");
      html = AnyBalance.requestGet(baseurl + "balance/json?isBalanceRefresh=false&_=32431329916365609");
      json = JSON.parse(html);
      getParam(json.balance, result, "balance", /([\-\d,\.\s]*)/, [/^[\s,\.]*|[\s,\.]*$/g, '', /,/g,'.'], parseFloat);
    }
    
    if(AnyBalance.isAvailable('sms_used', 'min_used', 'traffic_used')){
      AnyBalance.trace("Searching for used resources in this month");
      html = AnyBalance.requestGet(baseurl + "payments/summary/json");
      json = JSON.parse(html);
      for(var i=0;i<json.length;++i){
        var name = json[i].name;
        var matches;
        if(AnyBalance.isAvailable('min_used')){
          if(matches = /(\d+) минут/i.exec(name)){
            result.min_used = parseInt(matches[1]);
          }
        }
        if(AnyBalance.isAvailable('sms_used')){
          if(matches = /(\d+) .* SMS/i.exec(name)){
            result.sms_used = parseInt(matches[1]);
          }
        }
        if(AnyBalance.isAvailable('traffic_used')){
          if(matches = /GPRS.*?([\d\s\.\,]+) (Гб|Мб|Кб)/i.exec(name)){
            var val = parseFloat(matches[1].replace(/^[\s,\.]*|[\s,\.]*$/g, '').replace(',','.'));
            switch(matches[2]){
              case 'Гб':
                val *= 1000; break;
              case 'Мб':
                break;
              case 'Кб':
                val /= 1000; break;
            }
            result.traffic_used = val;
          }
        }
      }
    }


    AnyBalance.setResult(result);
}
