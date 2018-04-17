 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Телефония Центральный тереграф
Сайт оператора: http://www.moscow.cnt.ru/
Сайт абонента:  http://www.cnt.ru/pcinfo.htm
Личный кабинет: http://www.cnt.ru/pcone/
Новый личный кабинет: http://ctweb.cnt.ru/
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

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
    var prefs = AnyBalance.getPreferences();
	
	var baseurl = 'https://lk.gobaza.ru/owa/gbaza/!w3_p_main.showform';
	var session = AnyBalance.requestGet(baseurl + '?CONFIG=CONTRACT', g_headers);
	
	var session = AnyBalance.requestPost(baseurl + '?CONFIG=CONTRACT', {
		IDENTIFICATION: 'CONTRACT',
		USERNAME: prefs.login,
		PASSWORD: prefs.password,
		FORMNAME: 'QFRAME'
	}, addHeaders({Referer: baseurl + '?CONFIG=CONTRACT'}));
	
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
	getParam(htmltarif, result, '__tariff', />\s*Текущий тарифный план[\s\S]*?<td[^>]*>([\s\S]*?)(?:<\/?t[dr])/i, replaceTagsAndSpaces);
	AnyBalance.trace(result.__tariff);
	
    // ФИО
	getParam (htmlinfo, result, 'username', />\s*Клиент:[\s\S]*?<td[^>]*>([\s\S]*?)(?:<\/?t[dr])/i, replaceTagsAndSpaces);
	   
	// Баланс
	getParam (htmlinfo, result, 'balance', />\s*Текущий баланс[\s\S]*?<td[^>]*>([\s\S]*?)(?:<\/?t[dr])/i, replaceTagsAndSpaces, parseBalance);
	
 	// Абоненская плата
	getParam (htmltarif, result, 'monthlypay', /Абон.плата - ([\d\.]*)/, replaceTagsAndSpaces, parseBalance);
	
	// Лицевой счет
	getParam (htmlinfo, result, 'license', />\s*Лицевой счёт:[\s\S]*?<td[^>]*>([\s\S]*?)(?:<\/?t[dr])/i, replaceTagsAndSpaces);
    
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

String.prototype.right = function(num){
  return this.substr(this.length-num,num);
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