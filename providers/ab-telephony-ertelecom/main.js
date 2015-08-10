/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Провайдер телефонии ЭрТелеком 
Сайт оператора: http://citydom.ru/
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	var domain = prefs.region;


	AnyBalance.trace('Selected region: ' + domain);


	var baseurl = 'http://cab.'+domain+'.citydom.ru/';
	AnyBalance.setDefaultCharset('utf-8');

//разлогиниться из кабинета 
//	var outinfo = AnyBalance.requestGet(baseurl + 'cabinetm/index.php?act=logout');


    // Авторизуемся на главной странице
	AnyBalance.trace('Authorizing to ' + baseurl + "cabinetm/");
	var info = AnyBalance.requestPost(baseurl + "cabinetm/", {
		"loginname": prefs.loginname,
		"loginpass": prefs.loginpass
	});
    
	var error = $('#errHolder', info).text();
	if(error){
		throw new AnyBalance.Error(error);
	}
    
	var result = {success: true};


	if(matches = info.match(/<p style="color: red;">(.*?)<\/p>/i)){
		throw new AnyBalance.Error(matches[1]);
	}

// запрашиваем данные и статистику
//	AnyBalance.trace('Getting data from ' + baseurl + 'cabinetm/statistics/index.php');
//	info = AnyBalance.requestGet(baseurl + 'cabinetm/statistics/index.php');

		AnyBalance.trace('Parse fields');


		if(matches = info.match(/<td id="tariff">Тарифный план:<h1>(.*?)<\/h1><\/td>/i)){
			result.__tariff = matches[1].replace(new RegExp("&.aquo;",'g'),"\"");
		}

		if(matches = info.match(/<td class="label">Баланс: <\/td>\s+<td class="money">(.*?)</i)){
			var value=matches[1].replace(',','.');value=value.replace(' ','');
			result.balance = parseFloat(value);
		}

		if(AnyBalance.isAvailable('name') && (matches = info.match(/<div id="cabInfo">\s+<h1 style="font-weight: normal;">(.*?)<\/h1>/i))){
			result.name = matches[1];
		}

		if(AnyBalance.isAvailable('tariff_number') && (matches = info.match(/<td id="telNum">Ваш номер:<h1>(\d+)<\/h1><\/td>/i))){
			result.tariff_number = matches[1];
		}

		if(AnyBalance.isAvailable('last_incoming') && (matches = info.match(/<td class="label">Входящий:<\/td>\s+<td class="callDate">(\d+)<\/td>/i))){
			result.last_incoming = matches[1];
		}

		if(AnyBalance.isAvailable('last_outgoing') && (matches = info.match(/<td class="label">Исходящий:<\/td>\s+<td class="callDate">(\d+)<\/td>/i))){
			result.last_outgoing = matches[1];
		}

//		if((matches = info.match(/<h2>Итого звонков за период:\s+<\/h2>\s+<h2>(.*?)<\/h2>/i))){
//			result.call_summary = matches[1];
//		}

	AnyBalance.setResult(result);
};






