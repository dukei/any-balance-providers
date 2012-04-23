 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Домашний Интернет Домолинк
Сайт оператора: http://www.domolink.ru/
Личный кабинет: https://room.centertelecom.ru
*/
var regions = {
	msk: domolinkcenter,// Личный кабинет Московского филиала
	lpc: domolinkcenter, // Личный кабинет Липецого филиала
	klg: domolinkcenter, // Личный кабинет Калужского филиала
	blg: domolinkcenter, // Личный кабинет Белгородского филиала
	krs: domolinkcenter, // Личный кабинет Курского филиала
	tvr: domolinkcenter, // Личный кабинет Тверского филиала
	vrn: domolinkcenter, // Личный кабинет Воронежского филиала
	tula: domolinktula, // Личный кабинет абонентов Домолинк Тула
};

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

function main(){
    var prefs = AnyBalance.getPreferences();
    if(!regions[prefs.region]){
	AnyBalance.trace("Unknown region: " + prefs.region + ", setting to msk");
        prefs.region = 'msk';
		throw new AnyBalance.Error("Не верно указан регион.");
    }
	
	(regions[prefs.region])(prefs.region,prefs.login,prefs.password);
	
}

function getData(param) {
	for(var i in arr) {
		if (!arr.hasOwnProperty(i)) continue;
	}
}

