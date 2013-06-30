/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс на бизнес счетах Платинум Банк (Украина)

Operator site: http://www.platinumbank.com.ua
Личный кабинет: https://biznes.platinumbank.com.ua
*/

/**
 *  Получает дату из строки
 */
function parseDate(str){
    var matches = /(?:(\d+)[^\d])?(\d+)[^\d](\d{2,4})(?:[^\d](\d+):(\d+)(?::(\d+))?)?/.exec(str);
    if(matches){
          var year = +matches[3];
          var date = new Date(year < 1000 ? 2000 + year : year, matches[2]-1, +(matches[1] || 1), matches[4] || 0, matches[5] || 0, matches[6] || 0);
	  var time = date.getTime();
          //AnyBalance.trace('Parsing date ' + date + ' from value: ' + str);
          return time;
    }
    AnyBalance.trace('Failed to parse date from value: ' + str);
}
function parseDateISO(str){
    var dt = Date.parse(str);
    if(!dt){
        AnyBalance.trace('Could not parse date from ' + str);
        return;
    }else{
        AnyBalance.trace('Parsed ' + new Date(dt) + ' from ' + str);
        return dt;
    }
}

function main(){
	var result = {success: true};
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://biznes.platinumbank.com.ua/ifobsClient/"
 	var authPwd = prefs.password;
	var authLogin = prefs.login;
	if (!prefs.login || prefs.login == '')
		throw new AnyBalance.Error ('Введите № счёта');
	if (!prefs.password || prefs.password == '')
		throw new AnyBalance.Error ('Введите пароль');
	var authPwdhex = '**********';
	
	AnyBalance.trace('Base loading...');
	AnyBalance.requestGet(baseurl+'login.jsp');
	AnyBalance.requestGet(baseurl+'loginlite.jsp?locale=' + 'en&rnd=' + Math.random());
	AnyBalance.requestGet(baseurl+'loginlite.jsp');
	AnyBalance.trace('AUTHENTICATION...');
	var html= AnyBalance.requestPost(baseurl + 'loginlite.jsp', {
			user: authLogin,
			md5psw: hex_md5(authPwd),
			psw: authPwdhex,
		}
	);
	var param = html.match(/2+(?:\.[0-9]*)+(?:\.[0-9])?/i);
	if (param = "2.1.5.17.375") {
		AnyBalance.trace('Version OK...');
		var htmlframe = AnyBalance.requestGet(baseurl+'ifobstoday.jsp');
		
		//Отримуємо ім'я власника рахунку
		if(matches=htmlframe.match(/4"\sclass="content_firs_head">&nbsp;<b>(.*?)<\/b/i)){
				result.__tariff = matches[1];
		}
		//Отримуємо номер рахунку
		if(AnyBalance.isAvailable('number')){
			if(matches=htmlframe.match(/id="acc37243(.*?)\/td>/i)){
				//AnyBalance.trace(matches[1]);
				if(matches=matches[1].match((/26(\d*?)</i))){
					result.number = "26"+matches[1];
					AnyBalance.trace('Number OK...');
				}
			}
		}
		//Отримуємо баланс
		if(AnyBalance.isAvailable('balance')){
			if(matches=htmlframe.match(/id="t37243(.*?)\/td>/i)){
				//AnyBalance.trace(matches[1]);			
				if(matches=matches[1].match(/valign="top"\s*style="cursor:pointer;"><b>(.*?)\s\(/i)){
					result.balance = matches[1].replace(",","");
					AnyBalance.trace('Balance OK...');
				}
				else if (matches=matches[1].match(/valign="top"\s*style="cursor:pointer;">(.*?)\s\(/i)){
					result.balance = matches[1].replace(",","");
					AnyBalance.trace('Balance OK...');
				}
			}
		}
		//Отримуємо валюту рахунку
		if(AnyBalance.isAvailable('currency')){
			if(matches=htmlframe.match(/"top">(.*?)</i)){
				result.currency=matches[1];
				AnyBalance.trace('Currency OK...');
			}
		}
		//Отримуємо дату останнього руху на рахунку
		if(AnyBalance.isAvailable('date')){
			if(matches=htmlframe.match(/<td width="70"\s*class="accState1"\s(.*?)\/td>/i)){
				//AnyBalance.trace(matches[1]);
				if(trandate=matches[1].match((/"top"><b>(.*?)</i))){
					result.date = parseDate(trandate[1]);
					AnyBalance.trace('Date OK...');
				}
				else if(trandate=matches[1].match((/"top">(.*?)</i))){
					result.date = parseDate(trandate[1]);
					AnyBalance.trace('Date OK...');
				}
			}
		}

		AnyBalance.setResult(result);
			
	}
	else if(!AnyBalance.isSetResultCalled()) throw new AnyBalance.Error("Не удачный вход.")
}