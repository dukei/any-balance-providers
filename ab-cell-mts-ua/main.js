/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сотового оператора МТС (Украина). Вход через PDA-версию.

Сайт оператора: http://mts.com.ua/
Личный кабинет: https://ihelper-prp.mts.com.ua/SelfCarePda/
*/

function sumParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

        var total_value;
	html.replace(regexp, function(str, value){
		for (var i = 0; replaces && i < replaces.length; i += 2) {
			value = value.replace (replaces[i], replaces[i+1]);
		}
		if (parser)
			value = parser (value);
                if(typeof(total_value) == 'undefined')
                	total_value = value;
                else
                	total_value += value;
        });

    if(param && typeof(total_value) != 'undefined'){
      if(typeof(result[param]) == 'undefined')
      	result[param] = total_value;
      else 
      	result[param] += total_value;
    }else{
      return total_value;
    }
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s|\xA0/, "", ",", "."];

function parseBalance(text){
    var val = sumParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseTraffic(text){
    var _text = text.replace(/\s+/, '');
    var val = sumParam(_text, null, null, /(-?\d[\d\.,]*)/, replaceFloat, parseFloat);
    var units = sumParam(_text, null, null, /(kb|mb|gb|кб|мб|гб|байт|bytes)/i);
    switch(units.toLowerCase()){
      case 'bytes':
      case 'байт':
        val = Math.round(val/1024/1024*100)/100;
        break;
      case 'kb':
      case 'кб':
        val = Math.round(val/1024*100)/100;
        break;
      case 'gb':
      case 'гб':
        val = Math.round(val*1024);
        break;
    }
    var textval = ''+val;
    if(textval.length > 6)
      val = Math.round(val);
    else if(textval.length > 5)
      val = Math.round(val*10)/10;

    AnyBalance.trace('Parsing traffic (' + val + ') from: ' + text);
    return val;
}


function main(){
    var prefs = AnyBalance.getPreferences();

    if(prefs.phone && !/^\d+$/.test(prefs.phone)){
	throw new AnyBalance.Error('В качестве номера необходимо ввести 9 цифр номера, например, 251234567, или не вводить ничего, чтобы получить информацию по основному номеру.');
    }

    var baseurl = 'https://ihelper-prp.mts.com.ua/SelfCarePda/';

    AnyBalance.trace("Trying to enter selfcare at address: " + baseurl);
    var html = AnyBalance.requestPost(baseurl + "Security.mvc/LogOn", {
    	username: prefs.login,
        password: prefs.password
    });
    
    if(prefs.phone && prefs.phone != prefs.login){
        html = AnyBalance.requestGet(baseurl + "MyPhoneNumbers.mvc");
        html = AnyBalance.requestGet(baseurl + "MyPhoneNumbers.mvc/Change?phoneNumber=380"+prefs.phone);
	if(!html)
		throw new AnyBalance.Error(prefs.phone + ": номер, возможно, неправильный или у вас нет к нему доступа"); 
	var error = sumParam(html, null, null, /<ul class="operation-results-error">([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
	if(error)
		throw new AnyBalance.Error(prefs.phone + ": " + error); 
    }

    var regexp=/<ul class="operation-results-error"><li>(.*?)<\/li>/;
    if (res=regexp.exec(html)){
        throw new AnyBalance.Error(res[1]);
    }
    
    regexp=/<title>Произошла ошибка<\/title>/;
    if(regexp.exec(html)){
        throw new AnyBalance.Error("Интернет-помощник временно недоступен");
    }

    var error = sumParam(html, null, null, /<h1>\s*Ошибка\s*<\/h1>\s*<p>(.*?)<\/p>/i);
    if(error){
        throw new AnyBalance.Error(error);
    }

    var result = {success: true};

    regexp = /Security\.mvc\/LogOff/;
    if(regexp.exec(html))
    	AnyBalance.trace("It looks like we are in selfcare (found logOff)...");
    else
    	AnyBalance.trace("Have not found logOff... Wrong login and password or other error. Please contact author.");

    // Тарифный план
    regexp=/Тарифний план:.*?>(.*?)</;
    if (res=regexp.exec(html)){
        result.__tariff=res[1];
    }

    // Баланс
    sumParam (html, result, 'balance', /Баланс:.*?<strong>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, parseBalance);
    // Телефон
    sumParam (html, result, 'phone', /Ваш телефон:.*?>([^<]*)</i, replaceTagsAndSpaces, html_entity_decode);

    if (AnyBalance.isAvailable ('min_left') ||
        AnyBalance.isAvailable ('min_net') ||
        AnyBalance.isAvailable ('min_net_all') ||
        AnyBalance.isAvailable ('sms_left') ||
        AnyBalance.isAvailable ('mms_left') ||
        AnyBalance.isAvailable ('traffic_left_mb') ||
        AnyBalance.isAvailable ('license') ||
        AnyBalance.isAvailable ('bonus_balance') ||
//        AnyBalance.isAvailable ('statuslock') ||
//        AnyBalance.isAvailable ('credit') ||
        AnyBalance.isAvailable ('usedinthismonth')) {

        AnyBalance.trace("Fetching status...");

        html = AnyBalance.requestGet(baseurl + "Account.mvc/Status");

        AnyBalance.trace("Parsing status...");
    
        // 33 минуты в день для внутрисетевых звонков во всех областях: осталось 2000 бесплатных секунд
        sumParam (html, result, 'min_net_all', /для внутрисетевых звонков во всех областях:\s*осталось ([\d\.,]+) бесплатных секунд/ig, replaceFloat, parseFloat);
    
        // 70 минут в день для внутрисетевых звонков: осталось 4200 бесплатных секунд
        sumParam (html, result, 'min_net', /для внутрисетевых звонков:\s*осталось ([\d\.,]+) бесплатных секунд/ig, replaceFloat, parseFloat);
    
        // Осталось 3000 бесплатных секунд до 17.07.2012 09:16:18
        sumParam (html, result, 'min_left', /<li>осталось ([\d\.,]+) бесплатных секунд/ig, replaceFloat, parseFloat);
    
        // Остаток СМС
        sumParam (html, result, 'sms_left', / бесплатных смс[^>]*: осталось (\d+)\s*(sms|смс)/ig, null, parseInt);

        // Остаток ММС
        sumParam (html, result, 'mms_left', /Осталось:?[^<]*(\d+)[^<]*(?:mms|ммс)/i, null, parseInt);

        // Остаток трафика
        sumParam (html, result, 'traffic_left_mb', /(?:Осталось|Остаток)[^\d]*?(\d+,?\d* *(kb|mb|gb|кб|мб|гб|байт|bytes))/ig, null, parseTraffic);

        //Денежный бонусный счет: осталось 1 грн.
        sumParam (html, result, 'bonus_balance', /Денежный бонусный счет:[^<]*осталось\s*([\d\.,]+)\s*грн/i, replaceTagsAndSpaces, parseBalance);

        // Лицевой счет
        sumParam (html, result, 'license', /№ (.*?):/);

        // Расход за этот месяц
        sumParam (html, result, 'usedinthismonth', /Витрачено по номеру[^<]*<strong>([\s\S]*?)<\/strong>[^<]*грн/i, replaceTagsAndSpaces, parseBalance);
    }


    if (AnyBalance.isAvailable ('usedinprevmonth')) {

        AnyBalance.trace("Fetching history...");

        html = AnyBalance.requestPost (baseurl + 'Account.mvc/History', {periodIndex: 0});

        AnyBalance.trace("Parsing history...");

        // Расход за прошлый месяц
        sumParam (html, result, 'usedinprevmonth', /За период израсходовано .*?([\d\.,]+)/i, [",", "."], parseFloat);
    }


    if (AnyBalance.isAvailable ('monthlypay')) {

        AnyBalance.trace("Fetching traffic info...");

        html = AnyBalance.requestGet (baseurl + 'TariffChange.mvc');

        AnyBalance.trace("Parsing traffic info...");

        // Ежемесячная плата
        sumParam (html, result, 'monthlypay', /Абонентська плата:[^\d]*?([\d\.,]+)/i, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);

}

function parseTime(date){
    AnyBalance.trace("Trying to parse date from " + date);
    var dateParts = date.split(/[\.\/]/);
    var d = new Date(dateParts[2], (dateParts[1] - 1), dateParts[0]);
    return d.getTime();
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

