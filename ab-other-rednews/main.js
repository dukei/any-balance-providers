/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var d = new Date()
var n = 0-d.getTimezoneOffset()/60;

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
	'Cookie': 'ffdstonoff=1; fftimezoneoffset='+n+'; fftimeformat=1; ffverifytimes=1; fflastactivity=0;',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl;
	var in_language,in_currency;
	if(prefs.source==2){//Investing.com
		in_currency=prefs.in_currency || 5;
		in_language=prefs.in_language || 1;
		var baseurl = 'http://ec.forexprostools.com/';
	}else{//ForexFactory
		var baseurl = 'http://www.forexfactory.com/';
	}
	AnyBalance.setDefaultCharset('utf-8');
	
//	checkEmpty(prefs.login, 'Введите логин!');
//	checkEmpty(prefs.password, 'Введите пароль!');
	var current_date=new Date();
	var item_date=new Date();
	var locale_date=new Date();
	var html;
	
	if(prefs.source==2){//Investing.com
		html = AnyBalance.requestGet(baseurl + '?columns=exc_currency,exc_importance,exc_actual,exc_forecast&category=_employment,_economicActivity,_inflation,_credit,_centralBanks,_confidenceIndex,_balance,_Bonds&importance=3&features=&countries='+in_currency+'&calType=week&timeZone=55&lang='+in_language, g_headers);
	}else{//ForexFactory
		html = AnyBalance.requestGet(baseurl + 'calendar.php', g_headers);
	}
	
	var result = {success: true};

	result.__tariff=prefs.currency;
//	result.mark="high";
	result.description="<No red news this week>";
	result.actual="-";
	result.forecast="-";
	result.date="-";
	result.time="-";

//	current_date.setTime(current_date.getTime()+current_date.getTimezoneOffset()*60*1000);



	if(prefs.source==2){//Investing.com
		if(/catch(err)/i.test(html)) {
			throw new AnyBalance.Error('Incorrect request.');
		}

		var regexp1 = /<tr id="eventRowId.*?event_timestamp="(.*?)"[\s\S]*?\/tr>/g;
		while((r = regexp1.exec(html)) != null) {
			item_date=new Date(r[1]);
			item_date.setTime(item_date.getTime()-current_date.getTimezoneOffset()*60*1000);

			if(item_date<current_date)continue;

			result.__tariff=getParam(r[0], null, null, /<td class="flagCur">(.*?)</i, replaceTagsAndSpaces, html_entity_decode);
			result.time=item_date.toLocaleTimeString();
			getParam(r[0], result, 'description', /<td class="left event">(.*?)</i, replaceTagsAndSpaces, html_entity_decode);
			getParam(r[0], result, 'actual', /id="eventActual_.*?">(.*?)</i, replaceTagsAndSpaces, html_entity_decode);
			getParam(r[0], result, 'forecast', /id="eventForecast_.*?">(.*?)</i, replaceTagsAndSpaces, html_entity_decode);
			result.date=item_date.toDateString();

			break;
		}

	}else{//ForexFactory
		var regexp1 = /<tr.*?data-eventid="(.*?)">\s*<td class="date">(.*?)<\/td>\s*<td class="time">(.*?)<\/td>\s*<td class="currency">(.*?)<\/td>\s*<td class="impact">(.*?)<\/td>\s*<td class="event">(.*?)<\/td>.*?<td class="actual">([\s\S]*?)<\/td>\s*<td class="forecast">(.*?)<\/td>[\s\S]*?<\/tr>/g;
		while((r = regexp1.exec(html)) != null) {
			if(r[2].length>0){
				date=replaceAll(r[2],replaceTagsAndSpaces);
				date=date.replace(/(.*?)(\d+)/,"$2 $1");
				date=date+" "+(new Date().getFullYear());
				date=parseDateWord(date);
				item_date=new Date(date);
			}
			mark=getParam(r[5], null, null, /class="(.*?)"/i, null, null);
			if(mark != "high")continue;

			currency=replaceAll(r[4],replaceTagsAndSpaces);
			if(prefs.currency!="Any" && currency!=prefs.currency)continue;

			var time=replaceAll(r[3],replaceTagsAndSpaces);

			if(!time.match(/\d+:\d+/))time="";
			date=(item_date.getMonth()+1)+"/"+item_date.getDate()+"/"+item_date.getFullYear()+" "+time;

			item_date = new Date(date);

			if(item_date<current_date)continue;

			result.__tariff=currency;
//			result.mark=mark;
			result.description=replaceAll(r[6],replaceTagsAndSpaces);
			result.actual=replaceAll(r[7],replaceTagsAndSpaces);
			result.forecast=replaceAll(r[8],replaceTagsAndSpaces);
			result.date=item_date.toDateString();
			result.time=replaceAll(r[3],replaceTagsAndSpaces);

			break;
		}
	}
	
	AnyBalance.setResult(result);
}