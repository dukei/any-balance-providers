/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у оператора Utel.
Utel — это бренд, под которым предоставляются услуги местной, внутризоновой, междугородной и международной связи, 
мобильной и спутниковой связи, широкополосного доступа в Интернет, кабельного и интерактивного телевидения.

Сайт оператора: http://www.u-tel.ru/
Личный кабинет: https://ucabinet.u-tel.ru/
*/

function main(){
    throw new AnyBalance.Error("С 12.02.13 старый кабинет Uкабинет закрыт и этот провайдер перестал работать! Вам необходимо воспользоваться провайдером для единого личного кабинета Ростелеком \"Ростелеком (Единый кабинет)\".");
    
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://ucabinet.u-tel.ru/";

    if(prefs.phone && !/^\d+$/.test(prefs.phone)){
	throw new AnyBalance.Error('В качестве номера необходимо ввести все цифры номера, например, 79501234567, или не вводить ничего, чтобы получить информацию по первому номеру.');
    }

    AnyBalance.setDefaultCharset('windows-1251');

    AnyBalance.trace("Trying to enter selfcare at address: " + baseurl);
    var htmlMain = AnyBalance.requestPost(baseurl, {
      LOGIN: prefs.login,
      PASSWORD: prefs.password
    }); //{"X-Requested-With": "XMLHttpRequest"}
    
    var error = getParam(htmlMain, null, null, /<h1 class="red">([^<]*)<\/h1>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
      throw new AnyBalance.Error(error);
    
    htmlMain = AnyBalance.requestGet(baseurl);
    var sessionid = getParam(htmlMain, null, null, /sessionid:\s*['"]([^'"]*)['"]/);
    if(!sessionid)
      throw new AnyBalance.Error("Could not find session id!");

    var result = {success: true};

    for(var i=0; i<4; ++i){
        if(i > 0 && !prefs['phone' + i])
            continue;
       
        var svc = 0;
        var phone = i==0 ? prefs.phone : prefs['phone' + i];
        if(i>0 || phone){
            var rePhone = new RegExp('info&svc=(\\d+)"><strong>' + phone + '<', 'i');
            svc = getParam(htmlMain, null, null, rePhone);
            if(!svc)
	        throw new AnyBalance.Error('Не получается найти номер ' + phone + ' в личном кабинете!');
        }
        
        var html = AnyBalance.requestPost(baseurl + "pages/getinfofornumberfirst.jsp", {
          svc: svc,
          sessionid: sessionid
        }); //{"X-Requested-With": "XMLHttpRequest"}
        
        if(/<p>Биллинг недоступен/.test(html))
            throw new AnyBalance.Error('Биллинг временно недоступен.');

        var suffix = i > 0 ? i : '';
        
        getParam(html, result, 'balance'+suffix, /var\s*balData\s*=\s*parseFloat\('([\-\d\.]+)'\)/, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'userName'+suffix, /Абонент:[\s\S]*?>(.*?)</);
        getParam(html, result, 'status'+suffix, /Признак активности:[\s\S]*?>(.*?)</);
        getParam(html, result, 'phone'+suffix, /infofornumber_([^"']*)/);
	getParam(html, result, 'tariff'+suffix, /Тарифный план:[\s\S]*?>(.*?)</);
        if(i == 0)
	    getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?>(.*?)</);
        
        if(AnyBalance.isAvailable('bonus'+suffix)){
            var html = AnyBalance.requestPost(baseurl + "pages/gsminfo_ajax.jsp", {
              a: 'bonus_programm',
              svc: svc
            }); //{"X-Requested-With": "XMLHttpRequest"}
        
            getParam(html, result, 'bonus'+suffix, /Текущий баланс[\s\S]*?>\s*(-?\d[\d\.,\s]*)</i, replaceTagsAndSpaces, parseBalance);
        }

        if(AnyBalance.isAvailable('gprs'+suffix, 'sms'+suffix, 'mms'+suffix, 'min'+suffix)){
            var html = AnyBalance.requestGet(baseurl + "?a=bonuspackages&svc=" + svc); //{"X-Requested-With": "XMLHttpRequest"}
            var table = getParam(html, null, null, /<table[^>]+class="payment[^>]*>\s*<tr[^>]*>(?:[\s\S](?!<\/table>))*?<\/tr>([\s\S]*?)<\/table>/i);
            if(!table)
                AnyBalance.trace('Не удаётся найти таблицу подключенных пакетов вознаграждений');
            else{
                var rows = sumParam(table, null, null, /<tr[^>]*>([\s\S]*?)<\/tr>/ig);
                for(var i=0; i<rows.length; ++i){
                    var row = rows[i];
                    sumParam(row, result, 'sms'+suffix, /(?:[\s\S]*?<td[^>]*>){4}\s*(\d+)\s*SMS/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                    sumParam(row, result, 'mms'+suffix, /(?:[\s\S]*?<td[^>]*>){4}\s*(\d+)\s*MMS/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                    sumParam(row, result, 'min'+suffix, /(?:[\s\S]*?<td[^>]*>){4}\s*(\d+)\s*мин/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                    sumParam(row, result, 'gprs'+suffix, /(?:[\s\S]*?<td[^>]*>){4}\s*([\d.,]+)\s*(?:[мmkкгg][бb]|байт|bytes)/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                }
            }
        }
        
        if(AnyBalance.isAvailable('gprs'+suffix)){
            var html = AnyBalance.requestPost(baseurl + "pages/gsminfo_ajax.jsp", {
              a: 'block_packets',
              svc: svc
            }); //{"X-Requested-With": "XMLHttpRequest"}
        
            sumParam(html, result, 'gprs'+suffix, /<input[^>]*id="pack_INETBLOCK[^>]*checked[^>]*>[\s\S]*?Остаток\s*:\s*([^<]*)/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
        }
    }

    AnyBalance.setResult(result);
}
