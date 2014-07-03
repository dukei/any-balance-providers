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
	var baseurl = 'http://www.forexfactory.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
//	checkEmpty(prefs.login, 'Введите логин!');
//	checkEmpty(prefs.password, 'Введите пароль!');
	var current_date=new Date();
	var item_date=new Date();
	
	var html = AnyBalance.requestGet(baseurl + 'calendar.php', g_headers);
	
	var result = {success: true};

	result.__tariff=prefs.currency;
//	result.mark="high";
	result.description="<No red news this week>";
	result.actual="-";
	result.forecast="-";
	result.date="-";
	result.time="-";


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
//		result.mark=mark;
		result.description=replaceAll(r[6],replaceTagsAndSpaces);
		result.actual=replaceAll(r[7],replaceTagsAndSpaces);
		result.forecast=replaceAll(r[8],replaceTagsAndSpaces);
		result.date=item_date.toDateString();
		result.time=replaceAll(r[3],replaceTagsAndSpaces);

		break;

	}
	
	AnyBalance.setResult(result);
}