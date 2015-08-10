/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Интернет провайдер LINKINTEL

Сайт оператора: http://www.linkintel.ru
Личный кабинет: http://login.linkintel.ru
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
    var prefs = AnyBalance.getPreferences();
    var baseurl = "http://login.linkintel.ru/Cabinet/";
    
//    html = AnyBalance.requestGet(baseurl + 'login_form.php');
    
    AnyBalance.trace('Trying to login');
    
    var html = AnyBalance.requestPost(baseurl + "confirm.php", {
      seenform: 'y',
      AccountID_form: prefs.login,
      Password_form: prefs.password,
      UserName: "",
      TownID: "",
      Status: "",
      Street: "",
      House: "",
      Nick: "",
      MobilePhone: "",
      Bonus: "",
      TariffID: "",
      Email: "",
      TariffName: "",
      StreetID: "",
      Ballance: "",
      Town: "",
      Floor: "",
      AccountID: "",
      Phone: "",
      Building1: "",
      Flat: "",
      Building: "",
      Overdraft: "",
      MonthStartActiveBallance: "",
      MonthStartIncludedInboundTraffic: "",
      MonthStartBonusBallance: "",
      MonthInboundTraffic: "",
      MonthOutboundTraffic: "",
      MonthCreditInboundTraffic: "",
      MonthIncludedInboundTraffic: "",
      MonthEndIncludedInboundTraffic: "",
      sub_pass: "Войти"
    });
    
    if(!/<form [^>]*name="myform">/i.test(html)){
      throw new AnyBalance.Error("Не удалось войти в личный кабинет: " + html.replace(/<[\s\S]*>/g, ''));
    }
    
    var result = {success: true};
    
    getParam(html, result, 'userName', /Уважаемый клиент\s*([^\(]*)/i, [/\s*$/, '']);
    getParam(html, result, 'account', /лицевой счет:\s*(\S*)/i, [/[.,:]+$/, '']);
    
    AnyBalance.trace('Confirming oferta');
    html = AnyBalance.requestPost(baseurl + 'index.php');
    result.__tariff = getParam(html, null, null, /Тариф:(.*?)<br/i, [/<[^>]*>/g, '', /^\s*|\s*$/g, '']);
    
    getParam(html, result, 'balance', /Баланс на данный момент:.*?>([\s\d\.,]*)</, [/^[\s\.,]*|[\s\.,]*$/g, '', /\s+/g, '', /,/g, '.'], parseFloat);
    getParam(html, result, 'bonus_balance', /Баллов на данный момент:.*?>([\s\d\.,]*)</, [/\s+/g, ''], parseInt);
    
    if(AnyBalance.isAvailable('traffic_in', 'traffic_out', 'traffic_total')){
      AnyBalance.trace('Getting traffic info');
      html = AnyBalance.requestGet(baseurl + 'traffic.php');
      
      var matches = /Месяц<\/th>.*?<td[^>]*>[^<]*<\/td><td[^>]*>([\d\.\s,]*)<\/td><td[^>]*>([\d\.\s,]*)<\/td>/i.exec(html);
      if(matches){
        var traffic_in = parseFloat(matches[1].replace(/\s+/g, '').replace(/,/g, '.'));
        var traffic_out = parseFloat(matches[2].replace(/\s+/g, '').replace(/,/g, '.'));
        if(AnyBalance.isAvailable('traffic_in'))
          result.traffic_in = Math.round(traffic_in/1024*100)/100;
        if(AnyBalance.isAvailable('traffic_out'))
          result.traffic_out = Math.round(traffic_out/1024*100)/100;
        if(AnyBalance.isAvailable('traffic_total'))
          result.traffic_total = Math.round((traffic_in + traffic_out)/1024*100)/100;
      }
    }
    
    AnyBalance.setResult(result);
}

