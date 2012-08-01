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
	smolensk: domolinksmolensk // Личный кабинет абонентов Домолинк Тула
};

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value = regexp ? regexp.exec (html) : html;
	if (value) {
                if(regexp)
		    value = value[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
    else
      return value
	}
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.', /(\d)\-(\d)/g, '$1.$2'];

function parseBalance(text){
    var _text = text.replace(/\s+/g, '');
    var val = getParam(_text, null, null, /(-?\d[\d\.,\-]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    if(!regions[prefs.region]){
	AnyBalance.trace("Unknown region: " + prefs.region + ", setting to msk");
	throw new AnyBalance.Error("Не верно указан регион: " + prefs.region);
    }
	AnyBalance.trace("Entering region: " + prefs.region);
	(regions[prefs.region])(prefs.region,prefs.login,prefs.password);
	
}

function getData(param) {
	for(var i in arr) {
		if (!arr.hasOwnProperty(i)) continue;
	}
}

function domolinksmolensk(region,login,password) {
    var prefs = AnyBalance.getPreferences();
                                            
    var baseurl = 'https://portal.center.rt.ru/ClientWebPortal/appmanager/ClientPortal/PrivateClientDesktop';
        AnyBalance.setDefaultCharset('utf8');    
 
    if(prefs.accnum && !/^d{4}$/.test(prefs.accnum))
        throw new AnyBalance.Error("Введите в настройки последние 4 цифры лицевого счета или не вводите ничего, чтобы получить информацию по первому счету");

    var accnum = (prefs.accnum || '\\d{4}') + '\\s*$';
    var reAcc = new RegExp(accnum);
    
    //Логин глючит в отладчике, поэтому для отладки лучше отсюда до следующего указания закоментарить и войти вручную.

    var headers = {
      'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
      'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1',
      Connection: 'keep-alive'
    };

    AnyBalance.requestGet("http://www.smolensk.center.rt.ru/");

    var html = AnyBalance.requestGet(baseurl + "?_nfpb=true&_pageLabel=PrivateClient_portal_login_page", headers);
    var reg_form_action = getParam(html, null, null, /<form[^>]*name="selectRegionForm"[^>]*action="([^"]*)/i);
    if(!reg_form_action){
        AnyBalance.trace(html);
        throw new AnyBalance.Error("Не удаётся найти форму для выбора региона");
    }
    var param_region = getParam(html, null, null, /<input[^>]*id="selectedRegionHidden"[^>]*name="([^"]*)"/i);
    AnyBalance.trace("region params: " + param_region);
    
    headers.Referer = baseurl;
    
    AnyBalance.trace("Setting region...");
    var params = {};
    params[param_region] = "Смоленский";
    html = AnyBalance.requestPost(reg_form_action, params, headers);

    var form_action = getParam(html, null, null, /<form[^>]*name="logScope\.log_form"[^>]*action="([^"]*)/i);
    if(!form_action){
       AnyBalance.trace(html);
       throw new AnyBalance.Error("Не удаётся найти форму для входа в личный кабинет");
    }

	AnyBalance.trace("Getting login form: " + baseurl);
        var param_username = getParam(html, null, null, /<input[^>]*name="([^"]*)"[^>]*id="logScope.actionForm_username"/i);
        var param_password = getParam(html, null, null, /<input[^>]*name="([^"]*)"[^>]*id="logScope.actionForm_password"/i);
        var param_desktop = getParam(html, null, null, /<input[^>]*id="logScope.actionForm_desktop"[^>]*name="([^"]*)"/i);
        AnyBalance.trace("login params: " + param_username + ", " + param_password + ", " + param_desktop);

	// Заходим на главную страницу
        var params = {};
        params[param_username] = prefs.login;
        params[param_password] = prefs.password;
        params[param_desktop] = 'PrivateClient_portal_main_page';

    AnyBalance.trace("Entering client portal: " + form_action);
    html = AnyBalance.requestPost(form_action, params, headers);
	
        var error = getParam(html, null, null, /(<[^>]*txtRed[^>]*>[\s\S]*?<)/i);///<span[^>]*class="txtRed"[^>]*>([\S\s]*?)<\/span>/i);
        if(error){
            AnyBalance.trace(html);
            throw new AnyBalance.Error(error);
        }

        if(/name="logScope.log_form"/i.test(html)){
            AnyBalance.trace(html);
            throw new AnyBalance.Error("Не удалось войти в личный кабинет. Изменился личный кабинет или проблемы на сайте.");
        }

    //Вот досюда надо закомментарить, чтобы отладчиком воспользоваться.


/* //С главной страницы не удаётся получить нормально инфу, потому что ростелеком настолько угробищно её выдаёт. Оторвать бы им руки...
	html = AnyBalance.requestGet(baseurl + "?_nfpb=true&_pageLabel=PrivateClient_portal_myPortal_book");
        
	var $html = $(html);
        var $acc = $html.find('#t_BankBooksWidget_1_ajax .wlp-bighorn-window-content div.txtBlack').filter(function(){
            var num = $(this).children('td:nth-child(2)').text();
            return reAcc.test(num);
        }).first();

        if(!$acc.size())
            throw new AnyBalance.Error('Невозможно найти информацию ' + (prefs.accnum ? 'по счету с последними цифрами ' + prefs.accnum : 'ни по одному лицевому счету') + '!');

        getParam($acc.find('a[href*="_number="]').text(), result, 'license', null, replaceTagsAndSpaces);
        var link_icon = $acc.find('img[src*="-link-icon.png"]').first().attr('src');
        if(link_icon){
            var service = getParam(link_icon, null, null, /(\w+)-link-icon\.png/i);
            if(service){
                result.__tariff = g_services[service] || service;
            }
        }

        getParam($acc.find('font[color="green"], font[color="red"]').text(), result, 'balance', null, replaceTagsAndSpaces, parseBalance);
        getParam($acc.find('.txtGray').text(), result, 'username', null, replaceTagsAndSpaces);
*/
	
	AnyBalance.trace("Requesting accounts info...");
	html = AnyBalance.requestGet(baseurl + "?_nfpb=true&_pageLabel=PrivateClient_portal_Services_page");
        
	AnyBalance.trace(html);
        var $html = $(html);

        var $acc = $html.find('.gridTableContainer table tr').filter(function(i){
            var num = $(this).find('a[href*="_number="]').first().text();
            return reAcc.test(num);
        }).first();

        if(!$acc.size())
            throw new AnyBalance.Error('Невозможно найти информацию ' + (prefs.accnum ? 'по счету с последними цифрами ' + prefs.accnum : 'ни по одному лицевому счету') + '!');

	var result = {success: true};

        getParam($acc.find('>td:first-child>img').attr('title'), result, '__tariff', null, replaceTagsAndSpaces);
        getParam($acc.find('>td:nth-child(2)').text(), result, 'license', null, replaceTagsAndSpaces);
        getParam($acc.find('>td:nth-child(3)').text(), result, 'username', null, replaceTagsAndSpaces);
        getParam($acc.find('>td:nth-child(4)').text(), result, 'balance', null, replaceTagsAndSpaces, parseBalance);

        var $subaccs = $acc.next();
        getParam($subaccs.find('table.uslugi tr:first-child td:nth-child(3) label').first().text(), result, '__tariff', null, replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}

function domolinktula(region,login,password) {
	var baseurl = 'https://cabinet.tulatelecom.ru';
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
    
    var regexp=/BGCOLOR="RED">[\D]*HEIGHT=100[\D]*>\s*([\S ]*)/,res;
	
	if (res=regexp.exec(html)) 
		throw new AnyBalance.Error(res[1]);
	
    
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

