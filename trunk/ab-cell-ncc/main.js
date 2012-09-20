/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Провайдер NCC (Республика Татарстан, Нижегородский филиал)
Сайт оператора: http://ncc-volga.ru/
Личный кабинет: https://iserve.ncc-volga.ru/
**/

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://iserve.ncc-volga.ru/';

	AnyBalance.setDefaultCharset('koi8-r');
    
//	var info = AnyBalance.requestGet(baseurl + '?path=exit');

// Заходим на главную страницу
	AnyBalance.trace("Authorizing...");
	var info = AnyBalance.requestPost(baseurl ,{ path:'iserv',userv:prefs.userv,passv:prefs.passv});

	var error = $('#errHolder', info).text();
	if(error){
		throw new AnyBalance.Error(error);
	}

	if(matches = info.match(/<td align="center" valign="middle" class="red">(.*?)<\/td>/i)){
		throw new AnyBalance.Error(matches[1]);
	}

	var result = {success: true};

	AnyBalance.trace('Parsing...');
	if(prefs.region == "1"){	// Татарстан
		if(AnyBalance.isAvailable('balance')){
			if(matches = info.match(/<dd.*?>Баланс:<\/dd>\s*<dd.*?>(.*?) руб.<\/dd>/i)){
				result.balance = parseFloat(matches[1].replace(',','.'));
			}
			else{
				throw new AnyBalance.Error("Error");
			}
		}
		if(AnyBalance.isAvailable('bonus')){
			if(matches = info.match(/<dd.*?>Бонус:<\/dd>\s*<dd.*?>(.*?) руб.<\/dd>/i)){
				result.bonus = parseFloat(matches[1].replace(',','.'));
			}
		}
	}
	else if(prefs.region == "2"){	// Нижегородский
		if(AnyBalance.isAvailable('balance')){
			if(matches = info.match(/<dd.*?>Баланс:<\/dd><dd.*?>(.*?) руб.<\/dd><\/dl>/i)){
				result.balance = parseFloat(matches[1].replace(',','.'));
			}
			else{
				throw new AnyBalance.Error("Error");
			}
		}
		if(AnyBalance.isAvailable('bonus')){
			if(matches = info.match(/<dd.*?>Бонус:<\/dd><dd.*?>(.*?) руб.<\/dd>/i)){
				result.bonus = parseFloat(matches[1].replace(',','.'));
			}
		}
	}

	AnyBalance.trace("Fetching all bills info...");
	info = AnyBalance.requestGet(baseurl + "?path=allbills");
	if(matches = info.match(/Тарифный план<\/th>[\s\S]*?<td[\s\S]*?<\/td>[\s\S]*?<td[\s\S]*?<\/td>[\s\S]*?<td.*?>(?:\s*)(.*?)<\/td>/)){
		result.__tariff = matches[1];
	}

	if(AnyBalance.isAvailable('trafic', 'traf1', 'traf2', 'traf3')){
                if(matches = info.match(/Трафик за текущий месяц[\s\S]*?Использовано([\s\S]*?)<\/table>/)){
		
			AnyBalance.trace("Fetching trafic info...");
			var trafinfo = matches[1];

	                if(matches = trafinfo.match(/<tr>([\s\S]*?)<\/tr>/g)){
				/* всё равно закомментарено в манифесте 
				result.traf1 = 0;
				result.traf2 = 0;
				result.traf3 = 0;
				*/
				var globaltraf = 0;

				for (i=0; i<matches.length; i++){
	                		if(matches_line = matches[i].match(/<td.*?>(?:\s*)(.*?)<\/td>[\s\S]*?<td.*?>(?:\s*)(.*?) Кбайт<\/td>/)){
						type = matches_line[1].toLowerCase();
						var traf = parseFloat(matches_line[2].replace(',','.'))/1024;

						/* всё равно закомментарено в манифесте 
						if(type.indexOf("internet")>=0)
							result.traf1 = result.traf1 + traf;
						else
						if(type.indexOf("wi-fi")>=0)
							result.traf2 = result.traf2 + traf;
						else
						if(type.indexOf("wap")>=0)
							result.traf3 = result.traf3 + traf;
				                */
						globaltraf = globaltraf + traf;

					}
				}

				/* всё равно закомментарено в манифесте 
				result.traf1 = result.traf1.toFixed(3);
				result.traf2 = result.traf2.toFixed(3);
				result.traf3 = result.traf3.toFixed(3);
		                */
 				if(AnyBalance.isAvailable('trafic'))
					result.trafic = globaltraf.toFixed(3);
			}
		}
        }



	AnyBalance.setResult(result);


//	if(!AnyBalance.isSetResultCalled()){
//		throw new AnyBalance.Error("error")
//	}
};