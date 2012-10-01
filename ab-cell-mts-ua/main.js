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
    var units = sumParam(_text, null, null, /(kб|kb|mb|gb|кб|мб|гб|байт|bytes)/i);
    switch(units.toLowerCase()){
      case 'bytes':
      case 'байт':
        val = Math.round(val/1024/1024*100)/100;
        break;
      case 'kб':
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

    if(prefs.phone && !/^\d+$/.test(prefs.phone)){
	throw new AnyBalance.Error('В качестве номера необходимо ввести 9 цифр номера, например, 501234567, или не вводить ничего, чтобы получить информацию по основному номеру.');
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

    regexp=/<TITLE>The page cannot be found<\/TITLE>/;
    if(regexp.exec(html)){
        throw new AnyBalance.Error("Интернет-помощник отсутствует по адресу " + baseurl);
    }

    var error = sumParam(html, null, null, /<h1>\s*Ошибка\s*<\/h1>\s*<p>(.*?)<\/p>/i);
    if(error){
        throw new AnyBalance.Error(error);
    }

    var result = {success: true};
    
    var min_all_60_isp;

    regexp = /Security\.mvc\/LogOff/;
    if(!regexp.test(html))
    	throw new AnyBalance.Error("Не удалось войти в мобильный интернет-помощник. Проблемы на сайте?");
    	AnyBalance.trace("It looks like we are in selfcare (found logOff)...");

    // Тарифный план
    regexp=/Тарифн[ыи]й план:.*?>(.*?)</;
    if (res=regexp.exec(html)){
        result.__tariff=res[1];
    }

    // Баланс
    sumParam (html, result, 'balance', /Баланс:.*?<strong>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, parseBalance);
    // Телефон
    sumParam (html, result, 'phone', /Ваш телефон:.*?>([^<]*)</i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.trace("Fetching status...");

    html = AnyBalance.requestGet(baseurl + "Account.mvc/Status");

    AnyBalance.trace("Parsing status...");

//Денежный бонусный счет.
    sumParam (html, result, 'bonus_balance', /<li>Денежный бонусный счет:[^<]*осталось\s*([\d\.,]+)\s*грн. Срок действия до[^<]*<\/li>/i, replaceTagsAndSpaces, parseBalance);

//Срок действия баланса
    sumParam (html, result, 'termin', /Термін життя балансу:([^<]*)/i, replaceTagsAndSpaces, parseDate); //Поместили в счетчик для возврата в AnyBalance
    var termin = sumParam (html, null, null, /Термін життя балансу:([^<]*)/i, replaceTagsAndSpaces); //Получили строку для прибавления к тарифному плану
    if(termin){
        result.__tariff = (result.__tariff || '') + ' (' + termin + ')'; //Первое слагаемое - текущий тариф или пустая строка, если там нет значения
    }

    // Пакет бесплатных минут для внутрисетевых звонков
    sumParam (html, result, 'min_paket', /<li>Осталось ([\d\.,]+) бесплатных секунд до[^<]*<\/li>/ig, replaceFloat, parseFloat);

// 70 минут в день для внутрисетевых звонков
    sumParam (html, result, 'min_net_70', /<li>70 минут в день для внутрисетевых звонков:[^<]*осталось\s*([\d\.,]+) бесплатных секунд<\/li>/ig, replaceFloat, parseFloat);

// 30 минут в день для внутрисетевых звонков
    sumParam (html, result, 'min_net_30', /<li>30 минут в день для внутрисетевых звонков:[^<]*осталось\s*([\d\.,]+) бесплатных секунд<\/li>/ig, replaceFloat, parseFloat);
    
    // 33 минуты в день для внутрисетевых звонков во всех областях
    sumParam (html, result, 'min_net_all_33', /<li>33 минуты в день для внутрисетевых звонков во всех областях:[^<]*осталось\s*([\d\.,]+) бесплатных секунд<\/li>/ig, replaceFloat, parseFloat);

    // 100 минут в день на внутрисетевое направление
    sumParam (html, result, 'min_net_100', /<li>100 минут в день на внутрисетевое направление:[^<]*осталось\s*([\d\.,]+)/ig, replaceFloat, parseFloat);
    
    // 3000 региональных минут в сети: осталось 2988 бесплатных минут
    sumParam (html, result, 'min_reg_3000', /<li>3000 региональных минут в сети:[^<]*осталось\s*([\d\.,]+)/ig, replaceFloat, function(str){return 60*parseFloat(str)});

    // Пакет СМС
    sumParam (html, result, 'sms_paket', /<li>100 бесплатных смс по Украине:[^<]*осталось\s*(\d+) смс. Срок действия до[^<]*<\/li>/ig, null, parseInt);

    // Пакет ММС
    sumParam (html, result, 'mms_paket', /<li>20 бесплатных MMS:[^<]*осталось:[^\d]*?(\d+) ммс. Срок действия до[^<]*<\/li>/ig, null, parseInt);

    // Пакет интернета
sumParam (html, result, 'traffic_paket_mb', /<li>20MB_GPRS_Internet:[^<]*осталось[^\d]*?(\d+,?\d* *(kb|mb|gb|кб|мб|гб|байт|bytes)). Срок действия до[^<]*<\/li>/ig, null, parseTraffic);

    // Интернет за копейку и другие ежедневные пакеты
sumParam (html, result, 'traffic_kop_mb', /<li>Осталось[^\d]*?(\d+,?\d* *(kb|mb|gb|кб|мб|гб|байт|bytes)).<\/li>/ig, null, parseTraffic);

    //К-во Кб загруженных по АПН hyper.net
sumParam (html, result, 'traffic_hyper_mb', /<li>К-во Кб загруженных по АПН hyper.net:[^<]*Использовано[^\d]*?(\d+,?\d* *(kb|mb|gb|кб|мб|гб|байт|bytes))<\/li>/ig, null, parseTraffic);

    //К-во Кб загруженных по АПН opera
sumParam (html, result, 'traffic_opera_mb', /<li>К-во Кб загруженных по АПН opera:[^<]*Использовано[^\d]*?(\d+,?\d* *(kb|mb|gb|кб|мб|гб|байт|bytes))<\/li>/ig, null, parseTraffic);

// Интернет Max Energy (интересно у них единица измерения прописана)
    sumParam (html, result, 'traffic_maxenergy_mb', /<li>Осталось: (\d+,?\d* *(kб|bytes)).<\/li>/ig, null, parseTraffic);

// СМС в сети МТС
sumParam (html, result, 'sms_net', /<li>Осталось (\d+) смс.<\/li>/ig, null, parseInt);

// Минуты в сети МТС
    sumParam (html, result, 'min_net_maxenergy', /<li>Осталось ([\d\.,]+) бесплатных секунд.<\/li>/ig, replaceFloat, parseFloat);

// 100 минут абонентам по Украине
    sumParam (html, result, 'min_all_100', /<li>Осталось ([\d\.,]+) секунд на все сети<\/li>/ig, replaceFloat, parseFloat);

// Минуты с услугой «Супер без пополнения» в сети МТС
    sumParam (html, result, 'min_net', /<li>Осталось ([\d\.,]+) бесплатных секунд<\/li>/ig, replaceFloat, parseFloat);

// 25 минут на другие сети
    sumParam (html, result, 'min_all_25', /<li>Осталось ([\d\.,]+) секунд на другие сети<\/li>/ig, replaceFloat, parseFloat);

    //2500 минут в сети МТС
    sumParam (html, result, 'min_net_2500', /<li>Осталось ([\d\.,]+) секунд внутри сети<\/li>/ig, replaceFloat, parseFloat);

// Бесплатные смс для отправки на номера в пределах Украины
sumParam (html, result, 'sms_100', /<li>Бесплатные смс для отправки на номера в пределах Украины:[^<]*Осталось[^\d]*?(\d+) смс. Срок действия до[^<]*<\/li>/ig, null, parseInt);

//60 минут на все сети за 5 коп
    if(AnyBalance.isAvailable('min_all_60', 'min_all_60_isp')){
        var min_all_60_isp = sumParam (html, null, null, /<li>К-во бесплатных минут для звонков по Украине:[^<]*Израсходовано[^\d]*?([\d\.,]+) сек.<\/li>/ig, replaceFloat, parseFloat);
        if(typeof(min_all_60_isp) != 'undefined'){ //Только если этот параметр найден в html
            if(AnyBalance.isAvailable('min_all_60_isp'))
                result.min_all_60_isp = min_all_60_isp;
            if(AnyBalance.isAvailable('min_all_60'))
                result.min_all_60 = 3600 - min_all_60_isp;
        }
    }

// Бесплатный интернет
sumParam (html, result, 'traffic_free_mb', /<li>К-во Кб на GPRS-Internet:[^<]*Осталось[^\d]*?(\d+,?\d* *(kb|mb|gb|кб|мб|гб|байт|bytes)).<\/li>/ig, null, parseTraffic);

    // Лицевой счет
    sumParam (html, result, 'license', /№ (.*?):/);

    // Расход за этот месяц
    sumParam (html, result, 'usedinthismonth', /Витрачено по номеру[^<]*<strong>([\s\S]*?)<\/strong>[^<]*грн/i, replaceTagsAndSpaces, parseBalance);

    

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