function domolinktula(region,login,password) {
	var baseurl = 'https://cabinet.tulatelecom.ru';//https://cabinet.tulatelecom.ru/pls/sip/www.GetHomePage
	var regionurl = baseurl + '/pls/sip/';
    AnyBalance.setDefaultCharset('utf8');    
	
	// Заходим на главную страницу
	var html = AnyBalance.requestPost(regionurl + "www.GetHomePage", {
		p_logname: login,
		p_pwd: password
	});
	var regexp=/REFRESH CONTENT[\W]*[\d]+;\s*URL=(\/[\w\/\.]+\?(p_logname=[\w]+&p_chksum=[\d]+))/,res;
	
	if (res=regexp.exec(html)) {
		html = AnyBalance.requestGet(baseurl + res[1]);
	} else throw new AnyBalance.Error("Не верно указан логин или пароль.");
	
	var result = {success: true};
	
	var authorization=res[2].split('p_').join('');
	var curmonth = new Date(); curmonth.setDate(1); // Начало текущего месяца
	
	var urlinfo=regionurl+"www.PageViewer?page_name=S*ADM_NET_INFO&"+authorization;
	var htmlinfo = AnyBalance.requestGet(urlinfo);
	
	var urlrepcon=regionurl+"www.PageViewer?page_name=S*ADM_NET_REP_CON_BY_DAY&"+authorization+"&"+getPeriodMonth(curmonth);
	var htmlrepcon = AnyBalance.requestGet(urlrepcon);
	
    var result = {success: true};

	AnyBalance.trace("Fetching username,tarif,license,balance...");
	
	// Тариф
	getParam(htmlinfo, result, '__tariff', /Тариф[&\w;]*<\/TD>\s*<TD[\s\w=%]*>\s?(.*)/, null, html_entity_decode);

    // ФИО
	getParam (htmlinfo, result, 'username', /ФИО[&\w;]*<\/TD>\s*<TD[\s\w=%]*>\s?<INPUT[\s\w="]*(.*)/i);
	   
	// Лицевой счет
	getParam (htmlinfo, result, 'license', /Номер лицевого счета[&\w;]*<\/TD>\s*<TD[\s\w=%]*>\s?(.*)/);
	
	// Баланс
	getParam (htmlinfo, result, 'balance', /Текущее состояние лицевого счета[&\w;]*<\/TD>\s*<TD[\s\w=%]*>\s*([\d\.]*)/, [/ |\xA0/, "", ",", "."], parseFloat);
	
 	// Абоненская плата
	getParam (htmlrepcon, result, 'monthlypay', /\<TR[\s\w=\>\<\"\/]*Абонентская плата[\<\/\w\>\s=\"]*\>[\d\.]*[\<\/\w\>\s=\"шт]*\>\s*([\d\.]*)\<\/TD\>\s*\<\/TR\>/, [/ |\xA0/, "", ",", "."], parseFloat);
	
	var urlreppay=regionurl+"www.PageViewer?page_name=S*ADM_NET_REP_PAY&"+authorization;
	
    if (AnyBalance.isAvailable ('lastpaysum') ||
        AnyBalance.isAvailable ('lastpaydata')
		//|| AnyBalance.isAvailable ('lastpaydesc')
		) {

        AnyBalance.trace("Fetching payment...");

		regexp = />([\d{2}\.]+)<\/[\D<>]*([\d{2}\.]+)<\/TD>/g;
		
		var htmlpay,urlpay;
		for(var i=0; i<3; i++) { // смотрим макс. на 3 месяца назад
			urlpay = urlreppay+"&"+getPeriodMonth(curmonth);
			AnyBalance.trace("Checking "+(i+1)+"th month...");
			htmlpay = AnyBalance.requestGet(urlpay);
			if(regexp.exec(htmlpay)){
				AnyBalance.trace("... bingo! We're find the last payment.");
				htmlpay.replace(regexp, function(str, p1, p2){
					//Выбираем запись с максимальной датой
					if(result.lastpaydata == undefined || result.lastpaydata.split('.').reverse().join('') < p1.split('.').reverse().join('')){
						result.lastpaydata = p1;
						result.lastpaysum = parseFloat(p2);
						//result.lastpaydesc = '';
					}
					return str;
				});
				break;
			}
			curmonth.setMonth(curmonth.getMonth()-1);
		}
    }
    
	AnyBalance.setResult(result);
}

String.prototype.right = function(num){
  return this.substr(this.length-num,num);
}

function getPeriodParams(begin,end){
	return [
	'n1=p_start_day',	'v1='+('0'+begin.getDate()).right(2),
	'n2=p_start_month',	'v2='+('0'+(begin.getMonth()+1)).right(2),
	'n3=p_start_year',	'v3='+begin.getFullYear(),
	'n4=p_finish_day',	'v4='+('0'+end.getDate()).right(2),
	'n5=p_finish_month','v5='+('0'+(end.getMonth()+1)).right(2),
	'n6=p_finish_year',	'v6='+end.getFullYear(),
	'n7=p_page_num','v7=1',
	'n8=p_row_count','v8=100',
	'n9=p_username',
	'n10=p_logname_detail',	'v10=N',
	].join('&');
}

function getPeriodMonth(date){
	var begin = new Date(date.getFullYear(),date.getMonth(),1); // начало месяца
	var end = new Date(date.getFullYear(),date.getMonth()+1,0); // конец месяца
	return getPeriodParams(begin,end);
}

function domolinkcenter(region,login,password) {
	
	var baseurl = 'https://room.centertelecom.ru';
	var regionurl = baseurl + '/' + region + '/';
    AnyBalance.setDefaultCharset('utf8');    
	
	// Заходим на главную страницу
	var html = AnyBalance.requestPost(regionurl + "www.GetHomePage", {
		p_logname: login,
		p_pwd: password
	});
    
    var regexp=/REFRESH CONTENT[\W]*[\d]+;\s*URL=(\/[\w\/\.]+\?p_logname=[\d]+&p_chksum=[\d]+)/,res;
	
	if (res=regexp.exec(html)) {
		html = AnyBalance.requestGet(baseurl + res[1]);
	} else throw new AnyBalance.Error("Не верно указан логин или пароль.");
	
    
    var result = {success: true};

	regexp=/Тариф<\/TD>\s?<TD[\s\w=%]*>\s?(.*)/;
	if (res=regexp.exec(html)){
		result.__tariff=res[1];
	}

    // ФИО
	if(AnyBalance.isAvailable('username')) {
		regexp=/ФИО<\/TD>\s?<TD[\s\w=%]*>\s?(.*)/i;
		if (res=regexp.exec(html)){
			result.username=res[1];
		}
	}
	   
	// Лицевой счет
	getParam (html, result, 'license', /Номер лицевого счета<\/TD>\s?<TD[\s\w=%]*>\s?([\d]*)/);
	
	// Баланс
	getParam (html, result, 'balance', /Текущее состояние лицевого счета<\/TD>\s?<TD[\s\w=%]*>\s*(.*)/, [/ |\xA0/, "", ",", "."], parseFloat);
	
    if (AnyBalance.isAvailable ('lastpaysum') ||
        AnyBalance.isAvailable ('lastpaydata') ||
        AnyBalance.isAvailable ('lastpaydesc')) {

        AnyBalance.trace("Fetching payment...");

        regexp=/<A HREF="([\w=\.\?&\s]*)">\s?Платежи/;
		if (res=regexp.exec(html)) {
			
			var htmlpay = AnyBalance.requestGet(regionurl + //res[1].replace(/\n/g,""));
			res[1].split(/\n/).join('').replace(/&v(\d)=\d*/g,function(str,p1){ // fix cайта, ссылка на старый механизм, а работает уже только по новому (01.01.2012-31.12.2012)
				switch (p1) {
					case '2':return '&v2=01'; break;
					case '4':return '&v4=31'; break;
					case '5':return '&v5=12'; break;
					default:return str;
				}
			}));
			
			regexp = />([\d{2}\.]+)<\/[\D<>]*([\d{2}\.]+)<\/[\D<>]*([\d\.]+)<\/[\w><\s="]*>([А-Яа-я ]+)<\/TD>/g;
			
			htmlpay.replace(regexp, function(str, p1, p2, p3, p4){
				//Выбираем запись с максимальной датой
				if(result.lastpaydata == undefined || result.lastpaydata.split('.').reverse().join('') < p1.split('.').reverse().join('')){
					result.lastpaydata = p1;
					result.lastpaysum = parseFloat(p3);
					result.lastpaydesc = p4;
				}
				return str;
			});
		}

    }
	
    // Траффик
	if (AnyBalance.isAvailable ('traffic') ||
		AnyBalance.isAvailable ('monthlypay')) {

        AnyBalance.trace("Fetching status...");

        regexp=/<a href="([\w=\.\?&\s]*)">\s?Начисления/;
		if (res=regexp.exec(html)) {
			var htmlcalc = AnyBalance.requestGet(regionurl + res[1].replace(/\n/g,""));
			AnyBalance.trace("Fetching calculation table");
			
			// Трафик в текущем месяце
			getParam (htmlcalc, result, 'traffic', /интернет трафик[\D]*([\d.]*) Мб</, [/ |\xA0/, "", ",", "."], parseFloat);
			
			// Абоненская плата
			getParam (htmlcalc, result, 'monthlypay', /Абонентская плата[\D]*1 шт[\D]*([\d.]*)</, [/ |\xA0/, "", ",", "."], parseFloat);
		}

    }

    AnyBalance.setResult(result);
}

