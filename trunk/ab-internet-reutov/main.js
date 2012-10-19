/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для подмосковного интернет-провайдера Reutov.ru (г. Реутов)

Сайт оператора: http://reutov.ru
Личный кабинет: https://www.reutov.ru/cabinet/
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var matches = regexp.exec (html), value;
	if (matches) {
		value = matches[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
	}
   return value
}

var replaceTagsAndSpaces = [/&nbsp;/g, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseTrafficGb(str){
  var val = getParam(str.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
  return parseFloat((val/1024).toFixed(2));
}

function parseDate(str){
    var matches = /(\d+)[^\d](\d+)[^\d](\d+)/.exec(str);
    if(matches){
          var date = new Date(+matches[3], matches[2]-1, +matches[1]);
	  var time = date.getTime();
          AnyBalance.trace('Parsing date ' + date + ' from value: ' + str);
          return time;
    }
    AnyBalance.trace('Failed to parse date from value: ' + str);
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://www.reutov.ru/";

    var html = AnyBalance.requestGet(baseurl + 'proxy.php?ws_session_id=&from=reutov.ru&action=auth&login=' + prefs.login + 
           '&secret=' + MD5(prefs.login + prefs.password) + '&_=' + new Date().getTime());

    try{
	    var json = JSON.parse(html);
    }catch(e){
            AnyBalance.trace('Неверный ответ сервера: ' + html);
            throw new AnyBalance.Error('Неверный ответ сервера. Временные неполадки или сайт изменен.');
    }

    if(json.auth_result != 1)
            throw new AnyBalance.Error('Неверный логин или пароль.');

    var result = {success: true};
    
    if(AnyBalance.isAvailable('fio'))
        result.fio = json.fio;
    
    result.__tariff = json.tariff;
    
    if(AnyBalance.isAvailable('abon'))
        result.abon = parseFloat(json.tariff_price);
    
    if(AnyBalance.isAvailable('period_end'))
        result.period_end = parseDate(json.displaystopdate);

    if(AnyBalance.isAvailable('balance'))
        result.balance = parseFloat(json.balance);

    if(AnyBalance.isAvailable('status'))
        result.status = json.status == 'A' ? 'Активен' : 'Неактивен';

    if(AnyBalance.isAvailable('trafficAbon', 'trafficExtra')){
        var dtStart = new Date(parseDate(json.startdate));
        var dtEnd = new Date(parseDate(json.stopdate));
        var html = AnyBalance.requestPost(baseurl + 'proxy.php', {
            ws_session_id:json.session_id,
            from:'reutov.ru',
            action:'stat',
            year1:dtStart.getFullYear(),
            year2:dtEnd.getFullYear(),
            month1:dtStart.getMonth()+1,
            month2:dtEnd.getMonth()+1
       });
       var json = JSON.parse(html);

       if(AnyBalance.isAvailable('trafficAbon'))
           result.trafficAbon = parseTrafficGb(json.traf_quoted);
       if(AnyBalance.isAvailable('trafficExtra'))
           result.trafficExtra = parseTrafficGb(json.traf_overquoted);
    }
    
    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

