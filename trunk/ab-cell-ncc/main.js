/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Провайдер NCC
Сайт оператора: http://ncc-volga.ru/
Личный кабинет (Казань): https://iserve.ncc-volga.ru/
**/

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://iserve.ncc-volga.ru/';

	AnyBalance.setDefaultCharset('koi8-r');
//	AnyBalance.setDefaultCharset('utf-8');
    
//	var info = AnyBalance.requestGet(baseurl + '?path=exit');

// Заходим на главную страницу
	AnyBalance.trace("Authorizing...");
	var info = AnyBalance.requestPost(baseurl ,{ path:'iserv',userv:prefs.userv,passv:prefs.passv});

	var error = $('#errHolder', info).text();
	if(error){
		throw new AnyBalance.Error(error);
	}

	var matches;
	if(matches = info.match(/<td align="center" valign="middle" class="red">(.*?)<\/td>/i)){
		throw new AnyBalance.Error(matches[1]);
	}

    
	var result = {success: true};
//	var balance,contract;
//    matches;



	AnyBalance.trace('Parsing...');
	if(AnyBalance.isAvailable('balance')){
		if(matches = info.match(/<td class="icons">Баланс:<\/td>\n<td class="icons">(.*?) руб.<\/td>/i)){
			result.balance = parseFloat(matches[1].replace(',','.'));

		}
		else{
			throw new AnyBalance.Error("Error");
		}
	}
	if(AnyBalance.isAvailable('bonus')){
		if(matches = info.match(/<td class="icons">Бонус:<\/td>\n<td class="icons">(.*?) руб.<\/td>/i)){
			result.bonus = parseFloat(matches[1].replace(',','.'));
		}
	}

	AnyBalance.trace("Fetching tariff...");
	info = AnyBalance.requestGet(baseurl + "?path=tarif");

	if(matches = info.match(/<td>Тариф: (.*?) <\/td>/i)){
		result.__tariff = matches[1];
	}
	AnyBalance.setResult(result);


        
//	if(!AnyBalance.isSetResultCalled()){
//		throw new AnyBalance.Error("error")
//	}
};