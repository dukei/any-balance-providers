 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Домашний Интернет Домолинк
Сайт оператора: http://www.domolink.ru/
Личный кабинет: https://room.centertelecom.ru
*/
var regions = {
	msk:"/msk/www.PageViewer?page_name=S*START_PAGE", // Личный кабинет Московского филиала
	lpc:"/lpc/www.PageViewer?page_name=S*START_PAGE", // Личный кабинет Липецого филиала
	klg:"/klg/www.PageViewer?page_name=S*START_PAGE", // Личный кабинет Калужского филиала
	blg:"/blg/www.PageViewer?page_name=S*START_PAGE", // Личный кабинет Белгородского филиала
	krs:"/krs/www.PageViewer?page_name=S*START_PAGE", // Личный кабинет Курского филиала
	tvr:"/tvr/www.PageViewer?page_name=S*START_PAGE", // Личный кабинет Тверского филиала
	vrn:"/vrn/www.PageViewer?page_name=S*START_PAGE" // Личный кабинет Воронежского филиала
};

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
	
	var baseurl = 'https://room.centertelecom.ru';
	var regionurl = baseurl + '/' + prefs.region + '/';
    AnyBalance.setDefaultCharset('utf8');    
	
	// Заходим на главную страницу
	var html = AnyBalance.requestPost(regionurl + "www.GetHomePage", {
		p_logname: prefs.login,
		p_pwd: prefs.password
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
			
			var htmlpay = AnyBalance.requestGet(regionurl + res[1].replace(/\n/g,""));
			
			regexp = />([\d{2}\.]+)<\/[\D<>]*([\d{2}\.]+)<\/[\D<>]*([\d\.]+)<\/[\w><\s="]*>([А-Яа-я ]+)<\/TD>[\s ]*<\/TR>[\s]?<\/TBODY>/;
			if (res=regexp.exec(htmlpay)) {
				result.lastpaydata = res[1];
				result.lastpaysum = parseFloat(res[3]);
				result.lastpaydesc = res[4];
				
			}
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

