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
    AnyBalance.setDefaultCharset('utf-8');    
    
    var regexp = /\d{10}/;
    if(regexp.exec(prefs.login)) {
    	AnyBalance.trace('Parse old cabinet...');
    	old_cabinet(prefs.login,prefs.password);
    } else {
    	AnyBalance.trace('Trying to get data from the new cabinet...');
    	new_cabinet(prefs.login,prefs.password);
    }
    
    
}

function new_cabinet(login,password) {
    
    // http://ctweb.cnt.ru/pls/rac.c/!w3_p_main.showform?CONFIG=CONTRACT&USERNAME=435024&PASSWORD=SRTvuZfnTW
    
    var baseurl = 'http://ctweb.cnt.ru/pls/rac.c/!w3_p_main.showform',auth='?CONFIG=CONTRACT&USERNAME=%%LOGIN%%&PASSWORD=%%PASSWORD%%';
    
    var session = AnyBalance.requestGet(baseurl+auth.split('%%LOGIN%%').join(login).split('%%PASSWORD%%').join(password));
    
    var result = {
        success: true
    };
    



    /*						?FORMNAME=QCURRACC&CONTR_ID=1704109&NLS=WR&SID=BE9A423FC689A183E040007F01007304
    http://ctweb.cnt.ru/pls/?FORMNAME=QTARPLAN&CONTR_ID=1704109&OBJ_ID=861761&SID=BE9A94776CF3117DE040007F010014C7&NLS=WR
    <FRAME name="menu" SRC="?FORMNAME=QMAINMENU&OPENED=R!ACC1704109!&NLS=WR&SID=BE99F438A7453C04E040007F01004975" marginwidth="5" marginheight="5" frameborder="0" noresize>
    <FRAME name="data" SRC="?FORMNAME=QCURRACC&CONTR_ID=1704109&NLS=WR&SID=BE99F438A7453C04E040007F01004975" marginwidth="5" marginheight="5" frameborder="0" noresize>
    
    <FRAME name="menu" SRC="?FORMNAME=QMAINMENU&OPENED=R!ACC1704109!&NLS=WR&SID=BE99A53497AD1962E040007F01001F1B" marginwidth="5" marginheight="5" frameborder="0" noresize>
<FRAME name="data" SRC="?FORMNAME=QCURRACC&CONTR_ID=1704109&NLS=WR&SID=BE99A53497AD1962E040007F01001F1B" marginwidth="5" marginheight="5" frameborder="0" noresize>
    
    */
    
    var data,htmlinfo,htmlmenu,htmltarif;
    if (data=/FRAME\sname="data"[\D]*SRC="([\?\S]*)"/.exec(session)) {
    	htmlinfo = AnyBalance.requestGet(baseurl+data[1]);
    }
    if (data=/FRAME\sname="menu"[\D]*SRC="([\?\S]*)"/.exec(session)) {
    	htmlmenu = AnyBalance.requestGet(baseurl+data[1]);
    }
    
	if (data=/(\?FORMNAME=[\w\&=]*)','data'\)">Тарифы/.exec(htmlmenu)) {
		htmltarif = AnyBalance.requestGet(baseurl+data[1])
	}
	// Тариф
	getParam(htmltarif, result, '__tariff', /([\dА-Яа-я ]*)<\/a><\/[><\w=\s]*<\/TR>/, null, html_entity_decode);
	
    // ФИО
	getParam (htmlinfo, result, 'username', /><TD>Клиент[:<>\w]*([А-Яа-я ]*)</i);
	   
	// Баланс
	getParam (htmlinfo, result, 'balance', />Текущий баланс[\D]*[\d{2}:]*\):[\D]*([\d\.]*)/, [/ |\xA0/, "", ",", "."], parseFloat);
	
 	// Абоненская плата
	getParam (htmltarif, result, 'monthlypay', /Абон.плата - ([\d\.]*)/, [/ |\xA0/, "", ",", "."], parseFloat);
	
	// Лицевой счет
	getParam (htmlinfo, result, 'license', /><TD[\D]*\d*>Лицевой счёт[:<>\D]*(\d{6})</);
    
    //var traffic = AnyBalance.requestGet('http://www.cnt.ru/fc/phtraf.cgi?c=showlist&p=201204');
    
    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

function getParam (html, result, param, regexp, replaces, parser) {
	if (!AnyBalance.isAvailable (param))
		return;

	var value = regexp.exec (html);
	if (value) {
		value = value[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);
		result[param] = value;
	}
}

function old_cabinet(login,password) {
    
    var baseurl = 'http://www.cnt.ru/pcone/';
    
    // Заходим на главную страницу
    AnyBalance.setAuthentication(login,password,"");
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
        if (matches=/Управляющий баланс<\/td>\s+<[\w\s=\"#]*>[\&nbsp;]+([\s\d\.\-]+)</.exec(info)){
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