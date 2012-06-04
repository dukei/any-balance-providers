 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Телефония Центральный тереграф
Сайт оператора: http://www.moscow.cnt.ru/
Сайт абонента:  http://www.cnt.ru/pcinfo.htm
Личный кабинет: http://www.cnt.ru/pcone/
Новый личный кабинет: http://ctweb.cnt.ru/
*/

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
	
	var baseurl = 'http://ctweb.cnt.ru/pls/rac.c/!w3_p_main.showform',auth='?CONFIG=CONTRACT&USERNAME=%%LOGIN%%&PASSWORD=%%PASSWORD%%';
	
	var session = AnyBalance.requestGet(baseurl+auth.split('%%LOGIN%%').join(login).split('%%PASSWORD%%').join(password));
	
	var error;
	if(error=/alert\s*\("([\D]*)"\)/.exec(session)) // Ошибка авторизации
		throw new AnyBalance.Error(error[1]);
	
	var result = {
        success: true
    };
    
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
	//getParam(htmltarif, result, '__tariff', /([\dА-Яа-я ]*)<\/a><\/[><\w=\s]*<\/TR>/);//, null, html_entity_decode);
	getParam(htmltarif, result, '__tariff', /\>([^\>]*)\<\/a\>\<\/[\>\<\w\=\s]*<\/TR\>/);//, null, html_entity_decode);
	AnyBalance.trace(result.__tariff);
	
    // ФИО
	getParam (htmlinfo, result, 'username', /><TD>Клиент[:<>\w]*([А-Яа-я ]*)</i);
	   
	// Баланс
	getParam (htmlinfo, result, 'balance', />Текущий баланс[\D]*[\d{2}:]*\):[\D]*>([-\d\.]*)/, [/ |\xA0/, "", ",", "."], parseFloat);
	
 	// Абоненская плата
	getParam (htmltarif, result, 'monthlypay', /Абон.плата - ([\d\.]*)/, [/ |\xA0/, "", ",", "."], parseFloat);
	
	// Лицевой счет
	getParam (htmlinfo, result, 'license', /><TD[\D]*\d*>Лицевой счёт[:<>\D]*(\d{6})</);
    
	// Аутентификация в старом портале
	AnyBalance.trace('AUTHENTICATION');
	if (data=/(\?[\w=&]*)','[\w'\)">]*Дополнительно/.exec(htmlmenu)) {
    	var htmlauth = AnyBalance.requestGet(baseurl+data[1]);
		
		var dataauth;
		if (dataauth=/location=\s*"([\w:\/\.\?=]*)/.exec(htmlauth)) {
			AnyBalance.trace("... authentication forwarding");
			var htmlfw = AnyBalance.requestGet(dataauth[1],
				{
					'Referer': baseurl+data[1],
					'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				}
			);
		}
	}
	
    // Данные по телефонному трафику
    getTrafficData(result,'http://www.cnt.ru/fc/phtraf.cgi?c=showlist&p=%%PERIOD%%');
	
	AnyBalance.setResult(result);
}

Array.prototype.summ = function(index) {
	var result = 0;
	for(var i=0; i<this.length; i++){
		result=result+this[i][index];
	}
	return result;
}

Array.prototype.copy = function(index,where) {
	var result = new Array(),y=0;
	for(var i=0; i<this.length; i++){
		if(this[i][index]==where) {
			result[y]=this[i];
			y++;
		}
	}
	return result;
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

String.prototype.right = function(num){
  return this.substr(this.length-num,num);
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

function getTrafficData(result, url) {
	
	if (!AnyBalance.isAvailable ('traffic') && !AnyBalance.isAvailable ('trafficcost'))
		return;
	
    var now = new Date(),ttab = new Array(),res,regexp;
    var traffic = AnyBalance.requestGet(url.split('%%PERIOD%%').join(''+now.getFullYear()+('0'+(now.getMonth()+1)).right(2)));
    regexp = />(\d*)<td>([\d{2}\.]+) ([\d{2}:]+)[\D]*([\d]*)<td>([А-Я]+)<[\D]+([\d\.]+)<td>([А-Я]+)<[\D]+([\d\.]+)<td[\D]+([\d\.]+)<td>([\d]*)/g;
    
    var i=0;
    while (res = regexp.exec(traffic)) {
    	ttab[i] = [
    		Date.parse(res[2].replace(/(\d{2})\.(\d{2})\.(\d{4})/g,"$3-$2-$1")+'T'+res[3]),
    		res[4],
    		res[5],
    		parseFloat(res[6]),
    		res[7],
    		parseFloat(res[8]),
    		parseFloat(res[9]),
    		res[10]
    	];
    	i++;
    }
    
    result['traffic'] = ttab.summ(3);
    result['trafficcost'] = parseFloat(ttab.summ(6).toFixed(2));
    
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

    // ФИО
	getParam (info, result, 'username', /<pre>\s*Наименование\s*:\s(.*)/i);
	   
	// Баланс
	getParam (info, result, 'balance', /Управляющий баланс<\/td>\s+<[\w\s=\"#]*>[\&nbsp;]+([\s\d\.\-]+)</, [/ |\xA0/, "", ",", "."], parseFloat);
	
	// Лицевой счет
	getParam (info, result, 'license', /<pre>\s*.*\s*Код\s*:\s(\d*)/);
	
	// Данные по телефонному трафику
    getTrafficData(result,'http://www.cnt.ru/pcone/app/phtraf.cgi?c=showlist&p=%%PERIOD%%');
    		
    AnyBalance.setResult(result);
}

var kk;

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