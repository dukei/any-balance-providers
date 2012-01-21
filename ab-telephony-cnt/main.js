 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Телефония Центральный тереграф
Сайт оператора: http://www.moscow.cnt.ru/
Сайт абонента:  http://www.cnt.ru/pcinfo.htm
Личный кабинет: http://www.cnt.ru/pcone/
*/
var kk;

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://www.cnt.ru/pcone/';
    AnyBalance.setDefaultCharset('utf-8');    
    
    // Заходим на главную страницу
    AnyBalance.setAuthentication(prefs.login,prefs.password,"");
	var info = AnyBalance.requestPost(baseurl + "app/panfc/pa334.cgi");
    
    var error;
    if(error=/Authorization Required/.exec(info)) //Неправильный логин или пароль
        throw new AnyBalance.Error("Не правильно указаны логин и/или пароль");
    
    var result = {
        success: true
    };

    var matches;
    //Тарифный план
    //if (matches=/Текущий тариф<\/td>\s<td[\s\w='-\/%]*>([\S ]+)</.exec(info)){
    //    result.__tariff=matches[1];
    //}
    

	//AnyBalance.trace(info);
    // Баланс
    if(AnyBalance.isAvailable('balance')){
        if (matches=/Баланс<\/td>\s+<[\w\s=\"#]*>[\&nbsp;]+([\s\d\.\-]+)</.exec(info)){
        	var tmpBalance=matches[1].replace(/ |\xA0/, ""); // Удаляем пробелы
            tmpBalance=tmpBalance.replace(",", "."); // Заменяем запятую на точку
            result.balance=parseFloat(tmpBalance);
        }
    }
    
    // Номер договора
    if(AnyBalance.isAvailable('agreement')){
	    if (matches=/<pre>\s*.*\s*Код\s*:\s(\d*)/.exec(info)){
	    	result.agreement=matches[1];
	    }
    }
    
    // ФИО
    if(AnyBalance.isAvailable('username')){
        if (matches=/<pre>\s*Наименование\s*:\s(.*)/i.exec(info)){
            result.username=matches[1];
        }
    }
    
    // Лицевой счет
    if(AnyBalance.isAvailable('license')){
		var licensenums = AnyBalance.requestPost(baseurl + "app/ckps.cgi");
		if(matches=/var cc = ([\d]*);/.exec(licensenums)){
			var cc = parseInt(matches[1]);
			if(matches=/var kk = (\[[\d,]*\]);/.exec(licensenums)){
				//AnyBalance.trace(matches[1]);
				kk = eval(matches[1]);
				result.license = format_cc_kk('022',cc,'');;
			}
		}
    }
	
		
    AnyBalance.setResult(result);
}

function format_cc_kk(pre,cc)
{
   var s = format_cc(pre,cc);
   s = '' + s + format_kk(s);
   return s;
   
}

function format_cc(pre,cc)
{
   var s = cc.toString();
   var n = 8 - s.length;
   while(--n > 0) s = '0'+s;
   return ''+pre+s;
}

function format_kk(s)
{
   var s1 = 0;
   var s2 = 0;
   var c;
   var i;
   for(i = 0; i<10; i++ )
   {
      c = s.charAt(i);
      var j = c - 0;
      s1 += kk[i]*j;
      s2 += kk[i]+j;
      //if(f++<10) alert(j + ' ' + s1 + ' ' + s2 + ' ' + c);
      
   }
   s1 = (s1*1)%10;
   s2 = (s2*1)%10;
   //alert('!!! + '+s1+' '+s2);
   return(s1+''+s2);
}