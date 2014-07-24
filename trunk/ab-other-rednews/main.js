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
	'Cookie': 'ffdstonoff=1; fftimezoneoffset=0; fftimeformat=1; ffverifytimes=1; fflastactivity=0;',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl,timezone;
	var currency,language,f_currency;
	var current_date=new Date();
	var item_date=new Date();
	var locale_date=new Date();
	var day_date=new Date();
	var res_date;
	var html;

	AnyBalance.setDefaultCharset('utf-8');

	var result = {success: true};

	result.__tariff=prefs.currency;
//	result.mark="high";
	result.description="<No red news this week>";
	result.actual="-";
	result.forecast="-";
	result.date="-";
	result.time="-";


//ForexFactory
	if(prefs.source==1 || prefs.source==null || prefs.source==""){
		AnyBalance.trace("Request to ForexFactory.com...");
		baseurl = 'http://www.forexfactory.com/';

		currency=prefs.currency || "Any";

		timezone=(prefs.select_timezone_ff==2)?prefs.timezone_ff:current_date.getTimezoneOffset();

		html = AnyBalance.requestGet(baseurl + 'calendar.php', g_headers);

		var regexp1 = /<tr.*?data-eventid="(.*?)">\s*<td class="date">(.*?)<\/td>\s*<td class="time">(.*?)<\/td>\s*<td class="currency">(.*?)<\/td>\s*<td class="impact">(.*?)<\/td>\s*<td class="event">(.*?)<\/td>.*?<td class="actual">([\s\S]*?)<\/td>\s*<td class="forecast">(.*?)<\/td>[\s\S]*?<\/tr>/g;
		while((r = regexp1.exec(html)) != null) {
			if(r[2].length>0){
				date=replaceAll(r[2],replaceTagsAndSpaces);
				date=date.replace(/(.*?)(\d+)/,"$2 $1");
				date=date+" "+(new Date().getFullYear());
				date=parseDateWord(date);
				day_date=new Date(date);
			}
			mark=getParam(r[5], null, null, /class="(.*?)"/i, null, null);
			if(mark != "high")continue;

			f_currency=replaceAll(r[4],replaceTagsAndSpaces);
			if(currency!="Any" && f_currency!=currency)continue;

			var time=replaceAll(r[3],replaceTagsAndSpaces);

			if(!time.match(/\d+:\d+/))time="";
			date=(day_date.getMonth()+1)+"/"+day_date.getDate()+"/"+day_date.getFullYear()+" "+time;

			item_date = new Date(date);
			item_date.setTime(item_date.getTime()-timezone*60*1000);

			if(item_date<current_date)continue;

			res_date=item_date;

			result.__tariff=f_currency+" (ff)";
			result.description=replaceAll(r[6],replaceTagsAndSpaces);
			result.actual=replaceAll(r[7],replaceTagsAndSpaces);
			result.forecast=replaceAll(r[8],replaceTagsAndSpaces);
			result.date=item_date.toDateString();
			result.time=item_date.toLocaleTimeString();

			break;
		}
	}

//Investing.com
	if(prefs.source==2 || prefs.source==null || prefs.source==""){//Investing.com
		AnyBalance.trace("Request to Investing.com...");

		timezone=(prefs.select_timezone_in==2)?prefs.timezone_in:current_date.getTimezoneOffset();

		currency=prefs.in_currency || "Any";
		language=prefs.in_language || 1;
		baseurl = 'http://ec.forexprostools.com/';

		if(currency=="Any")currency="25,6,12,37,24,72,4,39,35,11,7,43,60,56,9,36,5,110";

		html = AnyBalance.requestGet(baseurl + '?columns=exc_currency,exc_importance,exc_actual,exc_forecast&category=_employment,_economicActivity,_inflation,_credit,_centralBanks,_confidenceIndex,_balance,_Bonds&importance=3&features=&countries='+currency+'&calType=week&timeZone=55&lang='+language, g_headers);

		if(/catch(err)/i.test(html)) {
			throw new AnyBalance.Error('Incorrect request to Investing.com.');
		}

		var regexp1 = /<tr id="eventRowId.*?event_timestamp="(.*?)"[\s\S]*?\/tr>/g;
		while((r = regexp1.exec(html)) != null) {
			item_date=new Date(r[1]);
			item_date.setTime(item_date.getTime()-timezone*60*1000);

			if(item_date<current_date)continue;
			if(res_date!=null && res_date<item_date)break;
			res_date=item_date;

			result.__tariff=getParam(r[0], null, null, /<td class="flagCur">(.*?)</i, replaceTagsAndSpaces, html_entity_decode)+" (in)";
			result.time=item_date.toLocaleTimeString();
			getParam(r[0], result, 'description', /<td class="left event">(.*?)</i, replaceTagsAndSpaces, html_entity_decode);
			getParam(r[0], result, 'actual', /id="eventActual_.*?">(.*?)</i, replaceTagsAndSpaces, html_entity_decode);
			getParam(r[0], result, 'forecast', /id="eventForecast_.*?">(.*?)</i, replaceTagsAndSpaces, html_entity_decode);
			result.date=item_date.toDateString();

			break;
		}
	}

//Dailyfx.com
	if(prefs.source==3 || prefs.source==null || prefs.source==""){//Dailyfx.com
		AnyBalance.trace("Request to Dailyfx.com...");

		timezone=(prefs.select_timezone_dx==2)?prefs.timezone_dx:current_date.getTimezoneOffset();

		currency=prefs.dx_currency || "Any";
		baseurl = 'http://www.dailyfx.com/';

		current_date=new Date();
		current_date.setTime(current_date.getTime()+timezone*60*1000);
		current_date.setDate(current_date.getDate()-current_date.getDay());

		html = AnyBalance.requestGet(baseurl + "files/Calendar-"+("0"+String(current_date.getMonth()+1)).substr(-2,2)+"-"+("0"+String(current_date.getDate())).substr(-2,2)+"-"+current_date.getFullYear()+".csv", g_headers);
		current_date=new Date();

		if(/Page not found/i.test(html)) {
			throw new AnyBalance.Error('Incorrect request to Dailyfx.com.');
		}

		var str=html.split(/\n/);

		for(var i=1;i<str.length;i++){

			r=str[i].split(/,/);

			if(r[5] != "High")continue;

			f_currency=r[3].toUpperCase();
			if(currency!="Any" && f_currency!=currency)continue;


			date=r[0].replace(/(.*?)(\d+)/,"$2 $1");
			date=date+" "+(new Date().getFullYear());
			date=parseDateWord(date);
			day_date=new Date(date);

			date=(day_date.getMonth()+1)+"/"+day_date.getDate()+"/"+day_date.getFullYear()+" "+r[1];

			item_date=new Date(date);
			item_date.setTime(item_date.getTime()-timezone*60*1000);

			if(item_date<current_date)continue;
			if(res_date!=null && res_date<item_date)break;

			result.__tariff=f_currency+" (dx)";
			result.time=item_date.toLocaleTimeString();
			result.description=r[4];
			result.actual=r[6];
			result.forecast=r[7];
			result.date=item_date.toDateString();

			break;
		}
	}


	
	AnyBalance.setResult(result);
}