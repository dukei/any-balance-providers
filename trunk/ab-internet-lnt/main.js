/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Интернет провайдер Лобненский Народный Телефон

Сайт оператора: http://www.lobn.ru
Личный кабинет: http://platex.lobn.ru
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
    var baseurl = "http://platex.lobn.ru/";
    
    AnyBalance.trace('Trying to login');
    
    var html = AnyBalance.requestPost(baseurl + "?act=login", {
      login: prefs.login,
      pass: prefs.password,
      act_: 'form_login',
      act: 'params',
      id_: 0
    });
    
    var error = getParam(html, null, null, /<div class="status error">([^<]*)<\/div>/i);
    if(error)
      throw new AnyBalance.Error(error);
    
    var result = {success: true};
    
    getParam(html, result, 'balance', /Баланс:[\s\S]*?([\d\.]+)/i, null, parseFloat);
    getParam(html, result, 'debt', /cумма обещанных платежей:[\s\S]*?([\d\.]+)/i, null, parseFloat);
    getParam(html, result, 'account', /Номер счета:[\s\S]*?(#\d+)/i);
    
    AnyBalance.trace('Trying to find tarif plan');
    
    html = AnyBalance.requestGet(baseurl + "?act=contracts");
    result.__tariff = getParam(html, null, null, /<th>Тип услуги<\/th>[\s\S]*?<tr><td[^>]*>([^<]*)/i);
    
    if(AnyBalance.isAvailable('traffic_in', 'traffic_out', 'traffic_total')){
      AnyBalance.trace('Trying to find traffic info');
      
      var dt = new Date();
      html = AnyBalance.requestPost(baseurl + "?act=inetprint", {
        day_from:1,
        month_from: dt.getMonth()+1,
        year_from: dt.getFullYear(),
        day_to: 1,
        month_to: dt.getMonth() == 11 ? 1 : dt.getMonth()+2,
        year_to: dt.getMonth() == 11 ? dt.getFullYear() + 1: dt.getFullYear(),
        show_dates:0,
        show_ips:0,
        to_mb:1,
        for_source:'',
        act_: 'form_filter',
        act: 'inetprint',
        id_:0
      });
      
      var matches = /<tr class="totals"><td[^>]*>([^<]*)<\/td><td[^>]*>([^<]*)/i.exec(html);
      if(matches){
        var traffic_in = parseFloat(matches[1].replace(/\s/g, '').replace(/,/g, '.'));
        var traffic_out = parseFloat(matches[2].replace(/\s/g, '').replace(/,/g, '.'));
        if(AnyBalance.isAvailable('traffic_in'))
          result.traffic_in = traffic_in;
        if(AnyBalance.isAvailable('traffic_out'))
          result.traffic_out = traffic_out;
        if(AnyBalance.isAvailable('traffic_total'))
          result.traffic_total = traffic_out + traffic_in;
      }
    }
    
    AnyBalance.setResult(result);
}

