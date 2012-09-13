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

	AnyBalance.trace("Fetching tariff...");
	info = AnyBalance.requestGet(baseurl + "?path=tarif");

/*	if(prefs.region == "1"){	// Татарстан
		if(matches = info.match(/Тариф: (.*?)</)){
			result.__tariff = matches[1];
		}
	}
	else if(prefs.region == "2"){	// Нижегородский
		if(matches = info.match(/Тариф: (.*?)</)){
			result.__tariff = matches[1];
		}
	}
*/
/*	if(prefs.region == "1"){	// Татарстан
		AnyBalance.trace("Fetching tariff...");
		info = AnyBalance.requestGet(baseurl + "?path=tarif");
		if(matches = info.match(/Тариф: (.*?)</)){
			result.__tariff = matches[1];
		}
	}
	else if(prefs.region == "2"){	// Нижегородский */
{
		AnyBalance.trace("Fetching all bills info...");
		info = AnyBalance.requestGet(baseurl + "?path=allbills");
		if(matches = info.match(/Тарифный план<\/th>[\s\S]*?<td[\s\S]*?<\/td>[\s\S]*?<td[\s\S]*?<\/td>[\s\S]*?<td.*?>(?:\s*)(.*?)<\/td>/)){
			result.__tariff = matches[1];
		}

		if(matches = info.match(/Трафик за текущий месяц[\s\S]*?Использовано[\s\S]*?<td.*?>(?:\s*)(.*?)<\/td>[\s\S]*?<td.*?>(?:\s*)(.*?) Кбайт<\/td>[\s\S]*?<td.*?>(?:\s*)(.*?)<\/td>[\s\S]*?<td.*?>(?:\s*)(.*?) Кбайт<\/td>[\s\S]*?<td.*?>(?:\s*)(.*?)<\/td>[\s\S]*?<td.*?>(?:\s*)(.*?) Кбайт<\/td>/)){
			type1 = matches[1].toLowerCase();
			type2 = matches[3].toLowerCase();
			type3 = matches[5].toLowerCase();
			traf1 = parseFloat(matches[2].replace(',','.'))/1024;
			traf2 = parseFloat(matches[4].replace(',','.'))/1024;
			traf3 = parseFloat(matches[6].replace(',','.'))/1024;
			
			if(type1.indexOf("internet")>=0)
				result.traf1 = traf1.toFixed(3);
			else
			if(type1.indexOf("wi-fi")>=0)
				result.traf2 = traf1.toFixed(3);
			else
			if(type1.indexOf("wap")>=0)
				result.traf3 = traf1.toFixed(3);

			if(type2.indexOf("internet")>=0)
				result.traf1 = traf2.toFixed(3);
			else
			if(type2.indexOf("wi-fi")>=0)
				result.traf2 = traf2.toFixed(3);
			else
			if(type2.indexOf("wap")>=0)
				result.traf3 = traf2.toFixed(3);

			if(type3.indexOf("internet")>=0)
				result.traf1 = traf3.toFixed(3);
			else
			if(type3.indexOf("wi-fi")>=0)
				result.traf2 = traf3.toFixed(3);
			else
			if(type3.indexOf("wap")>=0)
				result.traf3 = traf3.toFixed(3);

			result.trafic = (traf1 + traf2 + traf3).toFixed(3);
		}
	}



	AnyBalance.setResult(result);


//	if(!AnyBalance.isSetResultCalled()){
//		throw new AnyBalance.Error("error")
//	}
};