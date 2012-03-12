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
	var info = AnyBalance.requestPost(baseurl + "elk.php", {
		"log": prefs.log,
		"pwd": prefs.pwd
	});
    
	var error = $('#errHolder', info).text();
	if(error){
		throw new AnyBalance.Error(error);
	}
    
	var result = {success: true};
	if(matches = info.match(/<error>\n(.*?)\n<\/error>/i)){
		throw new AnyBalance.Error(matches[1]);
	}

	if(AnyBalance.isAvailable('status')){
		if(matches = info.match(/title="Статус: (.*?)">/i)){
			AnyBalance.trace('Parse status');
			result.status = matches[1];
		}
	}

	AnyBalance.trace('Getting links by ' + baseurl + 'right.php?url=&entry=procedure%3Astatistic_user_pppoe.entry');
	info = AnyBalance.requestGet(baseurl + 'right.php?url=&entry=procedure%3Astatistic_user_pppoe.entry');

	var pattern=new RegExp("<frame .*? src=\"https:\/\/"+domain+"\\.db\\.ertelecom\\.ru\/cgi-bin\/ppo\/es_webface\/statistic_user_pppoe\\.get_date_show_statistic\\?client\\$c=.*?\\&id_session\\$c=(.*?)\">","i");
	if(matches = info.match(pattern)){
		var id_session=matches[1];

		AnyBalance.trace('Getting statistics');
		info = AnyBalance.requestGet(baseurl + 'cgi-bin/ppo/es_webface/statistic_user_pppoe.statistic_user?client$c='+prefs.log+'&id_session$c='+id_session+'&day1$c=01&day2$c=-1');

		AnyBalance.trace('Parse fields');
		if(matches = info.match(/Здравствуйте, (.*?)\n/i)){

			result.name = matches[1];

			matches = info.match(/Ваш договор: <b>(.*?) \((.*?)\)<\/b>/i);
			result.__tariff = matches[1];
			result.tariff_number = matches[1];
			result.contract_type = matches[2];

			matches = info.match(/Ваш баланс на .*? составляет <b>(.*?) рублей\n<\/b>/i);
			var value=matches[1].replace(',','.');value=value.replace(' ','');
			result.balance = parseFloat(value);

			if(AnyBalance.isAvailable('traffic_inner')){
				if(matches = info.match(/<td colspan="30"><font color="yellow"><b>.*?"ДОМашний".*?: (.*?) Мб<\/b><\/font><\/td>/i)){
					value=matches[1].replace(',','.');value=value.replace(' ','');
					result.traffic_inner = parseFloat(value);
				}
			}

			if(AnyBalance.isAvailable('traffic_outer')){
				if(matches = info.match(/<td colspan="30"><font color="yellow"><b>.*?"Интернет трафик".*?: (.*?) Мб <\/b><\/font><\/td>/i)){
					value=matches[1].replace(',','.');value=value.replace(' ','');
					result.traffic_outer = parseFloat(value);
				}
			}

			if(AnyBalance.isAvailable('last_session_end')){
				if(matches = info.match(/<td>(.*?)<\/td>\n<td>Интернет трафик<\/td>\n<td align="right">.*?<\/td>\n<\/tr>\n<tr bgcolor="red">/i)){
					result.last_session_end = matches[1];
				}
			}

			if(matches = info.match(/Основной тариф: (.*?)</i)){
				result.__tariff = matches[1];
			}

			AnyBalance.trace('WARNING! Statistics for current connection hasn\'t been showed.');

		}
		else{
			if(matches = info.match(/<td class="info_win">(.*?)<br><br>/i)){
				var errs=matches[1];
				errs=errs.replace(new RegExp("<.*?>",'g')," ");
				AnyBalance.trace(errs);
				throw new AnyBalance.Error(errs);
			}
			else{
				throw new AnyBalance.Error("Error getting statistics");
			}
		}
	}

	else{
		if(matches = info.match(/<td class="info_win">(.*?)<br><br>/i)){
			var errs=matches[1];
			errs=errs.replace(new RegExp("<.*?>",'g')," ");
			AnyBalance.trace(errs);
			throw new AnyBalance.Error(errs);
		}
		else{
			throw new AnyBalance.Error("Error");
		}
	}

	AnyBalance.setResult(result);
};






