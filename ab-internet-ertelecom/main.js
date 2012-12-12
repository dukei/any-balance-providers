/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Провайдер ЭрТелеком 
Сайт оператора: http://citydom.ru/
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	var domain = prefs.region;

// установка региона
	if(prefs.region ==""){	// Казань по умолчанию
		domain='kzn';
	}

	AnyBalance.trace('Selected region: ' + domain);


	var baseurl = 'https://'+domain+'.db.ertelecom.ru/';
	AnyBalance.setDefaultCharset('utf-8');

//разлогиниться из кабинета 
//	var outinfo = AnyBalance.requestGet(baseurl + '');


    // Заходим на главную страницу
	AnyBalance.trace('Authorizing by ' + baseurl + "elk.php");
	var info = AnyBalance.requestPost(baseurl + "elk.php?t_m=0", {
		"log": prefs.log,
		"pwd": prefs.pwd
	});
    
        if(!/elk.php\?out=out/.test(info)){
           var error = getParam(info, null, null, /<error>([\s\S]*?)<\/error>/i, replaceTagsAndSpaces, html_entity_decode);
           if(error)
               throw new AnyBalance.Error(error);
           throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
        }
    
        var result = {success: true};

        getParam(info, result, 'balance', /На счёте:[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, parseBalance);
        getParam(info, result, 'tariff_number', /Номер договора([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(info, result, 'name', /<span[^>]+class="client-name"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(info, result, '__tariff', /Текущий тариф:[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, html_entity_decode);

        if(AnyBalance.isAvailable('bits')){
            info = AnyBalance.requestGet(baseurl + 'elk.php?t_m=6');
            getParam(info, result, 'bits', /На счёте:[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, parseBalance);
        }

	if(AnyBalance.isAvailable('last_session_end','traffic_inner','traffic_outer','contract_type')){
	    AnyBalance.trace('Getting links to statistics by ' + baseurl + 'right.php?url=&entry=procedure%3Astatistic_user_pppoe.entry');
            info = AnyBalance.requestGet(baseurl + 'right.php?url=&entry=procedure%3Astatistic_user_pppoe.entry');

            var href = getParam(info, null, null, /<frame[^>]+target="right"[^>]*src="([^"]*)/i, null, html_entity_decode);
            if(!href){
                AnyBalance.trace('Не удаётся найти промежуточную ссылку на трафик.');
            }else{
                var session = getParam(href, null, null, /(client.*)/i);
                if(!session){
                    AnyBalance.trace('Не удаётся найти информацию о сессии.');
                }else{
		    AnyBalance.trace('Getting statistics');
		    info = AnyBalance.requestGet(baseurl + 'cgi-bin/ppo/es_webface/statistic_user_pppoe.statistic_user?' + session + '&day1$c=01&day2$c=-1');
                
                    getParam(info, result, 'traffic_inner', /Наработка за период по типу трафика "ДОМашний трафик"[^<]*?:([^<]*)/i, replaceTagsAndSpaces, parseTraffic);
                    getParam(info, result, 'traffic_outer', /Наработка за период по типу трафика "Интернет трафик"[^<]*?:([^<]*)/i, replaceTagsAndSpaces, parseTraffic);
                    getParam(info, result, 'last_session_end', /<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>Интернет трафик<\/td>\s*<td[^>]*>.*?<\/td>\s*<\/tr>\s*<tr[^>]+bgcolor="red"[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
                    getParam(info, result, 'contract_type', /Ваш договор:[\s\S]*?\(([\s\S]*?)\)\s*<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
                }
            }
	}

	AnyBalance.setResult(result);
};






